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

/// Time of day and the date, so the screen is still useful between sessions.
struct WallClock: View {
    var body: some View {
        TimelineView(.everyMinute) { context in
            VStack(alignment: .trailing, spacing: 6) {
                Text(context.date, format: .dateTime.hour().minute())
                    .font(.system(size: 54, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.bone)
                Text(context.date, format: .dateTime.weekday(.wide).day().month(.abbreviated))
                    .captionStyle(20, tracking: 3)
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

/// One adjustable value on the right rail. Focus it and press left or right on
/// the remote to change it — there is no settings screen to get lost in.
///
/// Label left, value right, on one line: the numbers are what a coach reads
/// from across the mat, so they get the room.
struct SettingCard: View {
    var title: String
    var value: String
    var accent: Color
    var isFocused: Bool
    var atFloor: Bool
    var atCeiling: Bool

    var body: some View {
        HStack(spacing: 14) {
            chevron("chevron.left", dimmed: atFloor)

            Text(title)
                .captionStyle(22, tracking: 5, color: isFocused ? accent : Palette.muted, weight: .bold)

            Spacer(minLength: 12)

            Text(value)
                .font(.system(size: 60, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(isFocused ? Palette.bone : Palette.bone.opacity(0.92))
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            chevron("chevron.right", dimmed: atCeiling)
        }
        .padding(.horizontal, 28)
        .padding(.vertical, 18)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(isFocused ? Palette.surfaceLift : Palette.surface.opacity(0.9))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(isFocused ? accent : Color.white.opacity(0.12), lineWidth: isFocused ? 3 : 1)
        )
        .shadow(color: .black.opacity(isFocused ? 0.55 : 0), radius: 28, y: 12)
        .scaleEffect(isFocused ? 1.04 : 1)
        .animation(.spring(response: 0.32, dampingFraction: 0.75), value: isFocused)
    }

    private func chevron(_ symbol: String, dimmed: Bool) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 30, weight: .black))
            .foregroundStyle(accent.opacity(dimmed ? 0.15 : 0.9))
            .opacity(isFocused ? 1 : 0)
            .frame(width: 30)
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

    private let diameter: CGFloat = 168

    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(isFocused ? accent : (primary ? accent.opacity(0.18) : Palette.surface.opacity(0.85)))
                Circle()
                    .stroke(isFocused ? .clear : accent.opacity(primary ? 0.75 : 0.3), lineWidth: 2.5)
                Image(systemName: symbol)
                    .font(.system(size: 74, weight: .black))
                    .foregroundStyle(isFocused ? Palette.ink : Palette.bone)
            }
            .frame(width: diameter, height: diameter)
            .shadow(color: accent.opacity(isFocused ? 0.6 : 0), radius: 34, y: 12)

            Text(caption)
                .captionStyle(20, tracking: 4, color: isFocused ? accent : Palette.muted, weight: .bold)
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
