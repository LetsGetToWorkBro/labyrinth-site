import SwiftUI

/// The whole app: one screen, no navigation. Focus a card on the right rail and
/// press left/right to change it; everything else is the transport row.
struct TimerScreen: View {

    @StateObject private var timer = RoundTimer()
    @FocusState private var focus: Field?

    enum Field: Hashable {
        case round, warning, rest, rounds
        case playPause, reset

        var isCard: Bool {
            switch self {
            case .round, .warning, .rest, .rounds: return true
            default: return false
            }
        }
    }

    private static let cards: [Field] = [.round, .warning, .rest, .rounds]
    private static let transport: [Field] = [.playPause, .reset]

    /// Width of the right rail. The clock face takes whatever is left, and the
    /// transport row below lines up with it.
    private static let railWidth: CGFloat = 520

    var body: some View {
        ZStack {
            Backdrop(accent: accent, intensity: timer.running ? 1 : 0.55)

            VStack(spacing: 0) {
                header
                Spacer(minLength: 24)
                HStack(alignment: .center, spacing: 72) {
                    face
                    rail.frame(width: Self.railWidth)
                }
                Spacer(minLength: 24)
                footer
            }
            .padding(.horizontal, 48)
            .padding(.top, 12)
            .padding(.bottom, 8)
        }
        .defaultFocus($focus, .playPause)
        .onPlayPauseCommand { timer.toggle() }
        .onAppear { Cues.shared.prepare() }
    }

    // MARK: Header

    private var header: some View {
        HStack(alignment: .top) {
            Lockup()
            Spacer()
            WallClock()
        }
    }

    // MARK: The clock face

    private var face: some View {
        VStack(spacing: 30) {
            RoundBadge(round: timer.round, total: timer.roundCount, accent: accent)

            Text(Clockface.time(timer.displaySeconds))
                .font(.clock(300))
                .foregroundStyle(faceColour)
                .lineLimit(1)
                .minimumScaleFactor(0.4)
                .shadow(color: faceColour.opacity(timer.running ? 0.35 : 0.12), radius: 60)
                .contentTransition(.numericText(countsDown: true))
                .scaleEffect(pulse ? 1.028 : 1)
                .animation(.spring(response: 0.28, dampingFraction: 0.55), value: timer.displaySeconds)

            ProgressTrack(progress: timer.progress, accent: accent)

            Text(status)
                .captionStyle(24, tracking: 8, color: statusColour, weight: .bold)
                .animation(.easeInOut(duration: 0.25), value: status)
        }
        .frame(maxWidth: .infinity)
    }

    /// The face grows a hair on each tick once the round is nearly up.
    private var pulse: Bool {
        (timer.isWarning || timer.phase == .rest) && timer.running && timer.displaySeconds % 2 == 0
    }

    // MARK: The right rail

    private var rail: some View {
        VStack(spacing: 22) {
            card(.round,
                 title: "Round",
                 value: Clockface.compact(timer.roundLength),
                 atFloor: timer.roundLength <= RoundTimer.roundRange.lowerBound,
                 atCeiling: timer.roundLength >= RoundTimer.roundRange.upperBound)

            card(.warning,
                 title: "Warning",
                 value: Clockface.compact(timer.warningLength),
                 atFloor: timer.warningLength <= RoundTimer.warningRange.lowerBound,
                 atCeiling: timer.warningLength >= RoundTimer.warningRange.upperBound)

            card(.rest,
                 title: "Rest",
                 value: Clockface.compact(timer.restLength),
                 atFloor: timer.restLength <= RoundTimer.restRange.lowerBound,
                 atCeiling: timer.restLength >= RoundTimer.restRange.upperBound)

            card(.rounds,
                 title: "Rounds",
                 value: timer.isUnlimited ? "∞" : "\(timer.roundCount)",
                 atFloor: timer.roundCount <= RoundTimer.roundCountRange.lowerBound,
                 atCeiling: timer.roundCount >= RoundTimer.roundCountRange.upperBound)
        }
        .focusSection()
    }

    private func card(_ field: Field, title: String, value: String, atFloor: Bool, atCeiling: Bool) -> some View {
        SettingCard(
            title: title,
            value: value,
            accent: Palette.gold,
            isFocused: focus == field,
            atFloor: atFloor,
            atCeiling: atCeiling
        )
        .focusable(true)
        .focused($focus, equals: field)
        .onMoveCommand { move($0, from: field) }
    }

    // MARK: Transport

    /// Two controls, the same size, evenly spaced and sitting on the clock's
    /// own centre line. The hint keeps to the rail's column on the right.
    private var footer: some View {
        HStack(alignment: .bottom, spacing: 72) {
            HStack(alignment: .top, spacing: 96) {
                transportButton(.playPause,
                                symbol: timer.running ? "pause.fill" : "play.fill",
                                caption: timer.running ? "Pause" : "Start",
                                primary: true) {
                    timer.toggle()
                }
                transportButton(.reset, symbol: "arrow.counterclockwise", caption: "Reset") {
                    timer.reset()
                }
            }
            .focusSection()
            .frame(maxWidth: .infinity)

            VStack(alignment: .trailing, spacing: 10) {
                Text("◀ ▶  adjust      ▲ ▼  move")
                    .captionStyle(18, tracking: 3, color: Palette.faint, weight: .semibold)
                Text("play/pause on the remote works anywhere")
                    .captionStyle(16, tracking: 2, color: Palette.faint.opacity(0.7), weight: .medium)
            }
            .frame(width: Self.railWidth, alignment: .trailing)
            .padding(.bottom, 40)
        }
    }

    private func transportButton(
        _ field: Field,
        symbol: String,
        caption: String,
        primary: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            TransportButton(
                symbol: symbol,
                caption: caption,
                accent: primary ? accent : Palette.gold,
                isFocused: focus == field,
                primary: primary
            )
        }
        .buttonStyle(.plain)
        .focused($focus, equals: field)
        .onMoveCommand { move($0, from: field) }
    }

    // MARK: Remote handling

    /// Focus is driven by hand rather than left to the focus engine: on the
    /// rail, left and right are spent changing the value, so up and down have
    /// to do all the travelling.
    private func move(_ direction: MoveCommandDirection, from origin: Field) {
        if origin.isCard {
            switch direction {
            case .left: adjust(origin, by: -1)
            case .right: adjust(origin, by: 1)
            case .up: focus = neighbour(of: origin, in: Self.cards, by: -1) ?? origin
            case .down: focus = neighbour(of: origin, in: Self.cards, by: 1) ?? .playPause
            @unknown default: break
            }
        } else {
            switch direction {
            case .left: focus = neighbour(of: origin, in: Self.transport, by: -1) ?? origin
            case .right: focus = neighbour(of: origin, in: Self.transport, by: 1) ?? origin
            case .up: focus = .rounds
            case .down: break
            @unknown default: break
            }
        }
    }

    private func neighbour(of field: Field, in list: [Field], by offset: Int) -> Field? {
        guard let index = list.firstIndex(of: field) else { return nil }
        let target = index + offset
        return list.indices.contains(target) ? list[target] : nil
    }

    private func adjust(_ field: Field, by direction: Int) {
        switch field {
        case .round:
            let step = RoundTimer.roundStep(from: timer.roundLength, going: direction)
            timer.roundLength = stepped(timer.roundLength, direction * step, RoundTimer.roundRange)
        case .warning:
            timer.warningLength = stepped(timer.warningLength, direction * RoundTimer.warningStep, RoundTimer.warningRange)
        case .rest:
            timer.restLength = stepped(timer.restLength, direction * RoundTimer.restStep, RoundTimer.restRange)
        case .rounds:
            timer.roundCount = stepped(timer.roundCount, direction, RoundTimer.roundCountRange)
        default:
            return
        }
        Cues.shared.play(.click)
    }

    private func stepped(_ value: Int, _ delta: Int, _ range: ClosedRange<Int>) -> Int {
        min(max(value + delta, range.lowerBound), range.upperBound)
    }

    // MARK: Phase dressing

    private var accent: Color {
        switch timer.phase {
        case .ready: return Palette.gold
        case .work: return timer.isWarning ? Palette.goldLight : Palette.gold
        case .rest: return Palette.red
        case .finished: return Palette.green
        }
    }

    private var faceColour: Color {
        switch timer.phase {
        case .ready: return Palette.gold
        case .work: return timer.isWarning ? Palette.goldLight : Palette.bone
        case .rest: return Palette.red
        case .finished: return Palette.green
        }
    }

    private var statusColour: Color {
        timer.running ? accent : Palette.muted
    }

    private var status: String {
        if !timer.running {
            switch timer.phase {
            case .ready: return "Ready — press start"
            case .finished: return "Session complete"
            case .work, .rest: return "Paused"
            }
        }
        switch timer.phase {
        case .rest: return "Rest"
        case .work: return timer.isWarning ? "Final \(timer.displaySeconds) seconds" : "Round in progress"
        case .ready, .finished: return ""
        }
    }
}

#Preview {
    TimerScreen()
}
