import SwiftUI

// MARK: - Brand lockup

/// Kanji block and wordmark, top left, exactly as they sit on the gym's wall.
struct Lockup: View {
    var body: some View {
        HStack(spacing: 24) {
            Image("KanjiMark")
                .resizable()
                .renderingMode(.template)
                .scaledToFit()
                .foregroundStyle(Palette.bone)
                .frame(height: 88)

            Image("Wordmark")
                .resizable()
                .renderingMode(.template)
                .scaledToFit()
                .foregroundStyle(Palette.gold)
                .frame(height: 56)
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

/// "ROUND 3" in a gold-ruled plate. The count only appears when the session has
/// a fixed length — an unlimited session just keeps counting up.
struct RoundBadge: View {
    var round: Int
    var total: Int
    var accent: Color

    var body: some View {
        HStack(spacing: 18) {
            Text("Round")
                .captionStyle(24, tracking: 6, color: Palette.muted, weight: .bold)

            Text("\(round)")
                .font(.system(size: 46, weight: .black, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(accent)

            if total > 0 {
                Text("of \(total)")
                    .captionStyle(24, tracking: 4, color: Palette.faint, weight: .bold)
            }
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

/// A capsule that drains as the phase runs out.
struct ProgressTrack: View {
    var progress: Double
    var accent: Color

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.white.opacity(0.07))
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [accent.opacity(0.75), accent],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: max(0, geo.size.width * (1 - progress)))
                    .shadow(color: accent.opacity(0.5), radius: 18, y: 0)
            }
        }
        .frame(height: 14)
    }
}

// MARK: - Setting card

/// One adjustable value in the strip along the bottom. Each carries its own
/// colour — green for the round, yellow for the warning, red for the rest — so
/// a coach can find the one they want without reading the labels.
///
/// The strip runs left to right, so left/right walks it and up/down changes the
/// focused value. The stacked chevrons say so.
struct SettingCard: View {
    var title: String
    var value: String
    var tint: Color
    var isFocused: Bool
    var atFloor: Bool
    var atCeiling: Bool

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 0) {
                Text(title)
                    .captionStyle(21, tracking: 5, color: tint, weight: .bold)
                Text(value)
                    .font(.system(size: 58, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.bone)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            }

            Spacer(minLength: 8)

            VStack(spacing: 0) {
                chevron("chevron.up", dimmed: atCeiling)
                chevron("chevron.down", dimmed: atFloor)
            }
        }
        .padding(.horizontal, 26)
        .padding(.vertical, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(tint.opacity(isFocused ? 0.26 : 0.12))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(tint.opacity(isFocused ? 1 : 0.42), lineWidth: isFocused ? 3.5 : 1.5)
        )
        .shadow(color: tint.opacity(isFocused ? 0.4 : 0), radius: 28, y: 12)
        .scaleEffect(isFocused ? 1.05 : 1)
        .animation(.spring(response: 0.32, dampingFraction: 0.75), value: isFocused)
    }

    private func chevron(_ symbol: String, dimmed: Bool) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 26, weight: .black))
            .foregroundStyle(tint.opacity(dimmed ? 0.18 : 1))
            .opacity(isFocused ? 1 : 0)
            .frame(width: 26, height: 30)
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
