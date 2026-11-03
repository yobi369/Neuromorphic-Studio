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
      processNode: "Not independently verified in this repository",
      neuronsPerChip: "Not verified",
      synapsesPerChip: "Not verified",
      energyPerSop: "Not verified",
      typicalPower: "Not verified",
      latencyUs: "Not verified",
      targetDomain: "Vendor-reported domain; not locally validated",
      architecture: "Consult the versioned vendor datasheet; not validated by this application",
      comparisonNote: "No independent cross-platform energy or latency comparison has been reproduced.",
    },
    {
      id: "brainchip_akida",
      name: "BrainChip Akida AKD1000",
      vendor: "BrainChip Inc.",
      processNode: "Not independently verified in this repository",
      neuronsPerChip: "Not verified",
      synapsesPerChip: "Not verified",
      energyPerSop: "Not verified",
      typicalPower: "Not verified",
      latencyUs: "Not verified",
      targetDomain: "Vendor-reported domain; not locally validated",
      architecture: "Consult the versioned vendor datasheet; not validated by this application",
      comparisonNote: "No independent cross-platform energy or latency comparison has been reproduced.",
    },
    {
      id: "spinnaker2",
      name: "SpiNNaker 2",
      vendor: "TU Dresden & University of Manchester",
      processNode: "Not independently verified in this repository",
      neuronsPerChip: "Not verified",
      synapsesPerChip: "Not verified",
      energyPerSop: "Not verified",
      typicalPower: "Not verified",
      latencyUs: "Not verified",
      targetDomain: "Vendor-reported domain; not locally validated",
      architecture: "Consult the versioned vendor datasheet; not validated by this application",
      comparisonNote: "No independent cross-platform energy or latency comparison has been reproduced.",
    },
    {
      id: "synsense_speck",
      name: "SynSense Speck",
      vendor: "SynSense Neuromorphic Technologies",
      processNode: "Not independently verified in this repository",
      neuronsPerChip: "Not verified",
      synapsesPerChip: "Not verified",
      energyPerSop: "Not verified",
      typicalPower: "Not verified",
      latencyUs: "Not verified",
      targetDomain: "Vendor-reported domain; not locally validated",
      architecture: "Consult the versioned vendor datasheet; not validated by this application",
      comparisonNote: "No independent cross-platform energy or latency comparison has been reproduced.",
    },
    {
      id: "nvidia_jetson",
      name: "NVIDIA Jetson Orin Nano (Baseline GPU)",
      vendor: "NVIDIA",
      processNode: "Not independently verified in this repository",
      neuronsPerChip: "Not verified",
      synapsesPerChip: "Not verified",
      energyPerSop: "Not verified",
      typicalPower: "Not verified",
      latencyUs: "Not verified",
      targetDomain: "Vendor-reported domain; not locally validated",
      architecture: "Consult the versioned vendor datasheet; not validated by this application",
      comparisonNote: "No independent cross-platform energy or latency comparison has been reproduced.",
    },
  ];

  const [selectedChipId, setSelectedChipId] = useState<string>("intel_loihi2");

  // Workload Calculator Inputs
  const [eventRateKeps, setEventRateKeps] = useState<number>(50); // 50 kEPS from DVS
  const [synapticFanOut, setSynapticFanOut] = useState<number>(64); // connections per spike
  const [activeDutyCycle, setActiveDutyCycle] = useState<number>(15); // illustrative workload assumption\n  const [energyPerSopInput, setEnergyPerSopInput] = useState<number>(0);\n  const [idlePowerInputMw, setIdlePowerInputMw] = useState<number>(0);\n  const [gpuBaselineInputMw, setGpuBaselineInputMw] = useState<number>(0);\n  const [batteryCapacityInputMwh, setBatteryCapacityInputMwh] = useState<number>(0);

  const selectedChip = hardwareDatabase.find((c) => c.id === selectedChipId) || hardwareDatabase[0];

  // Mathematical Energy Calculations
  // Total SOPs/sec = EventRate * FanOut
  const sopsPerSec = eventRateKeps * 1000 * synapticFanOut; // e.g. 50,000 * 64 = 3,200,000 SOPs/sec

  // Energy per SOP (in picojoules)
  // User-supplied scenario assumptions only; no chip-specific values are hard-coded.
  const pJperSop = energyPerSopInput;
  const dynamicPowerWatts = sopsPerSec * (pJperSop * 1e-12) * (activeDutyCycle / 100);
  const staticPowerWatts = idlePowerInputMw / 1000;
  const totalPowerMilliwatts = (dynamicPowerWatts + staticPowerWatts) * 1000;
  const gpuBaselineMilliwatts = gpuBaselineInputMw;
  const powerReductionPct = gpuBaselineMilliwatts > 0 ? ((gpuBaselineMilliwatts - totalPowerMilliwatts) / gpuBaselineMilliwatts) * 100 : null;
  const batteryCapacityMwh = batteryCapacityInputMwh;
  const neuromorphicBatteryHours = totalPowerMilliwatts > 0 ? batteryCapacityMwh / totalPowerMilliwatts : 0;
  const gpuBatteryHours = gpuBaselineMilliwatts > 0 ? batteryCapacityMwh / gpuBaselineMilliwatts : 0;

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
            Hardware reference fields are unverified; scenario calculations require explicit user assumptions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hardware specifications unverified</span>
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
              Calculate scenario estimates only. These are not measured chip power, latency or battery-life results.
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-xl border border-amber-700/30 bg-amber-950/10 p-4">
          <label className="text-xs text-slate-300">Assumed energy per SOP (pJ)<input type="number" min="0" step="any" value={energyPerSopInput} onChange={(e)=>setEnergyPerSopInput(Number(e.target.value))} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2"/></label>
          <label className="text-xs text-slate-300">Assumed idle power (mW)<input type="number" min="0" step="any" value={idlePowerInputMw} onChange={(e)=>setIdlePowerInputMw(Number(e.target.value))} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2"/></label>
          <label className="text-xs text-slate-300">Comparison baseline (mW)<input type="number" min="0" step="any" value={gpuBaselineInputMw} onChange={(e)=>setGpuBaselineInputMw(Number(e.target.value))} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2"/></label>
          <label className="text-xs text-slate-300">Battery capacity (mWh)<input type="number" min="0" step="any" value={batteryCapacityInputMwh} onChange={(e)=>setBatteryCapacityInputMwh(Number(e.target.value))} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2"/></label>
          <p className="sm:col-span-2 lg:col-span-4 text-[10px] text-amber-300">These four values must come from your own measurement, vendor datasheet or explicitly stated scenario. The app does not supply hidden chip defaults.</p>
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
              {energyPerSopInput > 0 || idlePowerInputMw > 0 ? (totalPowerMilliwatts < 1000 ? `${totalPowerMilliwatts.toFixed(3)} mW` : `${(totalPowerMilliwatts / 1000).toFixed(3)} W`) : "Enter assumptions"}
            </div>
            <p className="text-[10px] text-emerald-400/80">
              {gpuBaselineMilliwatts > 0 ? `Baseline: ${gpuBaselineMilliwatts.toFixed(2)} mW` : "No comparison baseline supplied"}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Energy Efficiency Gain</span>
            <div className="text-xl font-extrabold text-teal-300 font-mono">
              {powerReductionPct === null ? "Not calculated" : `${powerReductionPct.toFixed(1)}%`}
            </div>
            <p className="text-[10px] text-slate-500">Direct battery savings</p>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Battery life (user-supplied battery)
            </span>
            <div className="text-xl font-extrabold text-amber-400 font-mono">
              {batteryCapacityMwh > 0 && totalPowerMilliwatts > 0 ? (neuromorphicBatteryHours > 24 ? `${(neuromorphicBatteryHours / 24).toFixed(1)} days` : `${neuromorphicBatteryHours.toFixed(1)} hours`) : "Enter battery + power"}
            </div>
            <p className="text-[10px] text-slate-500">
              {gpuBaselineMilliwatts > 0 && batteryCapacityMwh > 0 ? `Baseline: ${gpuBatteryHours.toFixed(1)} hours` : "Baseline not supplied"}
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
