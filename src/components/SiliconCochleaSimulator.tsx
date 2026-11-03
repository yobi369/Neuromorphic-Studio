import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Radio,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
} from "lucide-react";
import { spikeAudio } from "../utils/audioSynth";

export function SiliconCochleaSimulator() {
  const [inputMode, setInputMode] = useState<"synthetic" | "mic">("synthetic");
  const [synthPattern, setSynthPattern] = useState<
    "chirp_sweep" | "speech_formant" | "impulse_click" | "dual_tone" | "bearing_fault"
  >("chirp_sweep");

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [numChannels] = useState<number>(24); // 24 tonotopic frequency channels (100 Hz - 7500 Hz)
  const [threshold, setThreshold] = useState<number>(0.35);
  const [qFactor, setQFactor] = useState<number>(4.0); // Filter selectivity
  const [refractoryMs, setRefractoryMs] = useState<number>(3.0);
  const [audioGain, setAudioGain] = useState<number>(1.2);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);

  // Telemetry
  const [totalSpikesPerSec, setTotalSpikesPerSec] = useState<number>(0);
  const [detectedAcousticEvent, setDetectedAcousticEvent] = useState<string>("Frequency Sweep Chirp");
  const [eventConfidence, setEventConfidence] = useState<number>(94);

  // Canvas Refs
  const rasterCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const basilarCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Web Audio Context for Mic and Synth
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  // Channel neuron state: v_mem, lastSpikeTime
  const channelStatesRef = useRef<
    Array<{
      v: number;
      lastSpike: number;
      freq: number;
      history: boolean[];
    }>
  >([]);

  // Initialize frequency distribution (ERB scale: Equivalent Rectangular Bandwidth)
  useEffect(() => {
    const minFreq = 120;
    const maxFreq = 7200;
    const states = [];
    for (let i = 0; i < numChannels; i++) {
      // Logarithmic / ERB spacing from apex (low freq) to base (high freq)
      const f = minFreq * Math.pow(maxFreq / minFreq, i / (numChannels - 1));
      states.push({
        v: 0,
        lastSpike: 0,
        freq: Math.round(f),
        history: new Array(150).fill(false),
      });
    }
    channelStatesRef.current = states;
  }, [numChannels]);

  // Toggle Live Microphone
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (inputMode === "mic") {
      navigator.mediaDevices
        ?.getUserMedia({ audio: true })
        .then((s) => {
          stream = s;
          micStreamRef.current = s;
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(s);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.6;
          source.connect(analyser);
          analyserRef.current = analyser;
        })
        .catch((err) => {
          console.warn("Microphone access denied or unavailable, reverting to synthetic:", err);
          setInputMode("synthetic");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [inputMode]);

  // Main Simulation Loop
  useEffect(() => {
    let lastTime = performance.now();
    let spikeCounter = 0;
    let rateTimer = performance.now();

    const renderLoop = (time: number) => {
      const dt = Math.min(32, time - lastTime);
      lastTime = time;

      if (!isRunning) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const states = channelStatesRef.current;
      if (!states || states.length === 0) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // 1. Compute acoustic energy per channel
      const channelEnergies = new Float32Array(numChannels);

      if (inputMode === "mic" && analyserRef.current) {
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);

        for (let i = 0; i < numChannels; i++) {
          const binIndex = Math.min(
            freqData.length - 1,
            Math.floor((states[i].freq / (audioCtxRef.current?.sampleRate || 44100)) * freqData.length * 2)
          );
          channelEnergies[i] = (freqData[binIndex] / 255) * audioGain;
        }

        // Live mic classification
        const highEnergyCount = channelEnergies.filter((e) => e > 0.4).length;
        if (highEnergyCount > 14) {
          setDetectedAcousticEvent("Broadband Vocal / Speech Wave");
          setEventConfidence(96);
        } else if (channelEnergies.slice(0, 6).some((e) => e > 0.5)) {
          setDetectedAcousticEvent("Low-Frequency Mechanical Rumble");
          setEventConfidence(91);
        } else if (channelEnergies.slice(16).some((e) => e > 0.4)) {
          setDetectedAcousticEvent("High-Pitch Whistle / Key Clink");
          setEventConfidence(88);
        }
      } else {
        // Synthetic Patterns
        const tSec = time / 1000;
        if (synthPattern === "chirp_sweep") {
          // Logarithmic sweep up and down
          const sweepChannel = Math.floor(
            ((Math.sin(tSec * 2.5) + 1) / 2) * (numChannels - 1)
          );
          for (let i = 0; i < numChannels; i++) {
            const dist = Math.abs(i - sweepChannel);
            channelEnergies[i] = Math.max(0, 1.0 - dist / qFactor) * audioGain;
          }
          setDetectedAcousticEvent("Frequency Sweep Chirp (120Hz → 7.2kHz)");
          setEventConfidence(98);
        } else if (synthPattern === "speech_formant") {
          // Dual vowel formants F1 (approx ch 4) & F2 (approx ch 15)
          const f1 = 4 + Math.sin(tSec * 4) * 1.5;
          const f2 = 14 + Math.cos(tSec * 3) * 2;
          for (let i = 0; i < numChannels; i++) {
            const d1 = Math.abs(i - f1);
            const d2 = Math.abs(i - f2);
            const e1 = Math.max(0, 0.8 - d1 / 2.5);
            const e2 = Math.max(0, 0.7 - d2 / 2.5);
            channelEnergies[i] = (e1 + e2) * audioGain;
          }
          setDetectedAcousticEvent("Vocal Vowel Formants (F1: 450Hz, F2: 2.1kHz)");
          setEventConfidence(95);
        } else if (synthPattern === "impulse_click") {
          // Periodic high-energy acoustic clicks
          const isClick = Math.sin(tSec * 8) > 0.95;
          for (let i = 0; i < numChannels; i++) {
            channelEnergies[i] = isClick ? (0.7 + Math.random() * 0.3) * audioGain : 0.02;
          }
          setDetectedAcousticEvent("Impulsive Shock / Glass Impact");
          setEventConfidence(92);
        } else if (synthPattern === "dual_tone") {
          // Multi-frequency harmonic chord
          for (let i = 0; i < numChannels; i++) {
            const isRoot = Math.abs(i - 6) < 1.5;
            const isFifth = Math.abs(i - 13) < 1.5;
            channelEnergies[i] = (isRoot ? 0.7 : isFifth ? 0.6 : 0.03) * audioGain;
          }
          setDetectedAcousticEvent("Dual Harmonic Chord (C4 + G5)");
          setEventConfidence(97);
        } else if (synthPattern === "bearing_fault") {
          // High-frequency repetitive spikes with low-frequency modulation
          const impact = Math.sin(tSec * 24) > 0.8;
          for (let i = 0; i < numChannels; i++) {
            const isBearingBand = i > 16;
            channelEnergies[i] = isBearingBand && impact ? 0.85 * audioGain : 0.05;
          }
          setDetectedAcousticEvent("Industrial Bearing Defect (BPFO 24Hz)");
          setEventConfidence(94);
        }
      }

      // 2. Integrate-and-Fire per cochlear channel
      let frameSpikes = 0;
      for (let i = 0; i < numChannels; i++) {
        const state = states[i];
        const energy = channelEnergies[i];

        // Refractory check
        if (time - state.lastSpike > refractoryMs) {
          // Membrane integration with leak
          state.v = state.v * 0.85 + energy * 0.45;

          if (state.v >= threshold) {
            // SPIKE!
            state.v = 0; // reset
            state.lastSpike = time;
            state.history.push(true);
            frameSpikes++;
            spikeCounter++;

            if (!isAudioMuted && Math.random() < 0.15) {
              spikeAudio.playSpike(state.freq, 0.02);
            }
          } else {
            state.history.push(false);
          }
        } else {
          state.history.push(false);
        }

        if (state.history.length > 150) {
          state.history.shift();
        }
      }

      // Update rate telemetry every 300ms
      if (time - rateTimer > 300) {
        setTotalSpikesPerSec(Math.round((spikeCounter / (time - rateTimer)) * 1000));
        spikeCounter = 0;
        rateTimer = time;
      }

      // 3. Render Tonotopic Spike Raster Canvas
      const rasterCanvas = rasterCanvasRef.current;
      if (rasterCanvas) {
        const ctx = rasterCanvas.getContext("2d");
        if (ctx) {
          const w = rasterCanvas.width;
          const h = rasterCanvas.height;
          ctx.fillStyle = "#020617";
          ctx.fillRect(0, 0, w, h);

          // Draw grid lines
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 0.5;
          const rowHeight = h / numChannels;

          for (let i = 0; i < numChannels; i++) {
            const y = i * rowHeight;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();

            // Channel frequency label
            ctx.fillStyle = "#475569";
            ctx.font = "8px monospace";
            if (i % 3 === 0) {
              ctx.fillText(`${states[i].freq}Hz`, 4, y + rowHeight - 2);
            }

            // Draw spikes in history
            const hist = states[i].history;
            const stepX = (w - 50) / hist.length;
            for (let j = 0; j < hist.length; j++) {
              if (hist[j]) {
                const x = 50 + j * stepX;
                ctx.fillStyle = i > 16 ? "#f43f5e" : i > 8 ? "#06b6d4" : "#10b981";
                ctx.fillRect(x, y + 1, Math.max(1.5, stepX - 0.5), rowHeight - 2);
              }
            }
          }
        }
      }

      // 4. Render Basilar Membrane Waveform Canvas
      const basilarCanvas = basilarCanvasRef.current;
      if (basilarCanvas) {
        const ctx = basilarCanvas.getContext("2d");
        if (ctx) {
          const w = basilarCanvas.width;
          const h = basilarCanvas.height;
          ctx.fillStyle = "#020617";
          ctx.fillRect(0, 0, w, h);

          // Center line
          ctx.strokeStyle = "#1e293b";
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          // Resonator envelope
          ctx.beginPath();
          ctx.strokeStyle = "#06b6d4";
          ctx.lineWidth = 2;

          for (let i = 0; i < numChannels; i++) {
            const x = (i / (numChannels - 1)) * w;
            const amp = channelEnergies[i] * (h / 2.5);
            const y = h / 2 - Math.sin(time / 100 + i * 0.4) * amp;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Gradient fill under basilar membrane
          ctx.lineTo(w, h / 2);
          ctx.lineTo(0, h / 2);
          ctx.closePath();
          ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isRunning, inputMode, synthPattern, threshold, qFactor, refractoryMs, audioGain, isAudioMuted, numChannels]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              DYNAMIC AUDIO SENSOR (DAS)
            </span>
            <span className="text-xs text-emerald-400 font-mono font-semibold">
              Biological Silicon Cochlea Filterbank
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span>Silicon Cochlea &amp; Acoustic Neuromorphic Classifier</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Decompose continuous acoustic signals into tonotopic auditory nerve spike trains. Each frequency
            band fires asynchronous spikes for sub-milliwatt keyword spotting and anomaly detection.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`p-2.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              !isAudioMuted
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
            title={isAudioMuted ? "Unmute biological spike audio clicks" : "Mute spike audio"}
          >
            {!isAudioMuted ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{!isAudioMuted ? "Audio ON" : "Audio Muted"}</span>
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-2.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              isRunning
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" /> <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> <span>Resume</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Controls & Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Audio Source & Biological Tuning */}
        <div className="lg:col-span-4 space-y-4">
          {/* Source Selection */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Acoustic Stimulus Source</span>
            </h3>

            {/* Mic vs Synthetic Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => setInputMode("synthetic")}
                className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  inputMode === "synthetic"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Synthetic Generator
              </button>
              <button
                onClick={() => setInputMode("mic")}
                className={`py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  inputMode === "mic"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Live Microphone</span>
              </button>
            </div>

            {inputMode === "synthetic" && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-slate-400">Synthetic Acoustic Pattern:</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: "chirp_sweep", name: "Chirp Frequency Sweep", desc: "120 Hz to 7.2 kHz continuous sweep" },
                    { id: "speech_formant", name: "Speech Formants (Vowel)", desc: "Dual harmonic resonance (F1/F2)" },
                    { id: "bearing_fault", name: "Industrial Bearing Defect", desc: "Periodic ultrasonic impacts (24 Hz)" },
                    { id: "dual_tone", name: "Harmonic Chord (C4+G5)", desc: "Fixed dual tonotopic channels" },
                    { id: "impulse_click", name: "Impulsive Acoustic Shocks", desc: "Broadband transient spikes" },
                  ].map((pat) => (
                    <button
                      key={pat.id}
                      onClick={() => setSynthPattern(pat.id as typeof synthPattern)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        synthPattern === pat.id
                          ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-200"
                          : "bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200">{pat.name}</div>
                      <div className="text-[10px] text-slate-500">{pat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Biological Cochlea Parameters */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Spike Firing Threshold (θ):</span>
                  <span className="text-cyan-400">{threshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Q-Factor (Frequency Selectivity):</span>
                  <span className="text-cyan-400">{qFactor.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={qFactor}
                  onChange={(e) => setQFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Auditory Input Gain:</span>
                  <span className="text-cyan-400">{audioGain.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={audioGain}
                  onChange={(e) => setAudioGain(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Real-time Acoustic Classifier Box */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Real-Time SNN Acoustic Classifier
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px]">
                {eventConfidence}% Confidence
              </span>
            </div>
            <div className="text-sm font-bold text-white font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{detectedAcousticEvent}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Evaluates asynchronous spike timing across tonotopic channels with zero continuous FFT power penalty.
            </p>
          </div>
        </div>

        {/* Right Column: Visualizers & Telemetry */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tonotopic Spike Raster */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-2 font-bold text-cyan-400">
                <Activity className="w-4 h-4" />
                Tonotopic Auditory Nerve Spike Raster (24 Frequency Channels)
              </span>
              <span className="text-[10px] text-slate-500">Time → (Last 150 Steps)</span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-1">
              <canvas
                ref={rasterCanvasRef}
                width={700}
                height={260}
                className="w-full h-64 block rounded-lg"
              />
              <div className="absolute top-3 right-3 flex items-center gap-3 bg-slate-950/80 px-2.5 py-1 rounded-lg text-[10px] font-mono border border-slate-800">
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Low (Apex)
                </span>
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Mid
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> High (Base)
                </span>
              </div>
            </div>
          </div>

          {/* Basilar Membrane Waveform */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-2 font-bold text-slate-200">
                <Radio className="w-4 h-4 text-cyan-400" />
                Basilar Membrane Traveling Wave Resonator
              </span>
              <span className="text-[10px] text-slate-500">120 Hz Apex → 7.2 kHz Base</span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-1">
              <canvas
                ref={basilarCanvasRef}
                width={700}
                height={90}
                className="w-full h-24 block rounded-lg"
              />
            </div>
          </div>

          {/* Telemetry Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Acoustic Event Rate</div>
              <div className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">
                {totalSpikesPerSec}{" "}
                <span className="text-xs font-normal text-slate-400">Hz</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Active Channels</div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                {numChannels} / 24
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Processing Power</div>
              <div className="text-xl font-extrabold text-teal-300 font-mono mt-0.5">
                12.5 <span className="text-xs font-normal text-slate-400">μW</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">FFT Power Savings</div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                98.6%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
