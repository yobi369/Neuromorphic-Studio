import { useState, useEffect } from "react";
import {
  Activity,
  Award,
  Clock,
  Zap,
  TrendingUp,
  BarChart3,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw,
  Play,
  Check,
  AlertCircle,
} from "lucide-react";

interface BenchmarkData {
  dataset: "n_mnist" | "dvs_gesture" | "shd_audio";
  name: string;
  accuracy: number;
  samplesTested: number;
  meanLatencyMs: number;
  energyPerInferenceUj: number;
  gpuEnergyUj: number;
  classNames: string[];
  confusionMatrix: number[][];
  latencyAccuracyCurve: Array<{ timeMs: number; accuracy: number }>;
}

export function BenchmarkEvaluator() {
  const [selectedDataset, setSelectedDataset] = useState<"n_mnist" | "dvs_gesture" | "shd_audio">("n_mnist");
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [evalProgress, setEvalProgress] = useState<number>(100);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number; count: number } | null>(null);

  const fetchBenchmark = async (ds: "n_mnist" | "dvs_gesture" | "shd_audio") => {
    setLoading(true);
    setEvalProgress(0);

    // Simulate batch evaluation progress steps
    const interval = setInterval(() => {
      setEvalProgress((p) => {
        if (p >= 90) {
          clearInterval(interval);
          return 90;
        }
        return p + 25;
      });
    }, 120);

    try {
      const res = await fetch(`/api/benchmarks/run?dataset=${ds}`);
      if (!res.ok) throw new Error("Failed to load benchmark");
      const result = await res.json();
      clearInterval(interval);
      setEvalProgress(100);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark(selectedDataset);
  }, [selectedDataset]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              ACCURACY &amp; LATENCY EVALUATOR
            </span>
            <span className="text-xs text-emerald-400 font-mono font-semibold">
              Event-Based SNN Benchmarks
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            <span>Neuromorphic Benchmark Accuracy &amp; Confusion Matrix</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Evaluate time-to-accuracy latency, confusion heatmaps, and energy-per-inference metrics
            on standard neuromorphic event datasets (N-MNIST, DVS-Gesture, and Spiking Heidelberg Digits).
          </p>
        </div>

        {/* Dataset Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          {[
            { id: "n_mnist", name: "N-MNIST Digits" },
            { id: "dvs_gesture", name: "DVS128 Gesture" },
            { id: "shd_audio", name: "Spiking Digits (SHD)" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedDataset(item.id as typeof selectedDataset)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedDataset === item.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Bar while running */}
      {loading && (
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 space-y-2">
          <div className="flex justify-between text-xs font-mono text-cyan-300">
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              Evaluating Event Spike Streams across Test Split...
            </span>
            <span>{evalProgress}% Complete</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-teal-400 h-full rounded-full transition-all duration-200"
              style={{ width: `${evalProgress}%` }}
            />
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/80 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Top-1 Test Accuracy</div>
              <div className="text-2xl font-black text-cyan-400 font-mono flex items-baseline gap-1">
                {data.accuracy}%
                <span className="text-xs font-normal text-emerald-400 font-sans">SOTA</span>
              </div>
              <div className="text-[10px] text-slate-500">Tested on {data.samplesTested} event samples</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Mean Time to Decision</div>
              <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                {data.meanLatencyMs} <span className="text-xs font-normal text-slate-400">ms</span>
              </div>
              <div className="text-[10px] text-slate-500">Early-exit event integration</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Neuromorphic Energy / Inf</div>
              <div className="text-2xl font-black text-emerald-400 font-mono flex items-baseline gap-1">
                {data.energyPerInferenceUj} <span className="text-xs font-normal text-slate-400">μJ</span>
              </div>
              <div className="text-[10px] text-slate-500">Sub-milliwatt ASIC / Loihi 2</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Energy Efficiency Gain</div>
              <div className="text-2xl font-black text-teal-300 font-mono flex items-baseline gap-1">
                {Math.round(data.gpuEnergyUj / data.energyPerInferenceUj)}x
                <span className="text-xs font-normal text-slate-400">vs GPU</span>
              </div>
              <div className="text-[10px] text-slate-500">Conventional GPU: {data.gpuEnergyUj} μJ</div>
            </div>
          </div>

          {/* Main Visualizer: Confusion Matrix & Latency Curve */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Confusion Matrix */}
            <div className="lg:col-span-7 p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span>Confusion Matrix Heatmap ({data.classNames.length} Classes)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Rows: Ground Truth Label | Columns: Model Prediction</p>
                </div>

                <button
                  onClick={() => fetchBenchmark(selectedDataset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-evaluate</span>
                </button>
              </div>

              {/* Matrix Grid */}
              <div className="overflow-x-auto pb-2">
                <div className="inline-block min-w-full">
                  <div
                    className="grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${data.classNames.length + 1}, minmax(28px, 1fr))`,
                    }}
                  >
                    {/* Top-Left Empty Corner */}
                    <div className="p-1 text-[9px] font-mono text-slate-500 text-center">T \ P</div>

                    {/* Column Headers (Predicted) */}
                    {data.classNames.map((c, i) => (
                      <div
                        key={`col-${i}`}
                        className="p-1 text-[9px] font-mono text-slate-400 text-center truncate"
                        title={`Predicted: ${c}`}
                      >
                        {c.length > 3 ? c.slice(0, 3) : c}
                      </div>
                    ))}

                    {/* Rows */}
                    {data.confusionMatrix.map((row, rIdx) => (
                      <>
                        {/* Row Header (True) */}
                        <div
                          key={`row-header-${rIdx}`}
                          className="p-1 text-[9px] font-mono text-slate-400 text-right pr-2 truncate self-center"
                          title={`True: ${data.classNames[rIdx]}`}
                        >
                          {data.classNames[rIdx].length > 4 ? data.classNames[rIdx].slice(0, 4) : data.classNames[rIdx]}
                        </div>

                        {/* Cells */}
                        {row.map((val, cIdx) => {
                          const isDiagonal = rIdx === cIdx;
                          const intensity = val > 0 ? (isDiagonal ? Math.min(1, val / 100) : 0.4) : 0;

                          return (
                            <button
                              key={`cell-${rIdx}-${cIdx}`}
                              onClick={() => setSelectedCell({ row: rIdx, col: cIdx, count: val })}
                              className={`aspect-square rounded flex items-center justify-center text-[9px] font-mono transition-all cursor-pointer ${
                                isDiagonal
                                  ? "bg-cyan-500/80 text-slate-950 font-bold hover:bg-cyan-400 shadow-sm"
                                  : val > 0
                                  ? "bg-rose-500/40 text-rose-200 hover:bg-rose-500/60"
                                  : "bg-slate-950 text-slate-700 hover:bg-slate-800"
                              }`}
                              style={{
                                opacity: val > 0 ? Math.max(0.35, intensity) : 0.25,
                              }}
                              title={`True: ${data.classNames[rIdx]} | Predicted: ${data.classNames[cIdx]} (${val} samples)`}
                            >
                              {val > 0 ? val : ""}
                            </button>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
              </div>

              {selectedCell && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">Selected: </span>
                    <span className="text-slate-200 font-bold">
                      True &quot;{data.classNames[selectedCell.row]}&quot; → Predicted &quot;
                      {data.classNames[selectedCell.col]}&quot;
                    </span>
                  </div>
                  <div
                    className={
                      selectedCell.row === selectedCell.col
                        ? "text-emerald-400 font-bold"
                        : "text-rose-400 font-bold"
                    }
                  >
                    {selectedCell.count} samples ({selectedCell.row === selectedCell.col ? "Correct" : "Error"})
                  </div>
                </div>
              )}
            </div>

            {/* Right: Latency vs Accuracy Curve & Energy Bar */}
            <div className="lg:col-span-5 space-y-4">
              {/* Early-Exit Latency Curve */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Time-To-Accuracy Latency Curve</span>
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">Anytime Inference</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Unlike frame-based DNNs requiring full 33ms frames, SNN confidence accumulates per microsecond event spike.
                </p>

                <div className="space-y-2 pt-2">
                  {data.latencyAccuracyCurve.map((pt, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">{pt.timeMs} ms elapsed:</span>
                        <span
                          className={
                            pt.accuracy > 90
                              ? "text-emerald-400 font-bold"
                              : pt.accuracy > 70
                              ? "text-cyan-300 font-bold"
                              : "text-amber-400 font-bold"
                          }
                        >
                          {pt.accuracy}% accuracy
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pt.accuracy > 90
                              ? "bg-gradient-to-r from-teal-400 to-emerald-400"
                              : pt.accuracy > 70
                              ? "bg-cyan-500"
                              : "bg-amber-400"
                          }`}
                          style={{ width: `${pt.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Energy Comparison Card */}
              <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Silicon Energy Consumption per Inference
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                    Microjoules (μJ)
                  </span>
                </div>

                <div className="space-y-2.5 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Conventional Edge GPU (NVIDIA Jetson):</span>
                      <span className="text-amber-400 font-bold">{data.gpuEnergyUj} μJ</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full w-full" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-200 font-bold">Neuromorphic SNN (Intel Loihi 2 / Akida):</span>
                      <span className="text-emerald-400 font-bold">{data.energyPerInferenceUj} μJ</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-400 h-full rounded-full"
                        style={{
                          width: `${Math.max(2, (data.energyPerInferenceUj / data.gpuEnergyUj) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Consumes <strong>{Math.round(data.gpuEnergyUj / data.energyPerInferenceUj)}x</strong> less energy by executing synaptic operations strictly upon event arrival.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
