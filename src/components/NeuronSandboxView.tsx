import { useState, useRef, useEffect } from "react";
import {
  NeuronModelType,
  IzhikevichPreset,
  LifParams,
  IzhikevichParams,
  AdExParams,
} from "../types";
import { stepLif, stepAdEx, stepIzhikevich } from "../engine/index";
import { spikeAudio } from "../utils/audioSynth";
import {
  Activity,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Info,
  Sparkles,
  Layers,
} from "lucide-react";

export function NeuronSandboxView() {
  const [modelType, setModelType] = useState<NeuronModelType>("izhikevich");
  const [izhPreset, setIzhPreset] = useState<IzhikevichPreset>("regular_spiking");

  // Injected current parameters
  const [currentInjection, setCurrentInjection] = useState<number>(10.0); // nA for LIF/AdEx; normalized drive for Izhikevich
  const [noiseLevel, setNoiseLevel] = useState<number>(1.2);
  const [stimulusType, setStimulusType] = useState<"dc" | "pulse" | "sine" | "poisson">("dc");

  // LIF Parameters
  const [lifParams, setLifParams] = useState<LifParams>({
    tau_m: 20.0, // ms
    v_rest: -70.0, // mV
    v_reset: -65.0, // mV
    v_thresh: -50.0, // mV
    r_m: 10.0, // MOhm
    tau_ref: 3.0, // ms
  });

  // Izhikevich Parameters
  const [izhParams, setIzhParams] = useState<IzhikevichParams>({
    a: 0.02,
    b: 0.2,
    c: -65.0,
    d: 8.0,
    v_peak: 30.0,
  });

  const [adexParams, setAdexParams] = useState<AdExParams>({ c_m: 200, g_l: 10, e_l: -70, v_t: -50, delta_t: 2, a: 2, tau_w: 100, b: 20, v_reset: -60 });

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [spikeCount, setSpikeCount] = useState<number>(0);
  const [instantRateHz, setInstantRateHz] = useState<number>(0);

  // Canvas Refs
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation internal state
  const stateRef = useRef<{
    v: number;
    u: number;
    w: number;
    refractoryRemaining: number;
    timeMs: number;
    historyV: number[];
    historyI: number[];
    historyU: number[];
    spikes: number[];
    lastSpikeTime: number;
  }>({
    v: -65,
    u: -65 * 0.2,
    w: 0,
    refractoryRemaining: 0,
    timeMs: 0,
    historyV: [],
    historyI: [],
    historyU: [],
    spikes: [],
    lastSpikeTime: -999,
  });

  // Apply Izhikevich Presets
  const applyIzhPreset = (preset: IzhikevichPreset) => {
    setIzhPreset(preset);
    setModelType("izhikevich");
    if (preset === "regular_spiking") {
      setIzhParams({ a: 0.02, b: 0.2, c: -65, d: 8, v_peak: 30 });
      setCurrentInjection(10);
    } else if (preset === "intrinsically_bursting") {
      setIzhParams({ a: 0.02, b: 0.2, c: -55, d: 4, v_peak: 30 });
      setCurrentInjection(10);
    } else if (preset === "chattering") {
      setIzhParams({ a: 0.02, b: 0.2, c: -50, d: 2, v_peak: 30 });
      setCurrentInjection(10);
    } else if (preset === "fast_spiking") {
      setIzhParams({ a: 0.1, b: 0.2, c: -65, d: 2, v_peak: 30 });
      setCurrentInjection(10);
    } else if (preset === "thalamocortical") {
      setIzhParams({ a: 0.02, b: 0.25, c: -65, d: 0.05, v_peak: 30 });
      setCurrentInjection(3);
    } else if (preset === "resonator") {
      setIzhParams({ a: 0.1, b: 0.26, c: -65, d: 2, v_peak: 30 });
      setCurrentInjection(1.5);
    }
  };

  // Reset simulation state
  const resetSimulation = () => {
    stateRef.current = {
      v: modelType === "lif" ? lifParams.v_rest : modelType === "adex" ? adexParams.e_l : -65,
      u: -65 * (modelType === "izhikevich" ? izhParams.b : 0.2),
      w: 0,
      refractoryRemaining: 0,
      timeMs: 0,
      historyV: [],
      historyI: [],
      historyU: [],
      spikes: [],
      lastSpikeTime: -999,
    };
    randomRef.current = 0x6d2b79f5;
    setSpikeCount(0);
    setInstantRateHz(0);
  };

  const randomRef = useRef(0x6d2b79f5);
  const nextRandom = () => { let x = randomRef.current; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; randomRef.current = x >>> 0; return (randomRef.current >>> 0) / 4294967296; };
  const nextGaussian = () => { const u1 = Math.max(1e-12, nextRandom()); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * nextRandom()); };

  useEffect(() => { resetSimulation(); }, [modelType]);

  // Physics Simulation Loop
  useEffect(() => {
    let animId: number;
    const dt = 0.2; // ms integration step

    const stepSimulation = () => {
      if (!isSimulating) {
        animId = requestAnimationFrame(stepSimulation);
        return;
      }

      const st = stateRef.current;
      const stepsPerFrame = 6; // Fast integration for 60fps

      for (let step = 0; step < stepsPerFrame; step++) {
        st.timeMs += dt;

        // Compute input current I(t)
        let I = currentInjection;
        if (stimulusType === "pulse") {
          // 50ms ON, 50ms OFF
          I = (st.timeMs % 100 < 50) ? currentInjection : 0;
        } else if (stimulusType === "sine") {
          I = currentInjection * (1 + 0.8 * Math.sin(st.timeMs * 0.015));
        } else if (stimulusType === "poisson") {
          // Poisson spike inputs
          I = Math.random() < 0.08 ? currentInjection * 3.5 : 0;
        }

        // Add Gaussian noise
        if (noiseLevel > 0) {
          const noise = (Math.random() + Math.random() - 1.0) * noiseLevel * 2;
          I += noise;
        }

        let didSpike = false;
        if (modelType === "lif") {
          const result = stepLif(
            { voltageMv: st.v, refractoryRemainingMs: st.refractoryRemaining },
            { tauM: lifParams.tau_m, resistanceMOhm: lifParams.r_m, restMv: lifParams.v_rest, resetMv: lifParams.v_reset, thresholdMv: lifParams.v_thresh, refractoryMs: lifParams.tau_ref },
            I * 1000, dt, "rk4",
          );
          st.v = result.state.voltageMv;
          st.refractoryRemaining = result.state.refractoryRemainingMs;
          didSpike = result.spike;
        } else if (modelType === "adex") {
          const result = stepAdEx(
            { voltageMv: st.v, adaptationPa: st.w },
            { capacitancePf: adexParams.c_m, leakConductanceNs: adexParams.g_l, leakReversalMv: adexParams.e_l, thresholdMv: adexParams.v_t, slopeFactorMv: adexParams.delta_t, adaptationA: adexParams.a, adaptationTauMs: adexParams.tau_w, adaptationBPa: adexParams.b, resetMv: adexParams.v_reset, spikeCutoffMv: 20 },
            I * 1000, dt, "rk4",
          );
          st.v = result.state.voltageMv;
          st.w = result.state.adaptationPa;
          didSpike = result.spike;
        } else {
          const result = stepIzhikevich(
            { voltageMv: st.v, recovery: st.u },
            { a: izhParams.a, b: izhParams.b, c: izhParams.c, d: izhParams.d, spikeCutoffMv: izhParams.v_peak },
            I, dt, "rk4",
          );
          st.v = result.state.voltageMv;
          st.u = result.state.recovery;
          didSpike = result.spike;
        }

        if (didSpike) {
          st.spikes.push(st.timeMs);
          if (st.spikes.length > 10000) st.spikes.shift();
          spikeAudio.playSpike(0.7, 1.0);
          const isi = st.timeMs - st.lastSpikeTime;
          st.lastSpikeTime = st.timeMs;
          if (isi > 0 && isi < 2000) setInstantRateHz(Math.round(1000 / isi));
          setSpikeCount((prev) => prev + 1);
        }

        // Buffer history (keep last 400 points)
        st.historyV.push(didSpike ? 20 : st.v);
        st.historyI.push(I);
        st.historyU.push(modelType === "adex" ? st.w : st.u);
        if (st.historyV.length > 350) {
          st.historyV.shift();
          st.historyI.shift();
          st.historyU.shift();
        }
      }

      // Render Oscilloscope
      const scopeCanvas = scopeCanvasRef.current;
      if (scopeCanvas) {
        const ctx = scopeCanvas.getContext("2d");
        if (ctx) {
          const w = scopeCanvas.width;
          const h = scopeCanvas.height;

          ctx.fillStyle = "#030712";
          ctx.fillRect(0, 0, w, h);

          // Grid & Zero lines
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 1;
          for (let y = 0; y <= h; y += h / 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }

          // Voltage scale: -90mV to +40mV (130mV span)
          const vMin = -90;
          const vMax = 40;
          const vToY = (v: number) => h - ((v - vMin) / (vMax - vMin)) * h;

          // Draw Threshold line
          const vThresh = modelType === "lif" ? lifParams.v_thresh : izhParams.v_peak;
          ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, vToY(vThresh));
          ctx.lineTo(w, vToY(vThresh));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#ef4444";
          ctx.font = "10px monospace";
          ctx.fillText(`V_thresh: ${vThresh.toFixed(0)}mV`, 10, vToY(vThresh) - 4);

          // Draw Resting line
          const vRest = modelType === "lif" ? lifParams.v_rest : -65;
          ctx.strokeStyle = "rgba(148, 163, 184, 0.3)";
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(0, vToY(vRest));
          ctx.lineTo(w, vToY(vRest));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#64748b";
          ctx.fillText(`V_rest: ${vRest.toFixed(0)}mV`, 10, vToY(vRest) - 4);

          // Draw Membrane Voltage Trace V(t)
          ctx.strokeStyle = "#00ffcc";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          const pts = st.historyV;
          const xStep = w / 350;
          for (let i = 0; i < pts.length; i++) {
            const x = i * xStep;
            const y = vToY(pts[i]);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Draw Injected Current I(t) at bottom
          ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const iMax = 35;
          for (let i = 0; i < st.historyI.length; i++) {
            const x = i * xStep;
            const y = h - 6 - (Math.max(0, st.historyI[i]) / iMax) * (h * 0.2);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.fillStyle = "#38bdf8";
          ctx.fillText("Injected Current I(t)", w - 130, h - 8);
        }
      }

      // Render Phase Plane (v vs u)
      const phaseCanvas = phaseCanvasRef.current;
      if (phaseCanvas && modelType === "izhikevich") {
        const pctx = phaseCanvas.getContext("2d");
        if (pctx) {
          const pw = phaseCanvas.width;
          const ph = phaseCanvas.height;

          pctx.fillStyle = "#030712";
          pctx.fillRect(0, 0, pw, ph);

          pctx.strokeStyle = "#1e293b";
          pctx.lineWidth = 1;
          pctx.beginPath();
          pctx.moveTo(pw / 2, 0);
          pctx.lineTo(pw / 2, ph);
          pctx.moveTo(0, ph / 2);
          pctx.lineTo(pw, ph / 2);
          pctx.stroke();

          // Map v (-80 to 40) and u (-25 to 25)
          const mapV = (v: number) => ((v + 80) / 120) * pw;
          const mapU = (u: number) => ph - ((u + 25) / 50) * ph;

          // Trajectory tail
          pctx.strokeStyle = "rgba(0, 255, 204, 0.4)";
          pctx.lineWidth = 1.2;
          pctx.beginPath();
          const vPts = st.historyV;
          const uPts = st.historyU;
          for (let i = 0; i < vPts.length; i++) {
            const px = mapV(vPts[i]);
            const py = mapU(uPts[i]);
            if (i === 0) pctx.moveTo(px, py);
            else pctx.lineTo(px, py);
          }
          pctx.stroke();

          // Current state head point
          pctx.fillStyle = "#00ffcc";
          pctx.beginPath();
          pctx.arc(mapV(st.v), mapU(st.u), 4, 0, Math.PI * 2);
          pctx.fill();

          pctx.fillStyle = "#94a3b8";
          pctx.font = "9px monospace";
          pctx.fillText("v (mV)", pw - 35, ph / 2 - 5);
          pctx.fillText("u (recovery)", pw / 2 + 5, 12);
        }
      }

      animId = requestAnimationFrame(stepSimulation);
    };

    animId = requestAnimationFrame(stepSimulation);
    return () => cancelAnimationFrame(animId);
  }, [
    isSimulating,
    modelType,
    currentInjection,
    noiseLevel,
    stimulusType,
    lifParams,
    izhParams,
    adexParams,
  ]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
              PHASE 02 & 03
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Biophysical & Neuromorphic Neuron Dynamics
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time numerical ODE integration of Leaky Integrate-and-Fire & Izhikevich cortical models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSimulating
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? "Pause Dynamics" : "Resume Dynamics"}</span>
          </button>

          <button
            onClick={resetSimulation}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Oscilloscope & Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Model Selector */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Neuron Model Family
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setModelType("izhikevich")}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  modelType === "izhikevich"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Izhikevich (Cortical)
              </button>
              <button
                onClick={() => setModelType("lif")}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  modelType === "lif"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Standard LIF
              </button>
            </div>

            {/* Izhikevich Presets */}
            {modelType === "izhikevich" && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-[11px] font-mono text-slate-400">Biological Firing Regimes:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "regular_spiking", label: "Regular Spiking (RS)" },
                    { id: "intrinsically_bursting", label: "Bursting (IB)" },
                    { id: "chattering", label: "Chattering (CH)" },
                    { id: "fast_spiking", label: "Fast Spiking (FS)" },
                    { id: "thalamocortical", label: "Thalamocortical" },
                    { id: "resonator", label: "Resonator" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyIzhPreset(p.id as IzhikevichPreset)}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left truncate transition-colors cursor-pointer ${
                        izhPreset === p.id
                          ? "bg-slate-800 border-cyan-500/60 text-cyan-300"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Stimulus injection */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-[11px] font-mono text-slate-400">Stimulus Waveform:</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { id: "dc", label: "DC Step" },
                  { id: "pulse", label: "Square" },
                  { id: "sine", label: "Sinusoid" },
                  { id: "poisson", label: "Poisson" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStimulusType(s.id as any)}
                    className={`py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer ${
                      stimulusType === s.id
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Injected Current (I):</span>
                  <span className="text-cyan-400">{currentInjection.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={currentInjection}
                  onChange={(e) => setCurrentInjection(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Synaptic Noise (σ):</span>
                  <span className="text-cyan-400">{noiseLevel.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.2"
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>

            {/* Model Specific Sliders */}
            {modelType === "lif" && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Membrane Time Constant (τm):</span>
                    <span className="text-cyan-400">{lifParams.tau_m} ms</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={lifParams.tau_m}
                    onChange={(e) =>
                      setLifParams({ ...lifParams, tau_m: Number(e.target.value) })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Threshold (Vth):</span>
                    <span className="text-cyan-400">{lifParams.v_thresh} mV</span>
                  </div>
                  <input
                    type="range"
                    min="-60"
                    max="-30"
                    value={lifParams.v_thresh}
                    onChange={(e) =>
                      setLifParams({ ...lifParams, v_thresh: Number(e.target.value) })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Oscilloscope & Phase Plane Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Main Oscilloscope */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Real-Time Action Potential Oscilloscope Vm(t)
              </span>
              <div className="flex items-center gap-3 text-slate-400">
                <span>
                  Firing Rate:{" "}
                  <strong className="text-emerald-400 font-mono">{instantRateHz} Hz</strong>
                </span>
                <span>
                  Total Spikes:{" "}
                  <strong className="text-cyan-400 font-mono">{spikeCount}</strong>
                </span>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              <canvas ref={scopeCanvasRef} width={800} height={260} className="w-full h-64 block" />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Membrane Voltage (mV)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Injected Current I(t)
                </span>
              </div>
              <span>Euler numerical integration (dt = 0.2ms)</span>
            </div>
          </div>

          {/* Phase Plane & Mathematical Formulations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phase Plane Canvas */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span>Phase Plane Orbit (v vs u)</span>
                <span className="text-[10px] text-slate-500">Limit Cycle</span>
              </div>
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <canvas ref={phaseCanvasRef} width={300} height={180} className="w-full h-full block" />
              </div>
              <p className="text-[10px] text-slate-400">
                Shows the non-linear limit cycle trajectory between membrane potential v and recovery variable u.
              </p>
            </div>

            {/* Differential Equations Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3 font-mono text-xs">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                Mathematical Formulation
              </span>

              {modelType === "izhikevich" ? (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-[11px] text-slate-300">
                  <div className="text-cyan-400 font-bold">Izhikevich 2-Variable ODE:</div>
                  <div>dv/dt = 0.04 v² + 5v + 140 - u + I</div>
                  <div>du/dt = a(bv - u)</div>
                  <div className="text-amber-400">
                    if v ≥ {izhParams.v_peak}mV: v ← {izhParams.c}mV, u ← u + {izhParams.d}
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    Combines biological plausibility of Hodgkin-Huxley with computational efficiency of LIF.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-[11px] text-slate-300">
                  <div className="text-cyan-400 font-bold">Leaky Integrate-and-Fire (LIF):</div>
                  <div>τm (dv/dt) = -(v - V_rest) + Rm · I(t)</div>
                  <div className="text-amber-400">
                    if v ≥ {lifParams.v_thresh}mV: v ← {lifParams.v_reset}mV for τ_ref = {lifParams.tau_ref}ms
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    The workhorse model of neuromorphic chips (Intel Loihi, BrainChip Akida, SpiNNaker).
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
