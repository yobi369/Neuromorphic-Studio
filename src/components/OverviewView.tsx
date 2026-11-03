import { TabMode } from "../types";
import {
  Camera,
  Activity,
  Network,
  Zap,
  Cpu,
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  Flame,
  Radio,
  Clock,
  BatteryCharging,
  Gauge,
  Workflow,
  Lightbulb,
  CreditCard,
  ShieldCheck,
  Rocket,
  Share2,
} from "lucide-react";

interface OverviewViewProps {
  onNavigate: (tab: TabMode) => void;
  onOpenPricing?: () => void;
  onOpenShare?: () => void;
}

export function OverviewView({ onNavigate, onOpenPricing, onOpenShare }: OverviewViewProps) {
  const steps = [
    {
      step: 1,
      name: "Sense Events",
      icon: Camera,
      desc: "Bio-inspired sensors (DVS event cameras, silicon cochleas) record microsecond changes, discarding redundant static frames.",
      target: "dvs_encoder" as TabMode,
      tag: "Asynchronous AER",
    },
    {
      step: 2,
      name: "Encode Spikes",
      icon: Radio,
      desc: "Continuous analog inputs are transformed into discrete all-or-none spike trains via Rate Coding, Delta Modulation, or TTFS.",
      target: "dvs_encoder" as TabMode,
      tag: "Temporal Sparsity",
    },
    {
      step: 3,
      name: "Process in SNN",
      icon: Network,
      desc: "Massively parallel Leaky Integrate-and-Fire (LIF) and Izhikevich neurons integrate synaptic currents over time.",
      target: "snn_network" as TabMode,
      tag: "Event-Driven SOPs",
    },
    {
      step: 4,
      name: "Learn & Infer",
      icon: Zap,
      desc: "Synapses adapt via Spike-Timing-Dependent Plasticity (STDP) and surrogate gradient backpropagation.",
      target: "stdp_lab" as TabMode,
      tag: "Hebbian Plasticity",
    },
    {
      step: 5,
      name: "Trigger Action",
      icon: Bot,
      desc: "Output decision populations trigger immediate physical actions and robotic motor reflexes with sub-millisecond latency.",
      target: "robotics_control" as TabMode,
      tag: "Closed-Loop Reflex",
    },
  ];

  const keyFeatures = [
    {
      title: "Low Power & Zero Idle Drain",
      desc: "Compute occurs ONLY when an event or spike happens. Inactive neurons consume negligible static power (sub-milliwatts).",
      icon: BatteryCharging,
      stat: "100x-1000x Less Energy",
    },
    {
      title: "Event-Driven Dynamics",
      desc: "Free from artificial clock cycles and rigid video frames. Reacts to asynchronous microsecond physical motion in real time.",
      icon: Clock,
      stat: "< 1ms Response Time",
    },
    {
      title: "Massive Neuromorphic Parallelism",
      desc: "Co-located memory and compute eliminates the von Neumann bottleneck. Millions of synapses update in parallel.",
      icon: Layers,
      stat: "Zero Bus Stalls",
    },
    {
      title: "Online On-Chip Learning",
      desc: "Spike-Timing-Dependent Plasticity (STDP) allows edge systems to adapt continuously without heavy cloud retraining.",
      icon: Flame,
      stat: "Local Hebbian Adaptation",
    },
    {
      title: "Sensory Efficiency",
      desc: "DVS event cameras transmit only pixel changes (AER format), reducing bandwidth and data storage by over 95%.",
      icon: Gauge,
      stat: "95%+ Data Compression",
    },
    {
      title: "Edge & Robotic Intelligence",
      desc: "Ideal for battery-operated IoT, autonomous drones, prosthetics, and space robotics operating under strict SWaP constraints.",
      icon: Bot,
      stat: "SWaP-C Optimized",
    },
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Hero Banner with Cyber-Neuromorphic Infographic Accent */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-6 sm:p-10 shadow-2xl shadow-cyan-950/30">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/40 bg-cyan-950/60 text-cyan-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>FRINGE CODING SERIES — NEUROMORPHIC COMPUTING</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Think like neurons.{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
              Compute with events.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-3xl">
            Neuromorphic computing is a revolutionary paradigm inspired by the human brain. Using
            Spiking Neural Networks (SNNs) and asynchronous event-driven processing, it achieves
            groundbreaking energy efficiency, sub-millisecond reaction times, and edge intelligence.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate("dvs_encoder")}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Live DVS Camera</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate("hardware_profiler")}
              className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-medium text-sm hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>SOPs vs FLOPs Silicon Profiler</span>
            </button>

            <button
              onClick={() => onNavigate("robotics_control")}
              className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-medium text-sm hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Reflex Robotics Sandbox</span>
            </button>

            {onOpenShare && (
              <button
                onClick={onOpenShare}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950 to-slate-900 border border-cyan-400/60 hover:border-cyan-300 text-cyan-300 font-semibold text-sm hover:bg-slate-850 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-950/40"
              >
                <Rocket className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>Share &amp; Launch</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 02 HOW IT WORKS: The 5-Step Pipeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold">
              02
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              HOW IT WORKS: The 5-Phase Neuromorphic Pipeline
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline-block">
            Click any phase to inspect in real-time
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={s.step}
                onClick={() => onNavigate(s.target)}
                className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-900 transition-all cursor-pointer shadow-sm hover:shadow-cyan-500/10"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-cyan-400">
                      STEP 0{s.step}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {s.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-800/80 mt-3">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400">
                    {s.tag}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison: Conventional AI (ANNs) vs Neuromorphic Computing (SNNs) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
            VS
          </span>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Architectural Paradigm Shift: Von Neumann vs Neuromorphic
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Traditional ANN / GPU */}
          <div className="p-5 rounded-xl border border-red-900/30 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-red-400 font-mono">
                CONVENTIONAL AI (ANN / GPU)
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/40">
                Clock-Synchronous & Dense
              </span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                <span>
                  <strong>Frame-Based:</strong> Processes 30–60 full visual frames/sec regardless of scene stillness, wasting 95% bandwidth.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                <span>
                  <strong>Dense FLOPs:</strong> Performs millions of 32-bit floating-point Multiply-Accumulate (MAC) operations on every cycle.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                <span>
                  <strong>Memory Bottleneck:</strong> Continuous shuttling of weights between RAM and compute cores creates high latency and heat.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">✕</span>
                <span>
                  <strong>High Power Drain:</strong> Consumes 15W to 350W+ continuous power, requiring active cooling fans and battery drain.
                </span>
              </li>
            </ul>
          </div>

          {/* Neuromorphic SNN */}
          <div className="p-5 rounded-xl border border-emerald-500/40 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-400 font-mono">
                NEUROMORPHIC COMPUTING (SNN)
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                Event-Driven & Sparse
              </span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Event-Driven Asynchronous:</strong> Computes only when physical intensity changes, preserving ultra-high temporal resolution.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Sparse Synaptic Ops (SOPs):</strong> Spikes are binary 1-bit events; synapses perform simple additions instead of heavy multiplications.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Collocated Memory & Compute:</strong> In-memory compute cores mimic biological dendrites with zero bus stalls.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ultra-Low Sub-Milliwatt Power:</strong> Dynamic energy scaled in picojoules (pJ/SOP). Always-on edge battery life measured in months.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 05 KEY FEATURES */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold">
            05
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            Key Advantages of Neuromorphic Silicon
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {keyFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">
                    {feat.stat}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 03 & 06 ECOSYSTEM: Frameworks, Hardware & Target Audience */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What You Need (Frameworks & Hardware) */}
        <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold">
              03
            </span>
            <h3 className="text-base font-bold text-white">
              Ecosystem: Frameworks & Neuromorphic Hardware
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
              <Cpu className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200">Hardware Targets:</span>
                <p className="text-slate-400 mt-0.5">
                  Intel Loihi 2 (1M neurons, 120M synapses, Lava), BrainChip Akida (MetaTF),
                  SpiNNaker 2, IBM TrueNorth, SynSense Dynap-CNN.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
              <Workflow className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200">Software & Simulation:</span>
                <p className="text-slate-400 mt-0.5">
                  snnTorch (PyTorch surrogate gradients), Brian2 (biophysical modeling),
                  Nengo (neural engineering), Norse, and Lava Open-Source.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
              <Camera className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold text-slate-200">Event-Based Sensors:</span>
                <p className="text-slate-400 mt-0.5">
                  Prophesee Metavision DVS, IniVation DAVIS, Zurich Silicon Cochlea,
                  e-Skin tactile arrays emitting Address Event Representation (AER).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 06 Who Needs It? */}
        <section className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold">
              06
            </span>
            <h3 className="text-base font-bold text-white">
              Who Needs Neuromorphic Technology?
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-semibold text-cyan-300">Robotics Engineers</span>
              <p className="text-slate-400">
                Ultra-fast visual servoing, millisecond obstacle avoidance, and adaptive joint controllers.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-semibold text-emerald-300">IoT & Wearables</span>
              <p className="text-slate-400">
                Always-on acoustic keyword spotting and continuous ECG/EEG arrhythmia monitors on button batteries.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-semibold text-amber-300">Autonomous Drones</span>
              <p className="text-slate-400">
                Zero motion blur navigation in high-speed flight under dynamic lighting conditions.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-semibold text-purple-300">Neuroscientists</span>
              <p className="text-slate-400">
                Testing hypotheses on cortical computation, STDP synaptic plasticity, and working memory.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Commercial Subscription & Lab Tier Callout */}
      <div className="p-6 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/60 shadow-xl shadow-cyan-950/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              COMMERCIAL TIERS &amp; LICENSING
            </span>
            <span className="text-xs text-emerald-400 font-semibold font-mono">
              Ready for Academic &amp; Defense Deployment
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <span>Commercial Subscriptions &amp; Silicon Hardware Compilers</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unlock node-locked Intel Loihi 2 Lava exporters, high-precision C++ microcode generators,
            and real-time Hardware-In-The-Loop physical sensor bridges with zero model royalties.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
              <span className="text-[10px] block text-slate-500">COMMUNITY</span>
              <span className="text-slate-300 font-bold">$0</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-center">
              <span className="text-[10px] block text-cyan-400">PRO RESEARCH</span>
              <span className="text-cyan-200 font-bold">$49/mo</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-center">
              <span className="text-[10px] block text-emerald-400">ENTERPRISE</span>
              <span className="text-emerald-200 font-bold">$299/mo</span>
            </div>
          </div>

          <button
            onClick={onOpenPricing}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>View Subscription &amp; Tier Pricing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Quick Launch Bar */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-white">
              Ready for the Interactive Laboratories?
            </h4>
            <p className="text-xs text-slate-300">
              Explore live DVS event cameras, simulate biological LIF/Izhikevich neurons, or benchmark Intel Loihi 2.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate("neuron_models")}
            className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 transition-colors cursor-pointer"
          >
            Neuron Models
          </button>
          <button
            onClick={() => onNavigate("snn_network")}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 font-semibold text-xs hover:bg-slate-700 transition-colors cursor-pointer"
          >
            SNN Network
          </button>
          <button
            onClick={() => onNavigate("ai_architect")}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold text-xs hover:bg-teal-500 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>
        </div>
      </div>
    </div>
  );
}
