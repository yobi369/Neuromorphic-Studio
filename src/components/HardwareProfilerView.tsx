import { useState } from "react";
import { HardwareSpec } from "../types";
import { NeuromorphicRoiCalculator } from "./NeuromorphicRoiCalculator";
import { BenchmarkEvaluator } from "./BenchmarkEvaluator";
import {
  Cpu,
  Zap,
  BatteryCharging,
  Gauge,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingDown,
  FileText,
  Sparkles,
  TrendingUp,
  Award,
} from "lucide-react";

export function HardwareProfilerView() {
  const [subTab, setSubTab] = useState<"chip_matrix" | "roi_fleet" | "benchmarks">("chip_matrix");
  const hardwareDatabase: HardwareSpec[] = [
    {
      id: "intel_loihi2",
      name: "Intel Loihi 2",
      vendor: "Intel Neuromorphic Computing Lab",
      processNode: "Intel 4 (EUV)",
      neuronsPerChip: "1,000,000",
      synapsesPerChip: "120,000,000",
      energyPerSop: "1.2 pJ / SOP",
      typicalPower: "1.5 – 35 mW",
      latencyUs: "150 μs",
      targetDomain: "Robotics, Audio Keyword Spotting, High-Speed Vision",
      architecture: "128 asynchronous neuromorphic cores with programmable microcode",
      comparisonNote: "Over 100x lower latency and 1,000x lower energy than GPU on gesture recognition.",
    },
    {
      id: "brainchip_akida",
      name: "BrainChip Akida AKD1000",
      vendor: "BrainChip Inc.",
      processNode: "28nm CMOS",
      neuronsPerChip: "1,200,000",
      synapsesPerChip: "10,000,000",
      energyPerSop: "3.5 pJ / SOP",
      typicalPower: "10 – 50 mW",
      latencyUs: "350 μs",
      targetDomain: "Automotive Edge, Smart Home, Industrial IoT",
      architecture: "Event-based Neural Processor with native on-chip edge learning",
      comparisonNote: "Zero DRAM required; complete in-SRAM operation eliminates memory bus bottlenecks.",
    },
    {
      id: "spinnaker2",
      name: "SpiNNaker 2",
      vendor: "TU Dresden & University of Manchester",
      processNode: "22nm FD-SOI",
      neuronsPerChip: "152 ARM Cores + Neuromorphic Accels",
      synapsesPerChip: "Scalable Multi-Chip Torus",
      energyPerSop: "10 pJ / SOP",
      typicalPower: "100 – 900 mW",
      latencyUs: "200 μs",
      targetDomain: "Large-Scale Cortical Brain Simulation, Tactile Robotics",
      architecture: "Massively parallel asynchronous packet-switched communication fabric",
      comparisonNote: "Simulates human cortical columns in true biological real-time.",
    },
    {
      id: "synsense_speck",
      name: "SynSense Speck",
      vendor: "SynSense Neuromorphic Technologies",
      processNode: "55nm DVS + Logic 3D Stack",
      neuronsPerChip: "320,000",
      synapsesPerChip: "4,000,000",
      energyPerSop: "2.1 pJ / SOP",
      typicalPower: "< 5 mW (Sub-milliwatt)",
      latencyUs: "100 μs",
      targetDomain: "Ultra-Low-Power Wearables, Battery Presence Detection",
      architecture: "Integrated 128x128 DVS event camera stacked on SNN processing core",
      comparisonNote: "World's lowest-power vision SoC: operates continuously on a coin cell battery for months.",
    },
    {
      id: "nvidia_jetson",
      name: "NVIDIA Jetson Orin Nano (Baseline GPU)",
      vendor: "NVIDIA",
      processNode: "8nm Ampere",
      neuronsPerChip: "Dense Weights Matrix",
      synapsesPerChip: "Dense Tensor Cores",
      energyPerSop: "N/A (~250 nJ / MAC)",
      typicalPower: "7,000 – 15,000 mW (15W)",
      latencyUs: "16,000 μs (16ms)",
      targetDomain: "Standard Edge Deep Learning (CNN/Transformer)",
      architecture: "Synchronous SIMD/Tensor Core GPU with LPDDR5 Memory",
      comparisonNote: "High compute throughput for dense batches, but continuous power draw even on idle static scenes.",
    },
  ];

  const [selectedChipId, setSelectedChipId] = useState<string>("intel_loihi2");

  // Workload Calculator Inputs
  const [eventRateKeps, setEventRateKeps] = useState<number>(50); // 50 kEPS from DVS
  const [synapticFanOut, setSynapticFanOut] = useState<number>(64); // connections per spike
  const [activeDutyCycle, setActiveDutyCycle] = useState<number>(15); // % of time scene has motion

  const selectedChip = hardwareDatabase.find((c) => c.id === selectedChipId) || hardwareDatabase[0];

  // Mathematical Energy Calculations
  // Total SOPs/sec = EventRate * FanOut
  const sopsPerSec = eventRateKeps * 1000 * synapticFanOut; // e.g. 50,000 * 64 = 3,200,000 SOPs/sec

  // Energy per SOP (in picojoules)
  let pJperSop = 1.2;
  if (selectedChip.id === "brainchip_akida") pJperSop = 3.5;
  if (selectedChip.id === "spinnaker2") pJperSop = 10.0;
  if (selectedChip.id === "synsense_speck") pJperSop = 2.1;
  if (selectedChip.id === "nvidia_jetson") pJperSop = 250000; // ~250 nanojoules per FLOP

  // Dynamic Power (Watts) = SOPs/sec * (pJ / 10^12) * (DutyCycle / 100)
  const dynamicPowerWatts = (sopsPerSec * (pJperSop * 1e-12) * (activeDutyCycle / 100));
  const staticPowerWatts = selectedChip.id === "nvidia_jetson" ? 4.5 : 0.002; // 4.5W vs 2mW
  const totalPowerMilliwatts = (dynamicPowerWatts + staticPowerWatts) * 1000;

  // Conventional GPU power (Jetson running 30fps CNN)
  const gpuBaselineMilliwatts = 8500; // 8.5W

  // Energy Savings Ratio
  const powerReductionPct = Math.max(0, ((gpuBaselineMilliwatts - totalPowerMilliwatts) / gpuBaselineMilliwatts) * 100);

  // Battery life calculation on standard 2500mAh @ 3.7V battery (9.25 Watt-hours = 9250 mWh)
  const batteryCapacityMwh = 9250;
  const neuromorphicBatteryHours = (batteryCapacityMwh / Math.max(0.5, totalPowerMilliwatts));
  const gpuBatteryHours = (batteryCapacityMwh / gpuBaselineMilliwatts);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
              PHASE 05 & 06
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Neuromorphic Hardware & Energy Profiler
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Synaptic Operations (SOPs) vs Floating Point Operations (FLOPs) comparative silicon benchmark.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Up to 99.8% Power Reduction</span>
          </span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
        <button
          onClick={() => setSubTab("chip_matrix")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "chip_matrix"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Neuromorphic Silicon Matrix</span>
        </button>

        <button
          onClick={() => setSubTab("roi_fleet")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "roi_fleet"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Fleet ROI &amp; Battery Longevity Calculator</span>
        </button>

        <button
          onClick={() => setSubTab("benchmarks")}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === "benchmarks"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>SNN Accuracy &amp; Latency Benchmarks</span>
        </button>
      </div>

      {subTab === "roi_fleet" && <NeuromorphicRoiCalculator />}
      {subTab === "benchmarks" && <BenchmarkEvaluator />}

      {subTab === "chip_matrix" && (
        <>
          {/* Chip Selector Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {hardwareDatabase.map((chip) => {
          const isSelected = chip.id === selectedChipId;
          const isGpu = chip.id === "nvidia_jetson";
          return (
            <div
              key={chip.id}
              onClick={() => setSelectedChipId(chip.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? isGpu
                    ? "bg-red-950/30 border-red-500/60 shadow-md shadow-red-500/10"
                    : "bg-cyan-500/15 border-cyan-500 shadow-md shadow-cyan-500/10"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block truncate">
                  {chip.vendor}
                </span>
                <h4 className="text-xs font-bold text-white mt-0.5 truncate">{chip.name}</h4>
                <div className="mt-2 text-[11px] font-mono text-emerald-400">
                  {chip.typicalPower}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{chip.processNode}</span>
                <span className={isSelected ? "text-cyan-400 font-bold" : "text-slate-600"}>
                  {isSelected ? "ACTIVE" : "SELECT"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Chip Deep Specification Card */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              {selectedChip.vendor}
            </span>
            <h3 className="text-xl font-extrabold text-white mt-0.5">{selectedChip.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              Process: <strong>{selectedChip.processNode}</strong>
            </span>
            <span className="px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500/40 text-xs font-mono text-emerald-300">
              Latency: <strong>{selectedChip.latencyUs}</strong>
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {selectedChip.architecture}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">On-Chip Neurons</span>
            <div className="text-sm font-bold text-slate-200 mt-0.5">{selectedChip.neuronsPerChip}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Synaptic Capacity</span>
            <div className="text-sm font-bold text-slate-200 mt-0.5">{selectedChip.synapsesPerChip}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Energy per SOP</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">{selectedChip.energyPerSop}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Primary Target</span>
            <div className="text-xs font-semibold text-cyan-300 mt-0.5 truncate">{selectedChip.targetDomain}</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-200/90 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>{selectedChip.comparisonNote}</span>
        </div>
      </div>

      {/* Interactive Workload & Battery Life Calculator */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold">
            CALC
          </span>
          <div>
            <h3 className="text-lg font-bold text-white">
              Dynamic Energy & Battery Life Calculator (Edge SWaP-C)
            </h3>
            <p className="text-xs text-slate-400">
              Calculate exact power consumption, synaptic operations per second, and battery longevity.
            </p>
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Input Event Rate:</span>
              <span className="text-cyan-400">{eventRateKeps} kEPS</span>
            </div>
            <input
              type="range"
              min="5"
              max="250"
              step="5"
              value={eventRateKeps}
              onChange={(e) => setEventRateKeps(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-slate-500">From DVS camera or sensor stream</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Synaptic Fan-Out:</span>
              <span className="text-cyan-400">{synapticFanOut} synapses/neuron</span>
            </div>
            <input
              type="range"
              min="16"
              max="256"
              step="16"
              value={synapticFanOut}
              onChange={(e) => setSynapticFanOut(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-slate-500">Average dendritic connectivity</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
              <span>Active Scene Duty Cycle:</span>
              <span className="text-cyan-400">{activeDutyCycle}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={activeDutyCycle}
              onChange={(e) => setActiveDutyCycle(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-[10px] text-slate-500">Percentage of time with motion/events</span>
          </div>
        </div>

        {/* Results Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Synaptic Ops Rate</span>
            <div className="text-xl font-extrabold text-cyan-400 font-mono">
              {(sopsPerSec / 1e6).toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-400">MSOP/s</span>
            </div>
            <p className="text-[10px] text-slate-500">Event-driven additions (no MACs)</p>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/40 bg-slate-950 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Total Silicon Power</span>
            <div className="text-xl font-extrabold text-emerald-400 font-mono">
              {totalPowerMilliwatts < 1000
                ? `${totalPowerMilliwatts.toFixed(1)} mW`
                : `${(totalPowerMilliwatts / 1000).toFixed(2)} W`}
            </div>
            <p className="text-[10px] text-emerald-400/80">
              vs {gpuBaselineMilliwatts / 1000}W on conventional GPU
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Energy Efficiency Gain</span>
            <div className="text-xl font-extrabold text-teal-300 font-mono">
              {powerReductionPct.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-500">Direct battery savings</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Battery Life (2500mAh)
            </span>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {neuromorphicBatteryHours > 24
                ? `${(neuromorphicBatteryHours / 24).toFixed(0)} days`
                : `${neuromorphicBatteryHours.toFixed(1)} hours`}
            </div>
            <p className="text-[10px] text-slate-500">
              GPU runs out in {gpuBatteryHours.toFixed(1)} hours
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
