import SwiftUI

/// The whole app: one screen, no navigation. The clock sits dead centre of the
/// TV; everything you can touch is in the strip along the bottom.
struct TimerScreen: View {

    @StateObject private var timer = RoundTimer()
    @FocusState private var focus: Field?

    enum Field: Hashable {
        case playPause, reset
        case round, warning, rest, rounds

        var isCard: Bool {
            switch self {
            case .round, .warning, .rest, .rounds: return true
            case .playPause, .reset: return false
            }
        }
    }

    /// Everything focusable, in the order it appears along the bottom. Left and
    /// right walk this list; up and down change whatever card is focused.
    private static let strip: [Field] = [.playPause, .reset, .round, .warning, .rest, .rounds]

    var body: some View {
        ZStack {
            Backdrop(accent: accent, intensity: timer.running ? 1 : 0.55)

            // Centred in the ZStack rather than laid out between the header and
            // the strip, so the clock is genuinely in the middle of the screen.
            face

            VStack(spacing: 0) {
                header
                Spacer(minLength: 0)
                controlStrip
            }
            .padding(.horizontal, 48)
            .padding(.vertical, 10)
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
        VStack(spacing: 20) {
            RoundBadge(round: timer.round, total: timer.roundCount, accent: accent)

            Text(Clockface.time(timer.displaySeconds))
                .font(.clock(260))
                .foregroundStyle(faceColour)
                .lineLimit(1)
                .minimumScaleFactor(0.4)
                .shadow(color: faceColour.opacity(timer.running ? 0.24 : 0.1), radius: 46)
                .contentTransition(.numericText(countsDown: true))
                .scaleEffect(pulse ? 1.028 : 1)
                .animation(.spring(response: 0.28, dampingFraction: 0.55), value: timer.displaySeconds)

            ProgressTrack(progress: timer.progress, accent: accent)

            Text(status)
                .captionStyle(24, tracking: 8, color: statusColour, weight: .bold)
                .animation(.easeInOut(duration: 0.25), value: status)
        }
        .frame(width: 1_180)
    }

    /// The face grows a hair on each tick once the round is nearly up.
    private var pulse: Bool {
        (timer.isWarning || timer.phase == .rest) && timer.running && timer.displaySeconds % 2 == 0
    }

    // MARK: The control strip

    private var controlStrip: some View {
        HStack(alignment: .center, spacing: 56) {
            HStack(spacing: 44) {
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

            HStack(spacing: 20) {
                card(.round,
                     title: "Round",
                     value: Clockface.compact(timer.roundLength),
                     tint: Palette.green,
                     atFloor: timer.roundLength <= RoundTimer.roundRange.lowerBound,
                     atCeiling: timer.roundLength >= RoundTimer.roundRange.upperBound)

                card(.warning,
                     title: "Warning",
                     value: Clockface.compact(timer.warningLength),
                     tint: Palette.yellow,
                     atFloor: timer.warningLength <= RoundTimer.warningRange.lowerBound,
                     atCeiling: timer.warningLength >= RoundTimer.warningRange.upperBound)

                card(.rest,
                     title: "Rest",
                     value: Clockface.compact(timer.restLength),
                     tint: Palette.red,
                     atFloor: timer.restLength <= RoundTimer.restRange.lowerBound,
                     atCeiling: timer.restLength >= RoundTimer.restRange.upperBound)

                card(.rounds,
                     title: "Rounds",
                     value: timer.isUnlimited ? "∞" : "\(timer.roundCount)",
                     tint: Palette.gold,
                     atFloor: timer.roundCount <= RoundTimer.roundCountRange.lowerBound,
                     atCeiling: timer.roundCount >= RoundTimer.roundCountRange.upperBound)
            }
        }
    }

    private func card(_ field: Field, title: String, value: String, tint: Color, atFloor: Bool, atCeiling: Bool) -> some View {
        SettingCard(
            title: title,
            value: value,
            tint: tint,
            isFocused: focus == field,
            atFloor: atFloor,
            atCeiling: atCeiling
        )
        .focusable(true)
        .focused($focus, equals: field)
        .onMoveCommand { move($0, from: field) }
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

    /// Focus is driven by hand rather than left to the focus engine: up and
    /// down are spent changing values, so left and right do all the travelling.
    private func move(_ direction: MoveCommandDirection, from origin: Field) {
        switch direction {
        case .left:
            focus = neighbour(of: origin, by: -1) ?? origin
        case .right:
            focus = neighbour(of: origin, by: 1) ?? origin
        case .up:
            if origin.isCard { adjust(origin, by: 1) }
        case .down:
            if origin.isCard { adjust(origin, by: -1) }
        @unknown default:
            break
        }
    }

    private func neighbour(of field: Field, by offset: Int) -> Field? {
        guard let index = Self.strip.firstIndex(of: field) else { return nil }
        let target = index + offset
        return Self.strip.indices.contains(target) ? Self.strip[target] : nil
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
        case .playPause, .reset:
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
