import AVFoundation
import Foundation

/// Every sound the timer makes is synthesised at launch rather than shipped as
/// a file: the horn is a stack of sine partials with a fast attack, which keeps
/// the bundle tiny and lets us tune the cues in code.
final class Cues {

    static let shared = Cues()

    enum Cue: String, CaseIterable {
        case roundStart   // long horn — go
        case roundEnd     // three blasts — hands off
        case warning      // two mid beeps — the round is nearly up
        case tick         // the last three seconds
        case sessionEnd   // the session is over
        case click        // quiet confirmation for the remote
    }

    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let format: AVAudioFormat
    private var buffers: [Cue: AVAudioPCMBuffer] = [:]
    private var ready = false

    private init() {
        format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 2)!
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: format)
    }

    /// Called once at launch. Renders every cue up front so the first horn of
    /// the night isn't late.
    func prepare() {
        guard !ready else { return }
        let session = AVAudioSession.sharedInstance()
        // .mixWithOthers so the gym can keep its music playing underneath.
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)

        for cue in Cue.allCases {
            buffers[cue] = render(voices(for: cue))
        }

        do {
            try engine.start()
            player.play()
            ready = true
        } catch {
            ready = false
        }
    }

    func play(_ cue: Cue) {
        guard ready, let buffer = buffers[cue] else { return }
        if !engine.isRunning { try? engine.start() }
        if !player.isPlaying { player.play() }
        player.scheduleBuffer(buffer, at: nil, options: [], completionHandler: nil)
    }

    // MARK: Voicing

    /// One partial of one note: a sine at `frequency`, fading out over its life.
    private struct Voice {
        var frequency: Double
        var start: Double
        var duration: Double
        var gain: Double
        var decay: Double = 3.0     // higher = shorter, punchier tail
        var vibrato: Double = 0     // Hz of pitch wobble, gives the horn its body
    }

    /// A note built from a fundamental plus a couple of odd harmonics — enough
    /// to read as a horn through a TV speaker without sounding like a test tone.
    private func horn(_ f: Double, at t: Double, for d: Double, gain: Double = 0.9, decay: Double = 1.6) -> [Voice] {
        [
            Voice(frequency: f, start: t, duration: d, gain: gain, decay: decay, vibrato: 4.5),
            Voice(frequency: f * 1.5, start: t, duration: d, gain: gain * 0.42, decay: decay, vibrato: 4.5),
            Voice(frequency: f * 2, start: t, duration: d, gain: gain * 0.24, decay: decay + 0.6),
            Voice(frequency: f * 3, start: t, duration: d, gain: gain * 0.1, decay: decay + 1.4),
        ]
    }

    private func beep(_ f: Double, at t: Double, for d: Double, gain: Double = 0.7) -> [Voice] {
        [
            Voice(frequency: f, start: t, duration: d, gain: gain, decay: 4.0),
            Voice(frequency: f * 2, start: t, duration: d, gain: gain * 0.2, decay: 6.0),
        ]
    }

    private func voices(for cue: Cue) -> [Voice] {
        switch cue {
        case .roundStart:
            // One long blast, a fifth stacked on top. Unmistakable across a mat.
            return horn(392, at: 0, for: 0.95, gain: 0.95, decay: 1.1)
                + horn(587, at: 0, for: 0.95, gain: 0.45, decay: 1.1)

        case .roundEnd:
            // Three short blasts, the way a scoreboard buzzer ends a period.
            return (0..<3).flatMap { i -> [Voice] in
                let t = Double(i) * 0.28
                return horn(330, at: t, for: 0.22, gain: 0.95, decay: 5.0)
                    + horn(494, at: t, for: 0.22, gain: 0.4, decay: 5.0)
            }

        case .warning:
            return beep(880, at: 0, for: 0.11) + beep(880, at: 0.17, for: 0.11)

        case .tick:
            return beep(1_240, at: 0, for: 0.06, gain: 0.5)

        case .sessionEnd:
            // Rising three-note flourish into a held note.
            return horn(392, at: 0, for: 0.2, gain: 0.8, decay: 4.0)
                + horn(494, at: 0.2, for: 0.2, gain: 0.8, decay: 4.0)
                + horn(587, at: 0.4, for: 0.2, gain: 0.85, decay: 4.0)
                + horn(784, at: 0.6, for: 1.2, gain: 0.95, decay: 1.0)

        case .click:
            return beep(1_500, at: 0, for: 0.025, gain: 0.16)
        }
    }

    // MARK: Rendering

    private func render(_ voices: [Voice]) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let tail = voices.map { $0.start + $0.duration }.max() ?? 0
        let frames = AVAudioFrameCount((tail + 0.05) * rate)
        guard frames > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames),
              let channels = buffer.floatChannelData else { return nil }
        buffer.frameLength = frames

        var mix = [Float](repeating: 0, count: Int(frames))
        for voice in voices {
            let first = Int(voice.start * rate)
            let count = Int(voice.duration * rate)
            guard count > 0 else { continue }
            let attack = max(1.0, 0.006 * rate)   // ~6 ms, no clicks
            for n in 0..<count {
                let index = first + n
                guard index < mix.count else { break }
                let t = Double(n) / rate
                let phase = 2 * .pi * voice.frequency * t
                let wobble = voice.vibrato > 0 ? 0.012 * sin(2 * .pi * voice.vibrato * t) : 0
                let envelope = min(Double(n) / attack, 1) * exp(-voice.decay * t / voice.duration)
                mix[index] += Float(sin(phase + phase * wobble) * envelope * voice.gain)
            }
        }

        // Leave headroom so stacked partials never clip the TV's speaker.
        let peak = mix.reduce(Float(0)) { max($0, abs($1)) }
        let scale = peak > 0.92 ? 0.92 / peak : 1
        for n in 0..<Int(frames) {
            let sample = mix[n] * scale
            channels[0][n] = sample
            if format.channelCount > 1 { channels[1][n] = sample }
        }
        return buffer
    }
}
