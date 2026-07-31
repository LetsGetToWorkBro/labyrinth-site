import SwiftUI
import UIKit

@main
struct LabyrinthTimerApp: App {
    var body: some Scene {
        WindowGroup {
            TimerScreen()
                .preferredColorScheme(.dark)
                .onAppear {
                    // A round timer that lets the TV fall asleep mid-round is
                    // no use to anyone on the mat.
                    UIApplication.shared.isIdleTimerDisabled = true
                }
        }
    }
}
