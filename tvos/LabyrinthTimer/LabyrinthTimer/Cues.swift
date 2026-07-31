import AVFoundation
import Foundation

/// Every sound the timer makes, synthesised at launch rather than shipped as a
/// file: the bell is a stack of inharmonic partials, the clapper is filtered
/// noise. Nothing to license, nothing to load, and it can be tuned in code.
///
/// If you would rather use a recording, drop `bell.wav`, `clap.wav`, `tick.wav`
/// or `select.wav` into the app target and it is used instead — see `bundled`.
final class Cues {

    static let shared = Cues()

    enum Cue: String, CaseIterable {
        case bell     // a round starts, and a round ends — the same bell
        case clap     // the wooden clapper, at the warning
        case tick     // scrolling a value
        case select   // focus landing on a control
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

    /// Called once at launch. Renders every cue up front so the first bell of
    /// the night isn't late.
    func prepare() {
        guard !ready else { return }
        let session = AVAudioSession.sharedInstance()
        // .mixWithOthers so the gym can keep its music playing underneath.
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)

        for cue in Cue.allCases {
            buffers[cue] = bundled(cue) ?? synthesise(cue)
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

    // MARK: Recordings, if any

    /// A sound file named after the cue beats the synthesised version. Any
    /// sample rate or channel count — it is converted to the engine's format on
    /// the way in.
    private func bundled(_ cue: Cue) -> AVAudioPCMBuffer? {
        let url = ["wav", "caf", "aiff", "m4a"]
            .lazy
            .compactMap { Bundle.main.url(forResource: cue.rawValue, withExtension: $0) }
            .first
        guard let url, let file = try? AVAudioFile(forReading: url) else { return nil }

        let source = file.processingFormat
        guard let input = AVAudioPCMBuffer(pcmFormat: source, frameCapacity: AVAudioFrameCount(file.length)),
              (try? file.read(into: input)) != nil else { return nil }
        if source == format { return input }

        guard let converter = AVAudioConverter(from: source, to: format) else { return nil }
        let capacity = AVAudioFrameCount(Double(input.frameLength) * format.sampleRate / source.sampleRate) + 4_096
        guard let output = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: capacity) else { return nil }

        var supplied = false
        var error: NSError?
        converter.convert(to: output, error: &error) { _, status in
            if supplied {
                status.pointee = .endOfStream
                return nil
            }
            supplied = true
            status.pointee = .haveData
            return input
        }
        return error == nil ? output : nil
    }

    // MARK: Voicing

    /// One sine partial: a frequency, how loud it starts, and how long it takes
    /// to die away. A bell is a dozen of these at ratios that aren't whole
    /// numbers — that inharmonicity is what makes metal sound like metal.
    private struct Partial {
        var frequency: Double
        var gain: Double
        var decay: Double        // seconds to fall to 1/e
        var start: Double = 0
    }

    /// A burst of noise pushed through a resonant band. Two bands per hit: a
    /// bright one for the crack and a low one for the body.
    private struct Burst {
        var start: Double
        var duration: Double
        var decay: Double
        var gain: Double
        var centre: Double
        var q: Double
        var bodyCentre: Double = 0
        var bodyQ: Double = 1
        var bodyGain: Double = 0
    }

    /// The boxing bell. A struck hemisphere: a bright strike, a long ring, and
    /// a pair of slightly detuned partials so the tail warbles the way a real
    /// one does instead of sitting dead still.
    private func bell() -> ([Partial], [Burst]) {
        let f0 = 587.0
        let shape: [(ratio: Double, gain: Double, decay: Double)] = [
            (1.00, 1.00, 2.00),
            (1.19, 0.55, 1.65),
            (1.51, 0.42, 1.35),
            (2.00, 0.62, 1.20),
            (2.51, 0.30, 0.90),
            (2.99, 0.28, 0.70),
            (4.13, 0.18, 0.50),
            (5.42, 0.12, 0.35),
            (6.79, 0.08, 0.25),
        ]
        var partials = shape.map {
            Partial(frequency: f0 * $0.ratio, gain: $0.gain, decay: $0.decay)
        }
        // Detuned twins on the low partials — a few cents apart is all it takes
        // to get the slow beating of a real bell.
        for entry in shape.prefix(4) {
            partials.append(Partial(frequency: f0 * entry.ratio * 1.004,
                                    gain: entry.gain * 0.6,
                                    decay: entry.decay * 0.85))
        }
        let strike = [Burst(start: 0, duration: 0.06, decay: 0.012, gain: 0.5,
                            centre: 3_600, q: 0.9, bodyCentre: 1_200, bodyQ: 1.4, bodyGain: 0.4)]
        return (partials, strike)
    }

    /// The ten-second clapper: three wooden cracks, the sound that tells a
    /// corner the round is nearly up.
    private func clapper() -> ([Partial], [Burst]) {
        let bursts = (0..<3).map { i in
            Burst(start: Double(i) * 0.22,
                  duration: 0.22,
                  decay: 0.022,
                  gain: 1.95,
                  centre: 1_900,
                  q: 1.1,
                  bodyCentre: 430,
                  bodyQ: 2.2,
                  bodyGain: 0.9)
        }
        return ([], bursts)
    }

    private func synthesise(_ cue: Cue) -> AVAudioPCMBuffer? {
        switch cue {
        case .bell:
            let (partials, bursts) = bell()
            return render(partials: partials, bursts: bursts, length: 4.0)
        case .clap:
            let (partials, bursts) = clapper()
            return render(partials: partials, bursts: bursts, length: 0.9)
        case .tick:
            // Scrolling a value: barely there, just enough to feel mechanical.
            return render(partials: [Partial(frequency: 2_100, gain: 0.13, decay: 0.012),
                                     Partial(frequency: 3_150, gain: 0.06, decay: 0.008)],
                          bursts: [], length: 0.1)
        case .select:
            // Focus landing on a control: lower and softer than the scroll tick.
            return render(partials: [Partial(frequency: 880, gain: 0.14, decay: 0.03),
                                     Partial(frequency: 1_320, gain: 0.05, decay: 0.02)],
                          bursts: [], length: 0.14)
        }
    }

    // MARK: Rendering

    private func render(partials: [Partial], bursts: [Burst], length: Double) -> AVAudioPCMBuffer? {
        let rate = format.sampleRate
        let frames = AVAudioFrameCount(length * rate)
        guard frames > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frames),
              let channels = buffer.floatChannelData else { return nil }
        buffer.frameLength = frames

        var mix = [Double](repeating: 0, count: Int(frames))

        // Attack of about 3 ms on the tones, so nothing starts with a click.
        let attack = max(1.0, 0.003 * rate)
        for partial in partials {
            let first = Int(partial.start * rate)
            for n in 0..<(Int(frames) - first) {
                let index = first + n
                guard index < mix.count else { break }
                let t = Double(n) / rate
                let envelope = min(Double(n) / attack, 1) * exp(-t / partial.decay)
                if envelope < 0.0002 && t > 0.02 { break }
                mix[index] += sin(2 * .pi * partial.frequency * t) * envelope * partial.gain
            }
        }

        var noise = Noise(seed: 0x5EED_1A6B)
        for burst in bursts {
            var bright = Bandpass(centre: burst.centre, q: burst.q, rate: rate)
            var body = Bandpass(centre: max(burst.bodyCentre, 20), q: burst.bodyQ, rate: rate)
            let first = Int(burst.start * rate)
            let count = Int(burst.duration * rate)
            for n in 0..<count {
                let index = first + n
                guard index < mix.count else { break }
                let t = Double(n) / rate
                let source = noise.next()
                let envelope = exp(-t / burst.decay)
                var sample = bright.process(source) * burst.gain
                if burst.bodyGain > 0 {
                    sample += body.process(source) * burst.bodyGain
                }
                mix[index] += sample * envelope
            }
        }

        // Leave headroom so a stack of partials never clips the TV's speaker.
        let peak = mix.reduce(0.0) { max($0, abs($1)) }
        let scale = peak > 0.92 ? 0.92 / peak : 1
        // A bell is still ringing when the buffer runs out, and a hard edge on
        // the end of a buffer is a click. Taper the last half second.
        let release = min(0.5 * rate, Double(frames) * 0.3)
        for n in 0..<Int(frames) {
            let taper = min(1.0, Double(Int(frames) - n) / release)
            let sample = Float(mix[n] * scale * taper)
            channels[0][n] = sample
            if format.channelCount > 1 { channels[1][n] = sample }
        }
        return buffer
    }

    /// Seeded so every launch renders the identical clap — a cue that sounds
    /// slightly different each time you open the app is unsettling.
    private struct Noise {
        private var state: UInt64
        init(seed: UInt64) { state = seed }
        mutating func next() -> Double {
            state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
            return Double(state >> 40) / Double(1 << 23) - 1.0
        }
    }

    /// A two-pole bandpass, straight out of the RBJ cookbook. Turns flat noise
    /// into something with a pitch to it.
    private struct Bandpass {
        private let b0: Double, b2: Double, a1: Double, a2: Double
        private var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0

        init(centre: Double, q: Double, rate: Double) {
            let w = 2 * .pi * min(centre, rate * 0.45) / rate
            let alpha = sin(w) / (2 * max(q, 0.1))
            let a0 = 1 + alpha
            b0 = alpha / a0
            b2 = -alpha / a0
            a1 = -2 * cos(w) / a0
            a2 = (1 - alpha) / a0
        }

        mutating func process(_ x: Double) -> Double {
            let y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = x; y2 = y1; y1 = y
            return y
        }
    }
}
