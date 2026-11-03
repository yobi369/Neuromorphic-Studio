import { useState } from "react";
import { MicrocodeSandbox } from "./MicrocodeSandbox";
import {
  Sparkles,
  Send,
  Cpu,
  Copy,
  Check,
  Code2,
  Terminal,
  Layers,
  Zap,
  BookOpen,
  Download,
  Play,
} from "lucide-react";

export function AiArchitectView() {
  const [subTab, setSubTab] = useState<"copilot" | "wasm_sandbox">("copilot");
  const [prompt, setPrompt] = useState<string>("");
  const [hardwareTarget, setHardwareTarget] = useState<string>("Intel Loihi 2");
  const [frameworkTarget, setFrameworkTarget] = useState<string>("Intel Lava");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `### Welcome to the Neuromorphic AI Architect Studio
I am your specialized neuromorphic research co-pilot, powered by **Gemini 2.5 Flash** with deep grounding in computational neuroscience, asynchronous event-driven silicon, and spiking neural networks.

Select a preset or ask me to:
- Generate complete **Intel Lava**, **snnTorch**, or **SpikingJelly** training & inference loops.
- Convert traditional **ANNs (ResNet/MobileNet) to SNNs** using threshold balancing & weight normalization.
- Write **DVS AER event noise filters** (Background Activity Filter, Spatio-Temporal Correlation).
- Calculate exact **SWaP-C energy profiles** (SOPs vs FLOPs) for edge deployment.`,
    },
  ]);

  const presetQueries = [
    {
      title: "Intel Lava SNN Pipeline",
      query: "Write a complete Intel Lava neuromorphic Python script defining a 3-layer Leaky Integrate-and-Fire (LIF) network with Dense processes and run it on the Loihi 2 simulator.",
    },
    {
      title: "snnTorch Surrogate Gradient Training",
      query: "Write a PyTorch / snnTorch training script for DVS gesture classification using FastSigmoid surrogate gradients and Leaky LIF neurons with recurrent feedback.",
    },
    {
      title: "DVS Event Denoising in C++",
      query: "Provide high-performance C++ implementation of a refractory spatio-temporal background activity filter (BAF) for DVS event camera streams (x, y, timestamp_us, polarity).",
    },
    {
      title: "ANN to SNN Conversion",
      query: "Explain the mathematical algorithm for converting a trained ReLU ANN into an ultra-low-latency SNN without loss of accuracy using robust weight normalization.",
    },
  ];

  const handleSend = async (textToSend?: string) => {
    const userMessage = textToSend || prompt;
    if (!userMessage.trim() || isLoading) return;

    const newHistory = [...history, { role: "user" as const, content: userMessage }];
    setHistory(newHistory);
    setPrompt("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/neuromorphic-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userMessage,
          context: {
            hardwareTarget,
            frameworkTarget,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error ${res.status}`);
      }

      const data = await res.json();
      setHistory([
        ...newHistory,
        { role: "assistant" as const, content: data.response || "No response generated." },
      ]);
    } catch (err: any) {
      setHistory([
        ...newHistory,
        {
          role: "assistant" as const,
          content: `⚠️ Failed to query Neuromorphic AI Co-pilot: ${err.message}. Please verify server connection.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSession = () => {
    const markdown = history
      .map((m) => `### ${m.role === "user" ? "USER" : "NEUROMORPHIC ARCHITECT"}\n\n${m.content}\n\n---\n`)
      .join("\n");
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "neuromorphic-architecture-session.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
              AI CO-PILOT
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Neuromorphic AI Architect & Code Synthesizer
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gemini-powered domain expert for SNN architectures, neuromorphic hardware compilation, and Lava/snnTorch code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadSession}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Session</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setSubTab("copilot")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            subTab === "copilot"
              ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Co-Pilot &amp; Code Synthesizer</span>
        </button>

        <button
          onClick={() => setSubTab("wasm_sandbox")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            subTab === "wasm_sandbox"
              ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Play className="w-4 h-4 text-cyan-400" />
          <span>In-Browser WASM C++ Microcode Execution Engine</span>
        </button>
      </div>

      {subTab === "wasm_sandbox" ? (
        <MicrocodeSandbox />
      ) : (
        <>
          {/* Target Spec Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-slate-400">Target Silicon:</span>
          <select
            value={hardwareTarget}
            onChange={(e) => setHardwareTarget(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-cyan-300 rounded px-2.5 py-1 font-mono text-xs cursor-pointer focus:outline-none focus:border-cyan-500"
          >
            <option value="Intel Loihi 2">Intel Loihi 2 (Lava)</option>
            <option value="BrainChip Akida">BrainChip Akida AKD1000 (MetaTF)</option>
            <option value="SynSense Speck">SynSense Speck (Sinabs)</option>
            <option value="SpiNNaker 2">SpiNNaker 2 (PyNN)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-slate-400">Software Framework:</span>
          <select
            value={frameworkTarget}
            onChange={(e) => setFrameworkTarget(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-emerald-300 rounded px-2.5 py-1 font-mono text-xs cursor-pointer focus:outline-none focus:border-emerald-500"
          >
            <option value="Intel Lava">Intel Lava (Neuromorphic Microcode)</option>
            <option value="snnTorch">snnTorch (PyTorch Spiking)</option>
            <option value="SpikingJelly">SpikingJelly</option>
            <option value="Brian2 / NEST">Brian 2 (Computational Neuroscience)</option>
            <option value="Modern C++">Modern C++ (Bare Metal Embedded)</option>
          </select>
        </div>
      </div>

      {/* Preset Query Chips */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-slate-400">Quick-Launch Research Prompts:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {presetQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pq.query)}
              disabled={isLoading}
              className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-cyan-500/60 text-left transition-all cursor-pointer group"
            >
              <div className="text-xs font-semibold text-slate-300 group-hover:text-cyan-300 truncate">
                {pq.title}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{pq.query}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4">
        {history.map((msg, index) => {
          const isAi = msg.role === "assistant";
          return (
            <div
              key={index}
              className={`p-5 rounded-xl border ${
                isAi
                  ? "bg-slate-900/80 border-cyan-500/30 text-slate-200"
                  : "bg-slate-950 border-slate-800 text-white"
              }`}
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  {isAi ? (
                    <>
                      <div className="w-5 h-5 rounded bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold font-mono text-cyan-300">
                        NEUROMORPHIC SCIENTIST
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-slate-300">
                        <Terminal className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-400">
                        RESEARCH QUERY
                      </span>
                    </>
                  )}
                </div>

                {isAi && (
                  <button
                    onClick={() => copyToClipboard(msg.content)}
                    className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                )}
              </div>

              <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="p-5 rounded-xl border border-cyan-500/30 bg-slate-900/60 flex items-center gap-3 text-xs font-mono text-cyan-300 animate-pulse">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>Synthesizing neuromorphic model & microcode with Gemini 2.5 Flash...</span>
          </div>
        )}
      </div>

      {/* Input Field */}
      <div className="p-2 rounded-xl border border-slate-800 bg-slate-950 focus-within:border-cyan-500/80 transition-all flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask for SNN models, Lava code, surrogate gradients, or edge energy budgets..."
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white focus:outline-none placeholder:text-slate-600 font-sans"
        />

        <button
          onClick={() => handleSend()}
          disabled={!prompt.trim() || isLoading}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Generate</span>
        </button>
      </div>
      </>
      )}
    </div>
  );
}
