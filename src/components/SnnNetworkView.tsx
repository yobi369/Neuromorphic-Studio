import { useState, useRef, useEffect } from "react";
import { SnnNeuron, SnnSynapse } from "../types";
import { HeterogeneousNetwork, seededRandom } from "../engine/network";
import { spikeAudio } from "../utils/audioSynth";
import {
  Network,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Sliders,
  Sparkles,
  Layers,
  Radio,
} from "lucide-react";

export function SnnNetworkView() {
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [topologyType, setTopologyType] = useState<"feedforward" | "recurrent_reservoir" | "ring_attractor">("recurrent_reservoir");
  const [inputStimulus, setInputStimulus] = useState<"wave" | "sparse_poisson" | "burst_ch1" | "none">("wave");
  const [synapticWeightScale, setSynapticWeightScale] = useState<number>(1.2);
  const [inhibitoryRatio, setInhibitoryRatio] = useState<number>(25); // 20-30% Dale's Law

  // Metrics
  const [totalNetworkSpikes, setTotalNetworkSpikes] = useState<number>(0);
  const [meanFiringRateHz, setMeanFiringRateHz] = useState<number>(0);
  const [currentSparsity, setCurrentSparsity] = useState<number>(0);
  const [synapticOpsCount, setSynapticOpsCount] = useState<number>(0);

  // Network State
  const networkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rasterCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const neuronsRef = useRef<SnnNeuron[]>([]);
  const synapsesRef = useRef<SnnSynapse[]>([]);
  const rasterDataRef = useRef<Array<{ id: number; time: number }>>([]);
  const animIdRef = useRef<number>(0);
  const lastSpikeCounterRef = useRef<number>(0);
  const lastRateTimeRef = useRef<number>(performance.now());
  const networkRef = useRef<HeterogeneousNetwork | null>(null);
  const stimulusRngRef = useRef<(() => number)>(seededRandom(20261104));
  const accumulatorRef = useRef(0);

  // Initialize Network Topology
  const initTopology = () => {
    const neurons: SnnNeuron[] = [];
    const synapses: SnnSynapse[] = [];

    const numInput = 8;
    const numHidden = 16;
    const numOutput = 4;

    let idCounter = 0;
    const rng = seededRandom(20261103);
    const hiddenIds = Array.from({length:numHidden},(_,i)=>numInput+i);
    const inhibitoryIds = new Set(hiddenIds.filter(()=>rng()<inhibitoryRatio/100));
    stimulusRngRef.current = seededRandom(20261104);
    accumulatorRef.current = 0;

    // 1. Input Layer
    for (let i = 0; i < numInput; i++) {
      neurons.push({
        id: idCounter++,
        layer: "input",
        x: 60,
        y: 40 + i * 36,
        v: -70,
        threshold: -50,
        spiked: false,
        spikeHistory: [],
        label: `In ${i + 1}`,
      });
    }

    // 2. Hidden Layer (arranged in 2 columns of 8 or a circle)
    for (let i = 0; i < numHidden; i++) {
      const col = i < 8 ? 0 : 1;
      const row = i % 8;
      neurons.push({
        id: idCounter++,
        layer: "hidden",
        x: 180 + col * 90,
        y: 40 + row * 36,
        v: -70,
        threshold: -50,
        spiked: false,
        spikeHistory: [],
        label: `H ${i + 1}`,
      });
    }

    // 3. Output Layer
    const outputLabels = ["Class A", "Class B", "Class C", "Class D"];
    for (let i = 0; i < numOutput; i++) {
      neurons.push({
        id: idCounter++,
        layer: "output",
        x: 390,
        y: 80 + i * 50,
        v: -70,
        threshold: -50,
        spiked: false,
        spikeHistory: [],
        label: outputLabels[i],
      });
    }

    // Connect Input to Hidden
    for (let inp = 0; inp < numInput; inp++) {
      for (let hid = numInput; hid < numInput + numHidden; hid++) {
        if (rng() < 0.45) {
          synapses.push({
            fromId: inp,
            toId: hid,
            weight: 0.8 + rng() * 0.8,
            delayMs: 1 + rng() * 2,
            lastActive: -999,
          });
        }
      }
    }

    // Recurrent topology: source-neuron identity fixes outgoing sign (Dale's law).
    if (topologyType === "recurrent_reservoir") {
      for (const from of hiddenIds) for (const to of hiddenIds) {
        if (from !== to && rng() < 0.28) {
          const inhibitory = inhibitoryIds.has(from);
          const weight = inhibitory ? -(0.9 + rng()*1.2) : (0.6 + rng()*0.8);
          synapses.push({fromId:from,toId:to,weight,delayMs:1+rng()*3,lastActive:-999});
        }
      }
    } else if (topologyType === "ring_attractor") {
      for (let i=0;i<hiddenIds.length;i++) for (const offset of [1,2]) {
        const from=hiddenIds[i],to=hiddenIds[(i+offset)%hiddenIds.length],inhibitory=inhibitoryIds.has(from);
        const weight=inhibitory?-(0.9+rng()*1.2):(0.6+rng()*0.8);
        synapses.push({fromId:from,toId:to,weight,delayMs:1+rng()*2,lastActive:-999});
      }
    }

    // Hidden to Output
    for (let hid = numInput; hid < numInput + numHidden; hid++) {
      for (let out = numInput + numHidden; out < neurons.length; out++) {
        if (rng() < 0.5) {
          const inhibitory = inhibitoryIds.has(hid);
          synapses.push({
            fromId: hid,
            toId: out,
            weight: inhibitory ? -(0.7 + rng() * 1.0) : (0.7 + rng() * 1.0),
            delayMs: 1 + rng() * 2,
            lastActive: -999,
          });
        }
      }
    }

    neuronsRef.current = neurons;
    synapsesRef.current = synapses;
    const engineNeurons = neurons.map(n=>({id:n.id,model:"lif" as const,state:{voltageMv:-70,refractoryRemainingMs:0},parameters:{tauM:n.layer==="input"?10:20,resistanceMOhm:100,restMv:-70,resetMv:-65,thresholdMv:-50,refractoryMs:2}}));
    const engineConnections = synapses.map((syn,index)=>({id:"syn-"+index,from:syn.fromId,to:syn.toId,weight:syn.weight*1000*synapticWeightScale,delayMs:syn.delayMs}));
    networkRef.current = new HeterogeneousNetwork(engineNeurons,engineConnections);
    rasterDataRef.current = [];
    setTotalNetworkSpikes(0);
    setMeanFiringRateHz(0);
    setCurrentSparsity(0);
    setSynapticOpsCount(0);
    lastSpikeCounterRef.current=0;
    lastRateTimeRef.current=performance.now();
  };

  useEffect(() => {
    initTopology();
  }, [topologyType, inhibitoryRatio, synapticWeightScale]);

  // Main SNN Simulation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(32, currentTime - lastTime);
      lastTime = currentTime;

      if (!isSimulating) {
        animIdRef.current = requestAnimationFrame(loop);
        return;
      }

      const neurons = neuronsRef.current;
      const synapses = synapsesRef.current;
      const engine = networkRef.current;
      if (!engine || dt <= 0) { animIdRef.current = requestAnimationFrame(loop); return; }

      accumulatorRef.current += dt;
      let frameSpikes = 0;
      let frameSops = 0;
      const activeIds = new Set<number>();
      let substeps = 0;

      // Fixed 1 ms simulation steps make the UI independent of display refresh rate.
      while (accumulatorRef.current >= 1 && substeps < 32) {
        const spikes = engine.advance(1, 1, (timeMs) => {
          const currents = new Map<number,number>();
          for (const n of neurons) {
            if (n.layer !== "input") continue;
            let injected = 0;
            if (inputStimulus === "wave") injected = Math.max(0,Math.sin(timeMs*0.003+n.id*0.8)*16-2);
            else if (inputStimulus === "sparse_poisson") injected = stimulusRngRef.current()<0.06?18:0;
            else if (inputStimulus === "burst_ch1" && (n.id===0||n.id===1)) injected = timeMs%600<120?22:0;
            if (injected>0) currents.set(n.id,injected*100); // nA scenario drive converted to pA
          }
          return currents;
        });
        for (const spike of spikes) {
          frameSpikes++;
          activeIds.add(spike.neuronId);
          rasterDataRef.current.push({id:spike.neuronId,time:spike.timeMs});
          const visualNeuron=neurons.find(n=>n.id===spike.neuronId);
          if(visualNeuron){visualNeuron.spikeHistory.push(spike.timeMs);if(visualNeuron.spikeHistory.length>1000)visualNeuron.spikeHistory.shift();}
          for(const syn of synapses)if(syn.fromId===spike.neuronId){syn.lastActive=spike.timeMs;frameSops++;}
        }
        accumulatorRef.current-=1;
        substeps++;
      }

      for (const n of neurons) {
        n.spiked=activeIds.has(n.id);
        const state=engine.getState(n.id);
        n.v=state.voltageMv;
      }

      if (frameSpikes > 0) spikeAudio.playSpike(Math.min(1.0,frameSpikes/6),1.0);
      lastSpikeCounterRef.current += frameSpikes;
      setTotalNetworkSpikes(prev=>prev+frameSpikes);
      setSynapticOpsCount(prev=>prev+frameSops);
      const t=engine.timeMs;

      // Keep only last 4 seconds of raster data
      const cutoff = t - 4000;
      if (rasterDataRef.current.length > 0 && rasterDataRef.current[0].time < cutoff) {
        rasterDataRef.current = rasterDataRef.current.filter((d) => d.time >= cutoff);
      }

      // Update rate every 300ms
      if (currentTime - lastRateTimeRef.current >= 300) {
        const deltaSec = (currentTime - lastRateTimeRef.current) / 1000;
        const rate = Math.round(lastSpikeCounterRef.current / (deltaSec * neurons.length));
        setMeanFiringRateHz(rate);
        const activePct = (activeIds.size / neurons.length) * 100;
        setCurrentSparsity(Number((100 - activePct).toFixed(1)));
        lastSpikeCounterRef.current = 0;
        lastRateTimeRef.current = currentTime;
      }

      // 3. Render Network Visual Graph
      const netCanvas = networkCanvasRef.current;
      if (netCanvas) {
        const ctx = netCanvas.getContext("2d");
        if (ctx) {
          const w = netCanvas.width;
          const h = netCanvas.height;

          ctx.fillStyle = "#030712";
          ctx.fillRect(0, 0, w, h);

          // Draw Synapses
          synapses.forEach((syn) => {
            const from = neurons.find((n) => n.id === syn.fromId);
            const to = neurons.find((n) => n.id === syn.toId);
            if (!from || !to) return;

            const timeSinceSpike = t - syn.lastActive;
            const isExciting = syn.weight > 0;

            if (timeSinceSpike < 150) {
              // Active action potential travelling down axon
              ctx.strokeStyle = isExciting ? "#00ffcc" : "#ff3366";
              ctx.lineWidth = 2.2;
            } else {
              ctx.strokeStyle = isExciting
                ? "rgba(56, 189, 248, 0.12)"
                : "rgba(244, 63, 94, 0.12)";
              ctx.lineWidth = 0.8;
            }

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
          });

          // Draw Neurons
          neurons.forEach((n) => {
            const chargeNorm = Math.max(0, Math.min(1, (n.v + 70) / 20));

            // Outer halo when spiking
            if (n.spiked) {
              ctx.fillStyle = "rgba(0, 255, 204, 0.8)";
              ctx.beginPath();
              ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
              ctx.fill();
            }

            // Neuron soma
            ctx.fillStyle = n.layer === "input"
              ? "#0284c7"
              : n.layer === "hidden"
              ? `rgba(${Math.floor(chargeNorm * 255)}, ${Math.floor(180 + chargeNorm * 75)}, 240, 0.9)`
              : "#059669";

            ctx.beginPath();
            ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Border
            ctx.strokeStyle = n.spiked ? "#ffffff" : "#334155";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = "9px monospace";
            ctx.fillStyle = "#94a3b8";
            if (n.layer === "input") {
              ctx.fillText(n.label || "", n.x - 38, n.y + 3);
            } else if (n.layer === "output") {
              ctx.fillText(n.label || "", n.x + 12, n.y + 3);
            }
          });
        }
      }

      // 4. Render Live Raster Plot
      const rCanvas = rasterCanvasRef.current;
      if (rCanvas) {
        const rctx = rCanvas.getContext("2d");
        if (rctx) {
          const rw = rCanvas.width;
          const rh = rCanvas.height;

          rctx.fillStyle = "#030712";
          rctx.fillRect(0, 0, rw, rh);

          // Grid lines for neuron channels
          rctx.strokeStyle = "#111827";
          rctx.lineWidth = 1;
          const yStep = rh / neurons.length;

          for (let i = 0; i < neurons.length; i += 4) {
            rctx.beginPath();
            rctx.moveTo(0, i * yStep);
            rctx.lineTo(rw, i * yStep);
            rctx.stroke();
          }

          // Render spike events
          rctx.fillStyle = "#00ffcc";
          const windowMs = 3000;

          rasterDataRef.current.forEach((sp) => {
            const ageMs = t - sp.time;
            if (ageMs <= windowMs) {
              const x = rw - (ageMs / windowMs) * rw;
              const y = sp.id * yStep + yStep / 2;

              // Color code by layer
              if (sp.id < 8) rctx.fillStyle = "#38bdf8"; // Input: Sky
              else if (sp.id < 24) rctx.fillStyle = "#00ffcc"; // Hidden: Cyan
              else rctx.fillStyle = "#34d399"; // Output: Emerald

              rctx.fillRect(x - 1, y - 2, 2.5, 5);
            }
          });

          // Current time needle
          rctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
          rctx.setLineDash([2, 2]);
          rctx.beginPath();
          rctx.moveTo(rw - 2, 0);
          rctx.lineTo(rw - 2, rh);
          rctx.stroke();
          rctx.setLineDash([]);
        }
      }

      animIdRef.current = requestAnimationFrame(loop);
    };

    animIdRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animIdRef.current);
  }, [
    isSimulating,
    inputStimulus,
    synapticWeightScale,
    topologyType,
    inhibitoryRatio,
  ]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
              PHASE 03
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Spiking Neural Network (SNN) & Multi-Channel Raster Plot
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Asynchronous event-driven spike propagation across recurrent biological reservoirs and output classifiers.
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
            <span>{isSimulating ? "Pause SNN" : "Resume SNN"}</span>
          </button>

          <button
            onClick={initTopology}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Weights</span>
          </button>
        </div>
      </div>

      {/* Main SNN Canvas + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              Network Architecture
            </span>

            {/* Topology Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400">Connectivity Topology:</label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: "recurrent_reservoir", label: "Recurrent Reservoir (LSM)" },
                  { id: "feedforward", label: "Pure Feedforward Classifier" },
                  { id: "ring_attractor", label: "Inhibitory Ring Attractor" },
                ].map((top) => (
                  <button
                    key={top.id}
                    onClick={() => setTopologyType(top.id as any)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                      topologyType === top.id
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {top.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Stimulus Modes */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-[11px] font-mono text-slate-400">Sensory Input Drive:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "wave", label: "Traveling Wave" },
                  { id: "sparse_poisson", label: "Poisson Noise" },
                  { id: "burst_ch1", label: "Channel 1 Burst" },
                  { id: "none", label: "Quiet (0 Input)" },
                ].map((stm) => (
                  <button
                    key={stm.id}
                    onClick={() => setInputStimulus(stm.id as any)}
                    className={`px-2.5 py-1.5 rounded text-[11px] font-medium border text-left truncate transition-colors cursor-pointer ${
                      inputStimulus === stm.id
                        ? "bg-slate-800 border-cyan-500/60 text-cyan-300"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {stm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Synaptic Gain (W):</span>
                  <span className="text-cyan-400">{synapticWeightScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={synapticWeightScale}
                  onChange={(e) => setSynapticWeightScale(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Inhibitory Ratio (Dale):</span>
                  <span className="text-cyan-400">{inhibitoryRatio}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={inhibitoryRatio}
                  onChange={(e) => setInhibitoryRatio(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* SNN Telemetry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Sparsity Rate</div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5">
                {currentSparsity}%
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Population Rate</div>
              <div className="text-lg font-extrabold text-cyan-400 font-mono mt-0.5">
                {meanFiringRateHz} <span className="text-xs font-normal">Hz</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80 col-span-2">
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                Synaptic Operations (SOPs)
              </div>
              <div className="text-xl font-extrabold text-teal-300 font-mono mt-0.5">
                {synapticOpsCount.toLocaleString()}{" "}
                <span className="text-xs font-normal text-slate-400">events</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Zero multiplication FLOPs required — simple memory lookups & additions.
              </p>
            </div>
          </div>
        </div>

        {/* Network Graph & Raster Plot Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* SNN Topology Visualizer */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-2 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                Live Spiking Topology (28 Neurons, 84 Synapses)
              </span>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2 h-2 rounded-full bg-sky-400" /> In (8)
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Hidden (16)
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Out (4)
                </span>
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              <canvas
                ref={networkCanvasRef}
                width={480}
                height={320}
                className="w-full h-72 object-contain block"
              />
            </div>
          </div>

          {/* Multi-Channel Raster Plot */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Spike Raster Plot (Neuron ID vs Time Window - 3.0s)
              </span>
              <span className="text-[10px] text-slate-500">Real-Time Event Train</span>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              <canvas
                ref={rasterCanvasRef}
                width={600}
                height={140}
                className="w-full h-36 block"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
              <span>← -3.0 seconds</span>
              <span className="text-emerald-400 font-bold">Current (t = 0ms) →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
