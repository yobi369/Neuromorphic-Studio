import { useState, useEffect } from "react";
import {
  Play,
  RotateCcw,
  Cpu,
  Zap,
  Terminal,
  Layers,
  Activity,
  CheckCircle2,
  HardDrive,
  Clock,
  Code2,
  Sparkles,
  ChevronRight,
} from "lucide-react";

interface MicrocodeSandboxProps {
  onClose?: () => void;
  initialCode?: string;
  initialTarget?: "cpp_micro" | "loihi2_lava" | "speck_samna";
}

const PRESET_CODES = {
  cpp_micro: `// Embedded C++ Q8.8 Fixed-Point LIF Microcode
// Target: ARM Cortex-M0+ / STM32 (Sub-4KB SRAM footprint)
#include <stdint.h>

#define NUM_NEURONS 8
#define DECAY_ALPHA 225 // 225/256 ≈ 0.8789 decay factor
#define V_THRESH 256    // 1.0 in Q8.8 fixed-point
#define V_RESET 0

int16_t v_mem[NUM_NEURONS] = {0};
uint8_t refractory[NUM_NEURONS] = {0};

void step_neuromorphic_core(uint16_t input_spikes) {
    for (int i = 0; i < NUM_NEURONS; i++) {
        if (refractory[i] > 0) {
            refractory[i]--;
            v_mem[i] = V_RESET;
            continue;
        }
        // Fixed-point decay + synaptic current
        v_mem[i] = (v_mem[i] * DECAY_ALPHA) >> 8;
        if ((input_spikes >> i) & 1) {
            v_mem[i] += 128; // Add synaptic weight (+0.5)
        }
        // Check spike fire condition
        if (v_mem[i] >= V_THRESH) {
            emit_aer_spike(i);
            v_mem[i] = V_RESET;
            refractory[i] = 2; // 2 clock refractory period
        }
    }
}`,
  loihi2_lava: `# Intel Loihi 2 Lava Microcode Definition
from lava.proc.lif.process import LIF
from lava.proc.dense.process import Dense

# Configure 8-core asynchronous programmable microcode
lif_layer = LIF(
    shape=(8,),
    vth=100,        # Fixed-point voltage threshold
    dv=16,          # Voltage leak rate per epoch
    du=32,          # Synaptic current decay
    bias_mant=0
)
# Programmable spike routing table initialized
print("Loihi 2 core assembly ready for execution.")`,
  speck_samna: `# SynSense Speck DVS Direct Event Routing Microcode
# Real-time event filter mapped to 320k asynchronous neurons
[Speck.Filter]
threshold_high = 0x7F
threshold_low = 0x10
refractory_us = 120
enable_lateral_inhibition = True
output_format = AER_POLARITY_PACKET`,
};

export function MicrocodeSandbox({
  onClose,
  initialCode,
  initialTarget = "cpp_micro",
}: MicrocodeSandboxProps) {
  const [target, setTarget] = useState<"cpp_micro" | "loihi2_lava" | "speck_samna">(initialTarget);
  const [code, setCode] = useState(initialCode || PRESET_CODES[initialTarget]);
  const [spikePattern, setSpikePattern] = useState<"poisson" | "burst" | "dvs_sweep">("poisson");
  const [timesteps, setTimesteps] = useState(40);
  const [isRunning, setIsRunning] = useState(false);

  // Simulation output state
  const [simResult, setSimResult] = useState<{
    cyclesTotal: number;
    sramUsedBytes: number;
    flashUsedBytes: number;
    sopCount: number;
    activeSpikeCount: number;
    energyEstimateUj: number;
    neurons: Array<{
      id: number;
      name: string;
      membraneTrace: number[];
      spikes: number[];
      vThreshold: number;
    }>;
    logs: string[];
    registers: {
      PC: string;
      CYCLE: number;
      ACC_V: string;
      SPIKE_REG: string;
      REFRACT_CTR: number;
    };
  } | null>(null);

  const [selectedNeuronIndex, setSelectedNeuronIndex] = useState(0);

  const handleSelectTarget = (t: "cpp_micro" | "loihi2_lava" | "speck_samna") => {
    setTarget(t);
    setCode(PRESET_CODES[t]);
  };

  const runSimulation = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/microcode/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          code,
          inputSpikePattern: spikePattern,
          timesteps,
          neuronCount: 8,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult(data);
      }
    } catch (err) {
      console.error("Microcode simulation error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Run automatically on first mount
  useEffect(() => {
    runSimulation();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                In-Browser Neuromorphic WASM &amp; Microcode Engine
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                Deterministic Q8.8 Emulation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate cycle-accurate spike timings, register states, and SRAM footprint before deploying firmware to physical silicon.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950/40 flex items-center gap-2 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-slate-950 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Executing Core..." : "Run Microcode Execution"}</span>
          </button>
        </div>
      </div>

      {/* Target & Preset Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Silicon Firmware Target:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSelectTarget("cpp_micro")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                target === "cpp_micro"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Embedded C++ (MCU)
            </button>
            <button
              onClick={() => handleSelectTarget("loihi2_lava")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                target === "loihi2_lava"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Intel Loihi 2 Lava
            </button>
            <button
              onClick={() => handleSelectTarget("speck_samna")}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                target === "speck_samna"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              SynSense Speck
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Input Stimulus:</span>
          <select
            value={spikePattern}
            onChange={(e: any) => setSpikePattern(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono"
          >
            <option value="poisson">Poisson Rate Stream</option>
            <option value="burst">High-Frequency Burst</option>
            <option value="dvs_sweep">DVS Spatio-Temporal Sweep</option>
          </select>
        </div>
      </div>

      {/* Code Editor & Micro-Architecture Registers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Code Editor */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>firmware_core.{target === "cpp_micro" ? "cpp" : target === "loihi2_lava" ? "py" : "conf"}</span>
            </span>
            <span className="text-[11px] text-slate-500">Editable microcode snippet</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={14}
            className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500/60 resize-none"
            spellCheck={false}
          />
        </div>

        {/* Right: Virtual Neuromorphic Hardware Registers & SRAM Gauge */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span>Virtual Hardware Registers</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                Core Clock Active
              </span>
            </div>

            {simResult && (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Program Counter</span>
                  <span className="text-cyan-400 font-bold">{simResult.registers.PC}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Cycle Counter</span>
                  <span className="text-teal-300 font-bold">{simResult.registers.CYCLE.toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">V_mem Accumulator</span>
                  <span className="text-amber-300 font-bold">{simResult.registers.ACC_V}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase">Spike Mask Register</span>
                  <span className="text-emerald-400 font-bold">{simResult.registers.SPIKE_REG}</span>
                </div>
              </div>
            )}
          </div>

          {/* Memory Footprint Analysis */}
          {simResult && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>On-Chip Memory Footprint</span>
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  {simResult.sramUsedBytes} / 4,096 Bytes
                </span>
              </div>

              <div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, (simResult.sramUsedBytes / 4096) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                  <span>SRAM: {simResult.sramUsedBytes} Bytes ({(simResult.sramUsedBytes / 40.96).toFixed(1)}%)</span>
                  <span>Flash: {simResult.flashUsedBytes} Bytes</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Synaptic Operations</span>
                  <span className="text-slate-100 font-mono font-bold">{simResult.sopCount} SOPs</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Est. Energy Burn</span>
                  <span className="text-teal-300 font-mono font-bold">{simResult.energyEstimateUj} μJ</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spike Raster & Membrane Potential Visualization */}
      {simResult && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Virtual Silicon Spike Raster &amp; Membrane Potential</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Observed asynchronous spike emission timestamps (0 - {simResult.timesteps} μs timesteps)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Inspect Neuron:</span>
              <div className="flex items-center gap-1">
                {simResult.neurons.map((n, idx) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNeuronIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      selectedNeuronIndex === idx
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/40"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {idx}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Raster Plot View */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[11px] font-mono text-slate-400 flex justify-between">
              <span>All Neurons Spike Raster</span>
              <span>Total Spikes: {simResult.activeSpikeCount}</span>
            </div>
            <div className="space-y-1.5 pt-1">
              {simResult.neurons.map((neuron, idx) => (
                <div key={neuron.id} className="flex items-center gap-2">
                  <span className="w-8 text-[11px] font-mono text-slate-500 text-right">N_{idx}</span>
                  <div className="flex-1 h-4 bg-slate-900/80 rounded relative overflow-hidden border border-slate-800/60">
                    {neuron.spikes.map((t) => (
                      <div
                        key={t}
                        className="absolute top-0 bottom-0 w-1 bg-cyan-400 shadow-sm shadow-cyan-400/50"
                        style={{ left: `${(t / simResult.timesteps) * 100}%` }}
                        title={`Spike at t=${t}`}
                      />
                    ))}
                  </div>
                  <span className="w-8 text-[10px] font-mono text-cyan-400 text-right">
                    {neuron.spikes.length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Neuron Membrane Voltage Trace */}
          {simResult.neurons[selectedNeuronIndex] && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-300">
                  Membrane Potential Trace:{" "}
                  <span className="text-cyan-400 font-bold">
                    Neuron #{selectedNeuronIndex} ({simResult.neurons[selectedNeuronIndex].name})
                  </span>
                </span>
                <span className="text-amber-400 font-mono text-[11px]">Threshold V_th = 1.000</span>
              </div>

              {/* SVG Voltage Trace Curve */}
              <div className="h-32 w-full pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                  {/* Threshold line */}
                  <line
                    x1="0"
                    y1="10"
                    x2="100"
                    y2="10"
                    stroke="#fbbf24"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                  {/* Base line */}
                  <line x1="0" y1="36" x2="100" y2="36" stroke="#334155" strokeWidth="0.5" />

                  {/* Voltage polygon */}
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.2"
                    points={simResult.neurons[selectedNeuronIndex].membraneTrace
                      .map((val, t) => {
                        const x = (t / (simResult.timesteps - 1)) * 100;
                        const y = 36 - Math.min(val, 1.2) * 26;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />

                  {/* Spike markers */}
                  {simResult.neurons[selectedNeuronIndex].spikes.map((t) => {
                    const x = (t / (simResult.timesteps - 1)) * 100;
                    return (
                      <circle
                        key={t}
                        cx={x}
                        cy="10"
                        r="1.8"
                        fill="#f43f5e"
                        stroke="#fff"
                        strokeWidth="0.5"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Telemetry Logs */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">WASM Emulator Output Logs</span>
            <div className="space-y-0.5 text-xs font-mono text-slate-400">
              {simResult.logs.map((log, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ChevronRight className="w-3 h-3 text-cyan-500 shrink-0" />
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
