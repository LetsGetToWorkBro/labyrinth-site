import SwiftUI

/// The room behind the clock: ink, a slow bloom that takes on the colour of the
/// current phase, and the roundel turning almost imperceptibly behind it all.
struct Backdrop: View {
    var accent: Color
    var intensity: Double

    @State private var spin = false

    var body: some View {
        ZStack {
            Palette.ink

            RadialGradient(
                colors: [accent.opacity(0.16 * intensity), accent.opacity(0.04 * intensity), .clear],
                center: .center,
                startRadius: 40,
                endRadius: 1_100
            )
            .blendMode(.screen)

            Image("MazeRings")
                .resizable()
                .renderingMode(.template)
                .scaledToFit()
                .foregroundStyle(accent)
                .opacity(0.06)
                .frame(width: 1_500, height: 1_500)
                .rotationEffect(.degrees(spin ? 360 : 0))
                .blur(radius: 0.4)

            // A hairline of gold along the very top, the way the site's nav sits.
            VStack {
                LinearGradient(
                    colors: [.clear, Palette.gold.opacity(0.55), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(height: 2)
                Spacer()
            }

            // Corner vignette so the centre of the screen stays the brightest thing.
            RadialGradient(
                colors: [.clear, .clear, Color.black.opacity(0.75)],
                center: .center,
                startRadius: 500,
                endRadius: 1_500
            )
            .allowsHitTesting(false)
        }
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 0.6), value: accent)
        .onAppear {
            withAnimation(.linear(duration: 420).repeatForever(autoreverses: false)) {
                spin = true
            }
        }
    }
}
