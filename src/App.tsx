import { useState, useEffect } from "react";
import { AppTab, CommercialTier, UserProfile, ProjectExperiment } from "./types";
import { Header } from "./components/Header";
import { OverviewView } from "./components/OverviewView";
import { DvsEncoderView } from "./components/DvsEncoderView";
import { NeuronSandboxView } from "./components/NeuronSandboxView";
import { SnnNetworkView } from "./components/SnnNetworkView";
import { StdpLabView } from "./components/StdpLabView";
import { HardwareProfilerView } from "./components/HardwareProfilerView";
import { BenchmarkEvaluator } from "./components/BenchmarkEvaluator";
import { NeuromorphicRoiCalculator } from "./components/NeuromorphicRoiCalculator";
import { RoboticsControlView } from "./components/RoboticsControlView";
import { AiArchitectView } from "./components/AiArchitectView";
import { CommercialHubModal } from "./components/CommercialHubModal";
import { ProjectWorkspaceModal } from "./components/ProjectWorkspaceModal";
import { ModelExporterModal } from "./components/ModelExporterModal";
import { HardwareBridgeModal } from "./components/HardwareBridgeModal";
import { ShareLaunchModal } from "./components/ShareLaunchModal";

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("overview");

  // User Profile & Commercial Tier State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem("neuromorphic_user_profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const isLegacyDemoProfile =
          parsed?.email === "elena.rostova@neuromorphic-systems.org" ||
          parsed?.licenseKey === "NEURO-PRO-2026-RCH3-AKIDA";
        if (!isLegacyDemoProfile) return parsed;
        localStorage.removeItem("neuromorphic_user_profile");
      } catch {
        localStorage.removeItem("neuromorphic_user_profile");
      }
    }
    return {
      id: "usr-8819",
      name: "Researcher",
      email: "",
      institution: "Personal workspace",
      tier: "community" as CommercialTier,
      role: "Research Engineer",
      licenseKey: "",
      licenseValidUntil: "",
      activeWorkspace: "My workspace",
    };
  });

  useEffect(() => {
    localStorage.setItem("neuromorphic_user_profile", JSON.stringify(userProfile));
  }, [userProfile]);

  // Current Experiment / Project State
  const [activeProject, setActiveProject] = useState<ProjectExperiment>({
    id: "proj-dvs-optical-flow",
    name: "High-Speed DVS Gesture & Optical Flow",
    description: "Asynchronous AER event stream filtering and temporal motion vector extraction on Prophesee EVK4.",
    category: "Vision & DVS",
    targetHardware: "SynSense Speck / Prophesee EVK4",
    createdAt: "2026-08-20T10:00:00Z",
    updatedAt: "2026-09-02T16:30:00Z",
    neuronCount: 128,
    synapseCount: 4096,
    sparsityPercent: 96.8,
    tags: ["DVS", "Optical Flow", "AER", "Sub-1ms"],
    config: {
      modelType: "lif",
      encodingScheme: "delta_dvs",
      layers: [64, 48, 16],
      isStdpEnabled: true,
      tau_m: 20.0,
    },
  });

  // Modal Visibility States
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isHardwareOpen, setIsHardwareOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const handleUpdateTier = (newTier: CommercialTier, newLicenseKey?: string) => {
    setUserProfile((prev) => ({
      ...prev,
      tier: newTier,
      licenseKey: newLicenseKey || prev.licenseKey,
    }));
  };

  const handleSelectWorkspace = (workspace: string) => {
    setUserProfile((prev) => ({
      ...prev,
      activeWorkspace: workspace,
    }));
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Application Header with Live Telemetry & Commercial Toolset */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userProfile={userProfile}
        activeProjectName={activeProject.name}
        onOpenProjects={() => setIsProjectsOpen(true)}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenHardware={() => setIsHardwareOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === "overview" && (
          <OverviewView
            onNavigate={(tab: AppTab) => setActiveTab(tab)}
            onOpenPricing={() => setIsPricingOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
          />
        )}

        {activeTab === "dvs_encoder" && <DvsEncoderView />}

        {activeTab === "neuron_models" && <NeuronSandboxView />}

        {activeTab === "snn_network" && <SnnNetworkView />}

        {activeTab === "stdp_lab" && <StdpLabView />}

        {activeTab === "hardware_profiler" && <HardwareProfilerView />}

        {activeTab === "benchmark_evaluator" && <BenchmarkEvaluator />}

        {activeTab === "roi_calculator" && <NeuromorphicRoiCalculator />}

        {activeTab === "robotics_control" && <RoboticsControlView />}

        {activeTab === "ai_architect" && <AiArchitectView />}
      </main>

      {/* Commercial Modals */}
      <CommercialHubModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        userProfile={userProfile}
        onUpdateTier={handleUpdateTier}
      />

      <ProjectWorkspaceModal
        isOpen={isProjectsOpen}
        onClose={() => setIsProjectsOpen(false)}
        currentProjectId={activeProject.id}
        onSelectProject={(proj) => setActiveProject(proj)}
        activeWorkspace={userProfile.activeWorkspace}
        onSelectWorkspace={handleSelectWorkspace}
        tier={userProfile.tier}
      />

      <ModelExporterModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        tier={userProfile.tier}
        onOpenPricing={() => {
          setIsExportOpen(false);
          setIsPricingOpen(true);
        }}
      />

      <HardwareBridgeModal
        isOpen={isHardwareOpen}
        onClose={() => setIsHardwareOpen(false)}
        tier={userProfile.tier}
        onOpenPricing={() => {
          setIsHardwareOpen(false);
          setIsPricingOpen(true);
        }}
      />

      <ShareLaunchModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 mt-auto text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse" />
            <span>NEUROMORPHIC STUDIO ENTERPRISE • LICENSED TO: {userProfile.institution.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsShareOpen(true)}
              className="text-cyan-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>🚀 Share / Launch Link</span>
            </button>
            <span>•</span>
            <span>Tier: {userProfile.tier.toUpperCase()}</span>
            <span>•</span>
            <button
              onClick={() => setIsPricingOpen(true)}
              className="text-slate-400 hover:text-slate-200"
            >
              Commercial License EULA
            </button>
            <span>•</span>
            <span>Compatible: Intel Loihi 2, BrainChip Akida &amp; Prophesee EVK4</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


