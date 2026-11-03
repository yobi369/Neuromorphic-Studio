import { useState } from "react";
import { TabMode, UserProfile } from "../types";
import { spikeAudio } from "../utils/audioSynth";
import {
  Brain,
  Camera,
  Activity,
  Network,
  Zap,
  Cpu,
  Bot,
  Volume2,
  VolumeX,
  BookOpen,
  Sparkles,
  FolderOpen,
  Radio,
  Code2,
  ShieldCheck,
  ChevronDown,
  CreditCard,
  Award,
  TrendingUp,
  Rocket,
  Share2,
} from "lucide-react";

interface HeaderProps {
  activeTab: TabMode;
  onSelectTab: (tab: TabMode) => void;
  userProfile: UserProfile;
  activeProjectName: string;
  onOpenProjects: () => void;
  onOpenPricing: () => void;
  onOpenHardware: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  sparseActivityRate?: number; // e.g. 96.4% sparsity
  currentFps?: number;
}

export function Header({
  activeTab,
  onSelectTab,
  userProfile,
  activeProjectName,
  onOpenProjects,
  onOpenPricing,
  onOpenHardware,
  onOpenExport,
  onOpenShare,
  sparseActivityRate = 96.4,
  currentFps = 60,
}: HeaderProps) {
  const [audioEnabled, setAudioEnabled] = useState(false);

  const handleAudioToggle = () => {
    const isNowActive = spikeAudio.toggleMute();
    setAudioEnabled(isNowActive);
    if (isNowActive) {
      spikeAudio.playSpike(0.8, 1.2);
    }
  };

  const navItems: { id: TabMode; label: string; icon: any; step: string }[] = [
    { id: "overview", label: "Infographic Overview", icon: BookOpen, step: "00" },
    { id: "dvs_encoder", label: "DVS & Spike Encoding", icon: Camera, step: "01" },
    { id: "neuron_models", label: "Neuron Dynamics", icon: Activity, step: "02" },
    { id: "snn_network", label: "SNN & Raster Plot", icon: Network, step: "03" },
    { id: "stdp_lab", label: "STDP Plasticity", icon: Zap, step: "04" },
    { id: "hardware_profiler", label: "Hardware & Energy", icon: Cpu, step: "05" },
    { id: "benchmark_evaluator", label: "SNN Benchmarks", icon: Award, step: "06" },
    { id: "roi_calculator", label: "Fleet TCO & ROI", icon: TrendingUp, step: "07" },
    { id: "robotics_control", label: "Edge Robotics", icon: Bot, step: "08" },
    { id: "ai_architect", label: "AI Co-Pilot & Code", icon: Sparkles, step: "09" },
  ];

  const tierColors = {
    community: "bg-slate-800 text-slate-300 border-slate-700",
    pro: "bg-cyan-950/90 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20",
    enterprise: "bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20",
  };

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-900/40 bg-slate-950/90 backdrop-blur-md text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Brand Logo & Badges */}
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => onSelectTab("overview")}
            >
              <div className="relative w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:border-cyan-400 transition-colors">
                <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                    NEUROMORPHIC STUDIO
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPricing();
                    }}
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border flex items-center gap-1 hover:brightness-110 transition-all ${
                      tierColors[userProfile.tier]
                    }`}
                    title="Click to view commercial licensing and plans"
                  >
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span>{userProfile.tier.toUpperCase()}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Event-Driven Spiking Neural Networks &amp; Silicon Lab
                </p>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1.5 lg:hidden">
              <button
                onClick={onOpenShare}
                className="p-1.5 rounded-lg border border-cyan-400/60 bg-cyan-950 text-cyan-300 text-xs flex items-center gap-1 font-bold shadow-sm shadow-cyan-500/20 animate-pulse"
                title="Share & Launch App"
              >
                <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-mono">SHARE</span>
              </button>
              <button
                onClick={onOpenPricing}
                className="p-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/70 text-cyan-300 text-xs flex items-center gap-1 font-semibold"
                title="Subscription & Plans"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">PLANS</span>
              </button>
              <button
                onClick={onOpenProjects}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 text-xs"
                title="Projects"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenHardware}
                className="p-1.5 rounded-lg border border-cyan-900/60 bg-cyan-950/50 text-cyan-300 text-xs"
                title="Hardware Bridge"
              >
                <Radio className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenExport}
                className="p-1.5 rounded-lg border border-emerald-900/60 bg-emerald-950/50 text-emerald-300 text-xs"
                title="Export Code"
              >
                <Code2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleAudioToggle}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  audioEnabled
                    ? "bg-emerald-950/70 border-emerald-500/60 text-emerald-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
                title={audioEnabled ? "Mute spike audio" : "Enable spike audio"}
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Desktop Commercial Toolset & Telemetry */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Project Experiment Pill */}
            <button
              onClick={onOpenProjects}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors group"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <div className="text-left">
                <span className="text-[10px] block text-slate-500 font-mono">EXPERIMENT</span>
                <span className="font-semibold text-slate-200 group-hover:text-cyan-300 truncate max-w-[130px] inline-block">
                  {activeProjectName}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {/* Hardware Bridge Pill */}
            <button
              onClick={onOpenHardware}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 text-xs transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="text-left">
                <span className="text-[10px] block text-slate-500 font-mono">HITL BRIDGE</span>
                <span className="font-semibold text-emerald-300 text-[11px]">3 Silicon Online</span>
              </div>
            </button>

            {/* Subscription & Pricing Pill */}
            <button
              onClick={onOpenPricing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-900 to-cyan-950/70 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-semibold shadow-sm transition-all group"
            >
              <CreditCard className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Subscription &amp; Plans</span>
            </button>

            {/* Share & Launch Pill */}
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-emerald-500/20 border border-cyan-400/60 hover:border-cyan-300 text-cyan-200 text-xs font-bold shadow-md shadow-cyan-950/50 transition-all hover:scale-102 cursor-pointer"
              title="Launch & Share public app link with collaborators"
            >
              <Rocket className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Share &amp; Launch</span>
            </button>

            {/* Export & Deploy Pill */}
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-950 to-slate-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-xs font-semibold shadow-sm transition-all"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export &amp; Deploy</span>
            </button>

            {/* Live Sparsity & Telemetry */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-1 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Sparsity:</span>
                <span className="text-emerald-400 font-bold">{sparseActivityRate.toFixed(1)}%</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center gap-1 text-slate-300">
                <span className="text-cyan-400">{currentFps} FPS</span>
              </div>
            </div>

            {/* Audio Toggle */}
            <button
              onClick={handleAudioToggle}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                audioEnabled
                  ? "bg-emerald-950/80 border-emerald-500/70 text-emerald-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Web Audio extracellular action potential clicks"
            >
              {audioEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Bio-Audio</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Mute</span>
                </>
              )}
            </button>

            {/* License / Upgrade Button */}
            <button
              onClick={onOpenPricing}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-sm transition-colors"
            >
              {userProfile.tier === "enterprise" ? "Manage License" : "Upgrade / Buy"}
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <nav className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/10"
                    : "bg-transparent border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <span className="text-[10px] font-mono text-cyan-500/70">{item.step}</span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
