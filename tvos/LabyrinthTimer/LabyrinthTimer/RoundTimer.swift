import Combine
import Foundation

/// The whole timer: a round, an optional warning inside that round, and an
/// optional rest between rounds. It runs until someone stops it — nobody on the
/// mat wants to tell a timer how many rounds they are about to do.
@MainActor
final class RoundTimer: ObservableObject {

    enum Phase {
        case ready      // parked at the top of round 1
        case work       // the round is running
        case rest       // between rounds
    }

    // MARK: Settings

    /// Length of a round, in seconds.
    @Published var roundLength: Int = Defaults.round {
        didSet { settingChanged(oldValue, roundLength, key: Keys.round, appliesTo: .work) }
    }

    /// How much time is left in a round when the warning fires. 0 turns it off.
    @Published var warningLength: Int = Defaults.warning {
        didSet { store.set(warningLength, forKey: Keys.warning) }
    }

    /// Rest between rounds. 0 runs the rounds back to back.
    @Published var restLength: Int = Defaults.rest {
        didSet { settingChanged(oldValue, restLength, key: Keys.rest, appliesTo: .rest) }
    }

    // MARK: Live state

    @Published private(set) var phase: Phase = .ready
    @Published private(set) var round: Int = 1
    @Published private(set) var remaining: TimeInterval = TimeInterval(Defaults.round)
    @Published private(set) var running = false

    private var deadline: Date?
    private var ticker: Timer?
    /// The last whole second we fired a cue for, so a 30 Hz tick doesn't fire
    /// the same clapper thirty times.
    private var lastCuedSecond: Int = .max
    private let store = UserDefaults.standard
    private let cues: Cues

    // MARK: Steps and limits — what a press of the remote is worth

    static let roundRange = 30...1800
    static let warningRange = 0...180, warningStep = 5
    static let restRange = 0...600, restStep = 15

    /// Fine steps at the short end where fifteen seconds is a real
    /// difference, coarse once the rounds get long — otherwise dialling in a
    /// ten-minute round is forty presses of the remote.
    static func roundStep(from value: Int, going direction: Int) -> Int {
        let coarseAbove = 300
        return (direction > 0 ? value >= coarseAbove : value > coarseAbove) ? 60 : 15
    }

    private enum Defaults {
        static let round = 300, warning = 10, rest = 60
    }

    private enum Keys {
        static let round = "roundLength", warning = "warningLength", rest = "restLength"
    }

    init(cues: Cues = .shared) {
        self.cues = cues
        if store.object(forKey: Keys.round) != nil {
            roundLength = clamp(store.integer(forKey: Keys.round), Self.roundRange)
            warningLength = clamp(store.integer(forKey: Keys.warning), Self.warningRange)
            restLength = clamp(store.integer(forKey: Keys.rest), Self.restRange)
        }
        remaining = TimeInterval(roundLength)
    }

    // MARK: Derived

    /// The length of whatever is on the clock right now.
    var phaseLength: Int {
        phase == .rest ? restLength : roundLength
    }

    /// 0 at the start of the phase, 1 when it runs out. Drives the bar.
    var progress: Double {
        let total = Double(max(phaseLength, 1))
        return min(max(1 - remaining / total, 0), 1)
    }

    /// True once the round is inside its warning window.
    var isWarning: Bool {
        phase == .work && warningLength > 0 && remaining <= TimeInterval(warningLength) + 0.001
    }

    /// Seconds shown on the face. Rounded up so a fresh 5:00 round reads 5:00,
    /// not 4:59.
    var displaySeconds: Int { max(0, Int(remaining.rounded(.up))) }

    // MARK: Transport

    func toggle() {
        running ? pause() : start()
    }

    func start() {
        switch phase {
        case .ready:
            begin(phase: .work, seconds: roundLength, cue: .bell)
        case .work, .rest:
            resume()
        }
    }

    func pause() {
        guard running else { return }
        remaining = max(0, deadline?.timeIntervalSinceNow ?? remaining)
        deadline = nil
        running = false
        stopTicker()
    }

    /// Zeroes everything: back to the top of round 1, stopped, with the full
    /// round on the face. Press play and the session starts over.
    func reset() {
        running = false
        deadline = nil
        stopTicker()
        phase = .ready
        round = 1
        remaining = TimeInterval(roundLength)
        lastCuedSecond = .max
        cues.play(.select)
    }

    // MARK: Engine

    private func resume() {
        guard !running else { return }
        deadline = Date().addingTimeInterval(remaining)
        running = true
        lastCuedSecond = .max
        startTicker()
    }

    private func begin(phase newPhase: Phase, seconds: Int, cue: Cues.Cue?) {
        phase = newPhase
        remaining = TimeInterval(seconds)
        deadline = Date().addingTimeInterval(remaining)
        running = true
        lastCuedSecond = .max
        if let cue { cues.play(cue) }
        startTicker()
    }

    private func startTicker() {
        stopTicker()
        // 30 Hz: smooth enough for the depleting bar, cheap enough to leave
        // running on a gym TV all evening.
        let timer = Timer(timeInterval: 1.0 / 30.0, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        // .common so the bar keeps moving while the focus engine is animating.
        RunLoop.main.add(timer, forMode: .common)
        ticker = timer
    }

    private func stopTicker() {
        ticker?.invalidate()
        ticker = nil
    }

    private func tick() {
        guard running, let deadline else { return }
        let left = deadline.timeIntervalSinceNow
        remaining = max(0, left)

        if left <= 0 {
            advance()
            return
        }

        // The clapper is keyed off the whole second so it fires exactly once.
        let second = Int(left.rounded(.up))
        guard second != lastCuedSecond else { return }
        let previous = lastCuedSecond
        lastCuedSecond = second

        if phase == .work, warningLength > 0, second == warningLength, previous > second {
            cues.play(.clap)
        }
    }

    /// The clock hit zero — the bell rings either way, and the only question is
    /// whether there's a rest in between.
    private func advance() {
        lastCuedSecond = .max
        switch phase {
        case .work:
            if restLength > 0 {
                begin(phase: .rest, seconds: restLength, cue: .bell)
            } else {
                round += 1
                begin(phase: .work, seconds: roundLength, cue: .bell)
            }
        case .rest:
            round += 1
            begin(phase: .work, seconds: roundLength, cue: .bell)
        case .ready:
            pause()
        }
    }

    // MARK: Settings plumbing

    /// A length changed. If the clock is parked, show it immediately; if it is
    /// running, let the current round finish on the old length and pick the new
    /// one up next time round.
    private func settingChanged(_ old: Int, _ new: Int, key: String, appliesTo target: Phase) {
        store.set(new, forKey: key)
        guard old != new else { return }
        if !running && phase == .ready && target == .work {
            remaining = TimeInterval(new)
        }
    }
}

private func clamp(_ value: Int, _ range: ClosedRange<Int>) -> Int {
    min(max(value, range.lowerBound), range.upperBound)
}
