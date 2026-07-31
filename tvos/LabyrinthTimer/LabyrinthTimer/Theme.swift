import SwiftUI

/// The gym's palette, lifted straight from the website's design tokens so the
/// mats, the site and the TV all read as one brand.
enum Palette {
    static let ink = Color(hex: 0x0A0A0A)
    static let surface = Color(hex: 0x141414)
    static let surfaceLift = Color(hex: 0x1A1A1A)
    static let bone = Color(hex: 0xF0F0F0)
    static let muted = Color(hex: 0x8A8A8A)
    static let faint = Color(hex: 0x555555)
    static let gold = Color(hex: 0xC8A24C)
    static let goldLight = Color(hex: 0xE8C96B)
    static let red = Color(hex: 0xE74C3C)
    static let green = Color(hex: 0x27AE60)
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}

extension Font {
    /// The clock face. Rounded and black-weight so it stays legible from the
    /// far end of the mat, monospaced so the digits never jitter.
    static func clock(_ size: CGFloat) -> Font {
        .system(size: size, weight: .black, design: .rounded).monospacedDigit()
    }

    /// Small letterspaced label type — the site uses the same treatment for
    /// its section labels.
    static func label(_ size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
}

extension View {
    /// Uppercase, widely tracked, quiet. Used for every caption on the screen.
    func captionStyle(_ size: CGFloat, tracking: CGFloat = 4, color: Color = Palette.muted, weight: Font.Weight = .semibold) -> some View {
        self.font(.label(size, weight: weight))
            .tracking(tracking)
            .textCase(.uppercase)
            .foregroundStyle(color)
    }
}
