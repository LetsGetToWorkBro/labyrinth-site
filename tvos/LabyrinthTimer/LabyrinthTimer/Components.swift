import SwiftUI

// MARK: - Brand lockup

/// Kanji block and wordmark, top left, exactly as they sit on the gym's wall.
struct Lockup: View {
    var body: some View {
        HStack(spacing: 28) {
            Image("KanjiMark")
                .resizable()
                .renderingMode(.template)
                .scaledToFit()
                .foregroundStyle(Palette.bone)
                .frame(height: 130)

            Image("Wordmark")
                .resizable()
                .renderingMode(.template)
                .scaledToFit()
                .foregroundStyle(Palette.gold)
                .frame(height: 84)
        }
    }
}

// MARK: - Wall clock

/// Time of day and the date, so the screen is still useful between sessions —
/// and big enough to be the wall clock the gym actually reads.
struct WallClock: View {
    var body: some View {
        TimelineView(.everyMinute) { context in
            VStack(alignment: .trailing, spacing: 4) {
                Text(context.date, format: .dateTime.hour().minute())
                    .font(.system(size: 86, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.bone)
                Text(context.date, format: .dateTime.weekday(.wide).day().month(.abbreviated))
                    .captionStyle(28, tracking: 4, color: Palette.muted, weight: .bold)
            }
        }
    }
}

// MARK: - Round badge

/// "ROUND 3" in a gold-ruled plate. It just keeps counting up — the session
/// ends when somebody decides it has.
///
/// No status text alongside it: the bar under the clock says what the timer is
/// doing, and saying it twice on a wall screen is noise.
struct RoundBadge: View {
    var round: Int
    var accent: Color

    var body: some View {
        HStack(spacing: 22) {
            Text("Round")
                .captionStyle(24, tracking: 6, color: Palette.muted, weight: .bold)

            Text("\(round)")
                .font(.system(size: 46, weight: .black, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(accent)
        }
        .padding(.horizontal, 34)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Palette.surface.opacity(0.85))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(accent.opacity(0.45), lineWidth: 1.5)
        )
    }
}

// MARK: - Progress track

/// The bar under the clock, and the only thing on screen that says what the
/// timer is doing. It carries the state four ways at once:
///
/// - **Colour** follows the phase — gold in a round, light gold once the
///   warning is in, red through the rest.
/// - **A bright leading edge** rides the end of the fill while the clock runs,
///   and dims the moment it's paused.
/// - **A notch** sits where the warning will fire, so you can see it coming
///   before it arrives.
/// - **Paused** dims the whole bar and breathes it slowly, so a stopped clock
///   never looks like a dead screen.
struct ProgressTrack: View {
    var progress: Double
    var accent: Color
    var isRunning: Bool
    var isWarning: Bool
    /// Where along the bar the warning fires, 0...1 from the left. Nil hides it.
    var marker: Double?

    @State private var breathe = false

    private let height: CGFloat = 18

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let filled = max(0, width * (1 - progress))
            let cap: CGFloat = isWarning ? 10 : 6

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.07))

                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [accent.opacity(0.65), accent],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: filled)
                    .shadow(color: accent.opacity(isRunning ? 0.55 : 0), radius: 20)

                if filled > cap {
                    Capsule()
                        .fill(Color.white.opacity(isRunning ? 0.9 : 0.25))
                        .frame(width: cap)
                        .offset(x: filled - cap)
                        .shadow(color: accent.opacity(isRunning ? 0.95 : 0), radius: isWarning ? 22 : 14)
                }

                // Drawn last and standing proud of the bar so it reads whether
                // the fill has passed it yet or not.
                if let marker, marker > 0.02, marker < 0.97 {
                    Capsule()
                        .fill(Palette.bone.opacity(0.5))
                        .frame(width: 3, height: height + 12)
                        .offset(x: width * marker - 1.5)
                }
            }
            .frame(height: height)
        }
        .frame(height: height)
        .opacity(isRunning ? 1 : (breathe ? 0.45 : 0.85))
        // Two separately scoped animations rather than one withAnimation around
        // the flag: a repeatForever and a state change fighting over the same
        // property is where SwiftUI gets janky.
        .animation(.easeInOut(duration: 1.7).repeatForever(autoreverses: true), value: breathe)
        .animation(.easeInOut(duration: 0.4), value: isRunning)
        .onAppear { breathe = true }
    }
}

// MARK: - Setting card

/// One adjustable value in the strip along the bottom.
///
/// No label — the colour is the label. Green is the round, yellow the warning,
/// red the rest, which is what a coach glances at from the middle of the mat.
/// That leaves the whole container to the number.
///
/// The strip runs left to right, so left/right walks it and up/down changes the
/// focused value. The chevrons above and below the number say so.
struct SettingCard: View {
    /// Never drawn. Carried so VoiceOver can still name the control.
    var title: String
    var value: String
    var tint: Color
    var isFocused: Bool
    var atFloor: Bool
    var atCeiling: Bool

    var body: some View {
        VStack(spacing: 0) {
            chevron("chevron.up", dimmed: atCeiling)

            Spacer(minLength: 0)

            Text(value)
                .font(.system(size: 104, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(Palette.bone)
                .lineLimit(1)
                .minimumScaleFactor(0.5)

            Spacer(minLength: 0)

            chevron("chevron.down", dimmed: atFloor)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .frame(height: 224)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(tint.opacity(isFocused ? 0.26 : 0.12))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(tint.opacity(isFocused ? 1 : 0.42), lineWidth: isFocused ? 3.5 : 1.5)
        )
        .shadow(color: tint.opacity(isFocused ? 0.4 : 0), radius: 28, y: 12)
        .scaleEffect(isFocused ? 1.04 : 1)
        .animation(.spring(response: 0.32, dampingFraction: 0.75), value: isFocused)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(title)
        .accessibilityValue(value)
    }

    /// Always occupies its space so the number doesn't jump when focus lands.
    private func chevron(_ symbol: String, dimmed: Bool) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 28, weight: .black))
            .foregroundStyle(tint.opacity(dimmed ? 0.18 : 1))
            .opacity(isFocused ? 1 : 0)
            .frame(height: 32)
    }
}

// MARK: - Transport button

/// The two transport controls. Same size as each other so the row reads evenly;
/// the primary one is the filled disc.
struct TransportButton: View {
    var symbol: String
    var caption: String
    var accent: Color
    var isFocused: Bool
    var primary: Bool = false

    private let diameter: CGFloat = 196

    var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(isFocused ? accent : (primary ? accent.opacity(0.18) : Palette.surface.opacity(0.85)))
                Circle()
                    .stroke(isFocused ? .clear : accent.opacity(primary ? 0.75 : 0.3), lineWidth: 3)
                Image(systemName: symbol)
                    .font(.system(size: 86, weight: .black))
                    .foregroundStyle(isFocused ? Palette.ink : Palette.bone)
            }
            .frame(width: diameter, height: diameter)
            .shadow(color: accent.opacity(isFocused ? 0.6 : 0), radius: 38, y: 14)

            Text(caption)
                .captionStyle(22, tracking: 4, color: isFocused ? accent : Palette.muted, weight: .bold)
        }
        .scaleEffect(isFocused ? 1.09 : 1)
        .animation(.spring(response: 0.32, dampingFraction: 0.7), value: isFocused)
    }
}

// MARK: - Formatting

enum Clockface {
    /// mm:ss, always padded, because a face that changes width is a face that
    /// twitches.
    static func time(_ seconds: Int) -> String {
        String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }

    /// The same, but m:ss for the smaller cards where the padding reads clumsy.
    static func compact(_ seconds: Int) -> String {
        seconds == 0 ? "OFF" : String(format: "%d:%02d", seconds / 60, seconds % 60)
    }
}
