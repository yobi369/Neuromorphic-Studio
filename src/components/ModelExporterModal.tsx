import { useState, useEffect } from "react";
import { ExportTarget, CommercialTier } from "../types";
import { MicrocodeSandbox } from "./MicrocodeSandbox";
import {
  Download,
  Copy,
  Check,
  Code2,
  FileCode,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  Play,
} from "lucide-react";

interface ModelExporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier?: CommercialTier;
  onOpenPricing?: () => void;
}

export function ModelExporterModal({
  isOpen,
  onClose,
}: ModelExporterModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<ExportTarget>("lava_python");
  const [modelName, setModelName] = useState("EdgeVision_SNN");
  const [layerConfig, setLayerConfig] = useState("64, 32, 10");
  const [tauM, setTauM] = useState(20.0);
  const [viewMode, setViewMode] = useState<"export" | "reference_simulator">("export");
  const [generatedCode, setGeneratedCode] = useState("");
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportError, setExportError] = useState("");

  const targets: {
    id: ExportTarget;
    name: string;
    ext: string;
    runtime: string;
    description: string;
    badge: string;
    requiresTier: CommercialTier;
  }[] = [
    {
      id: "lava_python",
      name: "Lava SDK process-graph template",
      ext: ".py",
      runtime: "Lava 0.10 floating-point simulator",
      description: "Simulator-tested process graph. Physical Loihi board deployment and hardware measurements are not verified.",
      badge: "Simulator smoke-tested",
      requiresTier: "community",
    },
    {
      id: "snntorch_pytorch",
      name: "snnTorch LIF module",
      ext: ".py",
      runtime: "PyTorch 2.6 CPU + snnTorch 1.0",
      description: "CPU-smoke-tested LIF module. Exported parameters are initial values, not trained model weights.",
      badge: "CPU smoke-tested",
      requiresTier: "community",
    },
    {
      id: "cpp_micro",
      name: "Portable embedded C99 LIF kernel",
      ext: ".c",
      runtime: "GCC C99 host compilation",
      description: "Fixed-point LIF kernel template. No MCU HAL, firmware image, board timing or RAM certification is included.",
      badge: "GCC smoke-tested",
      requiresTier: "community",
    },
  ];

  const fetchExport = async () => {
    setLoading(true);
    try {
      const parsedLayers = layerConfig
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n > 0);

      const res = await fetch("/api/export/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: selectedTarget,
          modelName,
          layers: parsedLayers.length >= 2 ? parsedLayers : [64, 32, 10],
          tau_m: tauM,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Export generation failed.");
      setGeneratedCode(data.code);
      setFilename(data.filename);
      setExportError("");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export generation failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExport();
    }
  }, [isOpen, selectedTarget, modelName, layerConfig, tauM]);

  if (!isOpen) return null;

  const currentTargetObj = targets.find((t) => t.id === selectedTarget)!;
  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "neuromorphic_model.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 px-6 py-5 border-b border-cyan-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">
                  Neuromorphic Model &amp; Code Exporter
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  Software templates
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate starter artifacts. Physical hardware compilation and target-board validation remain separate release gates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Navigation Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950 border-b border-slate-900">
          <button
            onClick={() => setViewMode("export")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              viewMode === "export"
                ? "bg-slate-900 border-t-2 border-cyan-400 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Code Synthesis &amp; Export</span>
          </button>
          <button
            onClick={() => setViewMode("reference_simulator")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
              viewMode === "reference_simulator"
                ? "bg-slate-900 border-t-2 border-cyan-400 text-cyan-300 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-4 h-4 text-cyan-400" />
            <span>Software Reference Simulation</span>
          </button>
        </div>

        {viewMode === "reference_simulator" ? (
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <MicrocodeSandbox
              initialCode={generatedCode}
              initialTarget={
                selectedTarget === "cpp_micro"
                  ? "cpp_micro"
                  : selectedTarget === "lava_python"
                  ? "loihi2_lava"
                  : "snntorch_pytorch"
              }
            />
          </div>
        ) : (
          <>
            {/* Target Format Selector Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-slate-900/40 border-b border-slate-900">
          {targets.map((target) => {
            const isSelected = selectedTarget === target.id;
            return (
              <button
                key={target.id}
                onClick={() => setSelectedTarget(target.id)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? "bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{target.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mb-1">{target.ext}</div>
                <div className="text-[10px] text-cyan-400/80 font-mono">{target.badge}</div>
              </button>
            );
          })}
        </div>

        {/* Config Inputs Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-900 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-sans">Model Name:</span>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value.replace(/\s+/g, "_"))}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-sans">Layers (In, Hid, Out):</span>
              <input
                type="text"
                value={layerConfig}
                onChange={(e) => setLayerConfig(e.target.value)}
                placeholder="64, 32, 10"
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs w-28 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-sans">τ_m:</span>
              <input
                type="number"
                value={tauM}
                onChange={(e) => setTauM(Number(e.target.value))}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-xs w-16 focus:outline-none focus:border-cyan-400"
              />
              <span className="text-slate-500">ms</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("reference_simulator")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-500/50 transition-colors text-xs font-sans font-medium cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-cyan-400" />
              <span>Run reference simulation</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-sans font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-sans font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {filename}</span>
            </button>
          </div>
        </div>

        {exportError && <p role="alert" className="mx-6 mt-3 rounded border border-rose-700/40 bg-rose-950/20 p-3 text-xs text-rose-300">{exportError}</p>}

        {/* Code Preview Area */}
        <div className="relative p-6 max-h-[50vh] overflow-y-auto bg-[#020617] font-mono text-xs text-slate-300">


          {loading ? (
            <div className="py-12 text-center text-slate-500">
              Generating optimized neuromorphic source code...
            </div>
          ) : (
            <pre className="overflow-x-auto whitespace-pre leading-relaxed text-slate-300">
              <code>{generatedCode}</code>
            </pre>
          )}
        </div>
        </>
        )}

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Template runtime: {currentTargetObj.runtime}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
          >
            Close Exporter
          </button>
        </div>
      </div>
    </div>
  );
}
