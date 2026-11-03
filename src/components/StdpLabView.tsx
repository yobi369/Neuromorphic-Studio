import { useState, useRef, useEffect } from "react";
import { StdpParams } from "../types";
import { createStdpState, stdpPre, stdpPost, StdpState, StdpParameters } from "../engine/index";
import { spikeAudio } from "../utils/audioSynth";
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Activity,
  Flame,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";

export function StdpLabView() {
  // STDP Parameters
  const [params, setParams] = useState<StdpParams>({
    a_plus: 0.08,
    a_minus: 0.095, // Typically A- > A+ for stability
    tau_plus: 20.0, // ms
    tau_minus: 20.0, // ms
    w_min: 0.0,
    w_max: 1.0,
    w_init: 0.5,
  });

  // Interactive single spike delta t slider
  const [deltaT, setDeltaT] = useState<number>(10.0); // ms
  const [currentWeight, setCurrentWeight] = useState<number>(0.5);
  const stdpStateRef = useRef<StdpState>(createStdpState(0.5));
  const stdpClockRef = useRef(0);
  const bellStateRef = useRef<StdpState>(createStdpState(0.1));
  const bellClockRef = useRef(0);
  const randomRef = useRef(0x4f1bbcdc);
  const nextRandom = () => { let x=randomRef.current; x^=x<<13; x^=x>>>17; x^=x<<5; randomRef.current=x>>>0; return (randomRef.current>>>0)/4294967296; };
  const engineParams = ():StdpParameters => ({aPlus:params.a_plus,aMinus:params.a_minus,tauPlusMs:params.tau_plus,tauMinusMs:params.tau_minus,minWeight:params.w_min,maxWeight:params.w_max});

  // Correlation experiment mode
  const [experimentMode, setExperimentMode] = useState<"manual" | "correlated_train" | "pavlov_conditioning">("manual");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [weightHistory, setWeightHistory] = useState<number[]>([0.5]);

  // Pavlovian Experiment Specifics
  const [pavlovTrials, setPavlovTrials] = useState<number>(0);
  const [bellWeight, setBellWeight] = useState<number>(0.1);
  const [foodWeight] = useState<number>(0.95);
  const [conditionedResponseFired, setConditionedResponseFired] = useState<boolean>(false);

  // Canvases
  const curveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const evolutionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute delta w from delta t
  const calculateDeltaW = (dt: number): number => {
    if (dt > 0) {
      // Pre before Post (Causal) -> LTP Potentiation
      return params.a_plus * Math.exp(-dt / params.tau_plus);
    } else if (dt < 0) {
      // Post before Pre (Anti-causal) -> LTD Depression
      return -params.a_minus * Math.exp(dt / params.tau_minus);
    }
    return 0;
  };

  const manualDeltaW = calculateDeltaW(deltaT);

  // Apply manual single-pair spike
  const handleApplySinglePair = () => {
    const p=engineParams(),t=stdpClockRef.current;
    let next=stdpStateRef.current;
    if(deltaT>0){next=stdpPre(next,p,t);next=stdpPost(next,p,t+deltaT);}
    else if(deltaT<0){next=stdpPost(next,p,t);next=stdpPre(next,p,t+Math.abs(deltaT));}
    stdpStateRef.current=next;stdpClockRef.current=t+Math.abs(deltaT)+1;
    setCurrentWeight(Number(next.weight.toFixed(4)));
    setWeightHistory(prev=>[...prev.slice(-100),next.weight]);
    spikeAudio.playSpike(0.8,deltaT>0?1.2:0.8);
  };

  // Reset experiment
  const handleReset = () => {
    setCurrentWeight(params.w_init);
    stdpStateRef.current=createStdpState(params.w_init);stdpClockRef.current=0;
    bellStateRef.current=createStdpState(0.1);bellClockRef.current=0;randomRef.current=0x4f1bbcdc;
    setWeightHistory([params.w_init]);
    setPavlovTrials(0);
    setBellWeight(0.1);
    setConditionedResponseFired(false);
  };

  // Draw STDP Exponential Curve
  useEffect(() => {
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, w, h);

    // Grid & Zero lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Time window: -60ms to +60ms
    const maxDt = 60;
    const maxDw = Math.max(params.a_plus, params.a_minus) * 1.3;

    const dtToX = (dt: number) => (dt / maxDt) * (w / 2) + w / 2;
    const dwToY = (dw: number) => h / 2 - (dw / maxDw) * (h / 2);

    // 1. Draw LTP region (green gradient)
    ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
    ctx.fillRect(w / 2, 0, w / 2, h / 2);

    // 2. Draw LTD region (red gradient)
    ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
    ctx.fillRect(0, h / 2, w / 2, h / 2);

    // 3. Draw STDP Exponential Curve
    ctx.lineWidth = 2.5;

    // Negative dt (LTD)
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    for (let dt = -maxDt; dt < 0; dt += 0.5) {
      const dw = -params.a_minus * Math.exp(dt / params.tau_minus);
      const px = dtToX(dt);
      const py = dwToY(dw);
      if (dt === -maxDt) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Positive dt (LTP)
    ctx.strokeStyle = "#10b981";
    ctx.beginPath();
    for (let dt = 0.5; dt <= maxDt; dt += 0.5) {
      const dw = params.a_plus * Math.exp(-dt / params.tau_plus);
      const px = dtToX(dt);
      const py = dwToY(dw);
      if (dt === 0.5) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 4. Highlight current selected Delta T point
    const curX = dtToX(deltaT);
    const curY = dwToY(manualDeltaW);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, h / 2);
    ctx.lineTo(curX, curY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = deltaT > 0 ? "#10b981" : "#ef4444";
    ctx.beginPath();
    ctx.arc(curX, curY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Labels
    ctx.font = "10px monospace";
    ctx.fillStyle = "#10b981";
    ctx.fillText("LTP (Potentiation: Pre before Post)", w / 2 + 15, 20);
    ctx.fillStyle = "#ef4444";
    ctx.fillText("LTD (Depression: Post before Pre)", 15, h - 15);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Δt = t_post - t_pre (ms)", w - 140, h / 2 - 8);
    ctx.fillText("ΔW (Weight Delta)", w / 2 + 8, 15);
  }, [params, deltaT, manualDeltaW]);

  // Correlated spike pairs update the same trace-based STDP engine used by regression tests.
  useEffect(() => {
    if (experimentMode !== "correlated_train" || !isSimulating) return;
    const interval = setInterval(() => {
      const p=engineParams(),dt=12+(nextRandom()-0.5)*16,t=stdpClockRef.current;
      let next=stdpStateRef.current;
      if(dt>=0){next=stdpPre(next,p,t);next=stdpPost(next,p,t+dt);}
      else{next=stdpPost(next,p,t);next=stdpPre(next,p,t+Math.abs(dt));}
      stdpStateRef.current=next;stdpClockRef.current=t+Math.abs(dt)+20;
      setCurrentWeight(Number(next.weight.toFixed(4)));
      setWeightHistory(hist=>[...hist.slice(-120),next.weight]);
      spikeAudio.playSpike(0.4,1.1);
    },120);
    return ()=>clearInterval(interval);
  },[experimentMode,isSimulating,params]);

  // Draw Weight Evolution History
  useEffect(() => {
    const canvas = evolutionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += h / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Weight range 0.0 to 1.0
    const wToY = (weight: number) => h - (weight / 1.0) * (h - 20) - 10;

    // Draw trace
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const pts = weightHistory;
    const stepX = w / Math.max(20, pts.length - 1);

    for (let i = 0; i < pts.length; i++) {
      const x = i * stepX;
      const y = wToY(pts[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Min and Max dashed lines
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, wToY(1.0));
    ctx.lineTo(w, wToY(1.0));
    ctx.moveTo(0, wToY(0.0));
    ctx.lineTo(w, wToY(0.0));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "10px monospace";
    ctx.fillStyle = "#64748b";
    ctx.fillText("W_max = 1.0", 10, wToY(1.0) + 12);
    ctx.fillText("W_min = 0.0", 10, wToY(0.0) - 4);
  }, [weightHistory]);

  // Pavlov Experiment Action
  const triggerPavlovTrial = (type: "bell_only" | "pair_bell_food" | "food_only") => {
    if (type === "pair_bell_food") {
      // Bell fires 10ms before Food -> STDP strengthens Bell synapse!
      const dt = 10;
      const dw = calculateDeltaW(dt) * 2.0; // Accelerated demonstration
      const newBellW = Math.min(1.0, bellWeight + dw);
      setBellWeight(Number(newBellW.toFixed(3)));
      setPavlovTrials((prev) => prev + 1);
      setConditionedResponseFired(true);
      spikeAudio.playSpike(0.9, 1.3);
    } else if (type === "bell_only") {
      // If Bell synapse strong enough (>0.6), trigger salivation
      if (bellWeight >= 0.55) {
        setConditionedResponseFired(true);
        spikeAudio.playSpike(0.8, 1.2);
      } else {
        setConditionedResponseFired(false);
      }
    } else if (type === "food_only") {
      setConditionedResponseFired(true);
      spikeAudio.playSpike(0.7, 1.0);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
              PHASE 04
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              STDP Synaptic Plasticity & Biological Learning Lab
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Spike-Timing-Dependent Plasticity (STDP) Hebbian adaptation: millisecond causal learning without backprop.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Synapses</span>
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: "manual", label: "Single Spike-Pair Explorer" },
          { id: "correlated_train", label: "Continuous Correlated Spike Train" },
          { id: "pavlov_conditioning", label: "Pavlovian Associative Conditioning" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setExperimentMode(m.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              experimentMode === m.id
                ? "bg-cyan-500/20 border border-cyan-500/60 text-cyan-300"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Single Pair Explorer & Tab 2: Correlated Spike Train */}
      {experimentMode !== "pavlov_conditioning" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                STDP Window Parameters
              </span>

              {/* Delta T slider (Manual Mode) */}
              {experimentMode === "manual" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                      <span>Spike Timing (Δt = t_post - t_pre):</span>
                      <span className={deltaT > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {deltaT > 0 ? `+${deltaT.toFixed(1)}` : deltaT.toFixed(1)} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={deltaT}
                      onChange={(e) => setDeltaT(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-0.5">
                      <span>-50ms (Post first - LTD)</span>
                      <span>+50ms (Pre first - LTP)</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Calculated ΔW:</span>
                      <span className={manualDeltaW > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                        {manualDeltaW > 0 ? `+${manualDeltaW.toFixed(4)}` : manualDeltaW.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Current Synaptic Weight:</span>
                      <span className="text-cyan-400 font-bold">{currentWeight.toFixed(4)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleApplySinglePair}
                    className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Fire Spike Pair & Update Weight</span>
                  </button>
                </div>
              )}

              {/* Continuous Correlated Controls */}
              {experimentMode === "correlated_train" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    Pre and Post neurons fire Poisson spike trains with a causal correlation bias (+12ms delay).
                  </p>
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      isSimulating
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                        : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                    }`}
                  >
                    {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isSimulating ? "Pause Spike Train" : "Run Correlated Spike Train"}</span>
                  </button>
                </div>
              )}

              {/* Amplitude and Tau Sliders */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>LTP Amplitude (A+):</span>
                    <span className="text-emerald-400">{params.a_plus.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.15"
                    step="0.005"
                    value={params.a_plus}
                    onChange={(e) => setParams({ ...params, a_plus: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>LTD Amplitude (A-):</span>
                    <span className="text-red-400">{params.a_minus.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.15"
                    step="0.005"
                    value={params.a_minus}
                    onChange={(e) => setParams({ ...params, a_minus: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Decay Constant (τ+ / τ-):</span>
                    <span className="text-cyan-400">{params.tau_plus.toFixed(0)} ms</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="2"
                    value={params.tau_plus}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        tau_plus: Number(e.target.value),
                        tau_minus: Number(e.target.value),
                      })
                    }
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visualization Column */}
          <div className="lg:col-span-8 space-y-4">
            {/* STDP Learning Window Curve */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-2 shadow-lg shadow-cyan-950/20">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  STDP Learning Window Function (Bi & Poo, 1998)
                </span>
                <span className="text-[10px] text-slate-400">ΔW vs (t_post - t_pre)</span>
              </div>
              <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <canvas ref={curveCanvasRef} width={600} height={200} className="w-full h-52 block" />
              </div>
            </div>

            {/* Weight Evolution Graph */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Synaptic Weight Trajectory W(t)
                </span>
                <span className="text-emerald-400 font-bold">W = {currentWeight.toFixed(3)}</span>
              </div>
              <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <canvas
                  ref={evolutionCanvasRef}
                  width={600}
                  height={120}
                  className="w-full h-32 block"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pavlovian Associative Conditioning Demonstration */}
      {experimentMode === "pavlov_conditioning" && (
        <div className="p-6 rounded-2xl border border-cyan-500/30 bg-slate-900/60 space-y-6">
          <div className="max-w-3xl space-y-2">
            <h3 className="text-lg font-bold text-white">
              Classical Conditioning via On-Chip STDP Learning
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Demonstrates biological associative learning in silicon. The Unconditioned Stimulus (Food)
              reliably triggers Salivation via a fixed strong synapse (W = {foodWeight}). The Conditioned
              Stimulus (Bell) begins with a weak synapse (W = {bellWeight.toFixed(2)}). By repeatedly pairing Bell
              with Food within the causal STDP window (+10ms), the Bell synapse potentiates!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stimulus 1: Bell (CS) */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-sky-400">Conditioned Stimulus (Bell)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                  CS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auditory tone initially decoupled from motor output.
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Synaptic Weight:</span>
                  <span className={bellWeight >= 0.55 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {bellWeight.toFixed(3)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${bellWeight * 100}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => triggerPavlovTrial("bell_only")}
                className="w-full py-2 rounded-lg bg-sky-500/20 border border-sky-500/60 text-sky-300 hover:bg-sky-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Ring Bell Alone (Test CS)
              </button>
            </div>

            {/* Stimulus 2: Food (US) */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-400">Unconditioned Stimulus (Food)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  US
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Innate biological reflex that always evokes salivation.
              </p>
              <div className="pt-2 border-t border-slate-800 space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Innate Weight:</span>
                  <span className="text-emerald-400 font-bold">{foodWeight.toFixed(2)} (Fixed)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: "95%" }} />
                </div>
              </div>
              <button
                onClick={() => triggerPavlovTrial("food_only")}
                className="w-full py-2 rounded-lg bg-amber-500/20 border border-amber-500/60 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Present Food Alone (US)
              </button>
            </div>

            {/* Output: Motor Salivation Neuron */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-950 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-emerald-400">Motor Response (Salivation)</span>
                  <span className="text-xs font-mono text-slate-400">Reflex</span>
                </div>
                <div className="mt-4 flex items-center justify-center p-4 rounded-xl border border-slate-800 bg-slate-900/80">
                  {conditionedResponseFired ? (
                    <div className="text-center space-y-1">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-emerald-400 font-mono block">
                        ACTION POTENTIAL FIRED!
                      </span>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500 text-xs py-3">
                      Subthreshold (No Salivation)
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => triggerPavlovTrial("pair_bell_food")}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Pair Bell + Food (STDP Learning Trial #{pavlovTrials + 1})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
