import { useState, useEffect, type FormEvent, type MouseEvent } from "react";
import { ProjectExperiment, CommercialTier } from "../types";
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Check,
  Tag,
  Cpu,
  Layers,
  X,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ProjectWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectId: string;
  onSelectProject: (project: ProjectExperiment) => void;
  activeWorkspace: string;
  onSelectWorkspace: (workspace: string) => void;
  tier: CommercialTier;
}

export function ProjectWorkspaceModal({
  isOpen,
  onClose,
  currentProjectId,
  onSelectProject,
  activeWorkspace,
  onSelectWorkspace,
  tier,
}: ProjectWorkspaceModalProps) {
  const [projects, setProjects] = useState<ProjectExperiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // New Project Form State
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectCategory, setNewProjectCategory] = useState<
    "Vision & DVS" | "Robotics Reflex" | "Auditory & Speech" | "Bio-Physiology" | "Edge Silicon"
  >("Vision & DVS");
  const [newProjectHardware, setNewProjectHardware] = useState("Intel Loihi 2 (Lava SDK)");
  const [newProjectNeurons, setNewProjectNeurons] = useState(128);

  const workspaces = [
    "Autonomous Robotics Lab",
    "Defense Edge Systems Lab",
    "Biomedical Neural Interfaces",
    "Personal Sandbox",
  ];

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProj: Partial<ProjectExperiment> = {
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || "Custom Neuromorphic Architecture Experiment",
      category: newProjectCategory,
      targetHardware: newProjectHardware,
      neuronCount: newProjectNeurons,
      synapseCount: newProjectNeurons * 32,
      sparsityPercent: 97.2,
      tags: [newProjectCategory.split(" ")[0], "Custom"],
      config: {
        modelType: "lif",
        encodingScheme: "delta_dvs",
        layers: [newProjectNeurons, Math.floor(newProjectNeurons / 2), 10],
        isStdpEnabled: true,
        tau_m: 20.0,
      },
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProj),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProjects([data.project, ...projects]);
        onSelectProject(data.project);
        setIsCreating(false);
        setNewProjectName("");
        setNewProjectDesc("");
      }
    } catch (err: any) {
      alert("Error creating project: " + err.message);
    }
  };

  const handleDelete = async (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this experiment?")) return;
    try {
      await fetch(`/api/projects/${id}`, { method: "DELETE" });
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleExportJson = (project: ProjectExperiment, e: MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.targetHardware.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 px-6 py-5 border-b border-cyan-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">
                  Projects &amp; Experiments Hub
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {projects.length} Experiments
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Load saved SNN topologies, DVS configurations, and hardware parameters
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

        {/* Workspace Toolbar */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-900 flex flex-wrap items-center justify-between gap-3">
          {/* Workspace Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Active Workspace:</span>
            <select
              value={activeWorkspace}
              onChange={(e) => onSelectWorkspace(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-cyan-300 font-semibold text-xs focus:outline-none focus:border-cyan-400"
            >
              {workspaces.map((ws) => (
                <option key={ws} value={ws}>
                  {ws}
                </option>
              ))}
            </select>
          </div>

          {/* Search and Add */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <input
              type="text"
              placeholder="Search experiments, hardware, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs whitespace-nowrap transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreating ? "Cancel" : "New Experiment"}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-5">
          {/* CREATE NEW FORM */}
          {isCreating && (
            <form
              onSubmit={handleCreateProject}
              className="p-5 rounded-xl bg-slate-900/90 border border-cyan-500/50 space-y-4 animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Create New Neuromorphic Experiment
                </h3>
                <span className="text-[11px] font-mono text-cyan-400">
                  Tier: {tier.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Experiment Name</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Prophesee Event-Stream Gesture Decoder"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Target Neuromorphic Hardware</label>
                  <select
                    value={newProjectHardware}
                    onChange={(e) => setNewProjectHardware(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Intel Loihi 2 (Lava SDK)">Intel Loihi 2 (Lava SDK)</option>
                    <option value="BrainChip Akida AKD1000">BrainChip Akida AKD1000</option>
                    <option value="SynSense Speck SoC">SynSense Speck SoC</option>
                    <option value="SpiNNaker 2 Massive Parallel">SpiNNaker 2 Massive Parallel</option>
                    <option value="Embedded ARM Cortex Micro-SNN">Embedded ARM Cortex Micro-SNN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Domain Category</label>
                  <select
                    value={newProjectCategory}
                    onChange={(e: any) => setNewProjectCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Vision & DVS">Vision &amp; DVS Event Processing</option>
                    <option value="Robotics Reflex">Robotics Reflex &amp; Motor Loop</option>
                    <option value="Auditory & Speech">Auditory &amp; Speech Cochlea</option>
                    <option value="Bio-Physiology">Bio-Physiology &amp; Cortical Rhythm</option>
                    <option value="Edge Silicon">Edge Silicon &amp; Ultra-Low Power</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Neuron Scale (Hidden &amp; Reservoir)</label>
                  <input
                    type="number"
                    min="16"
                    max="1024"
                    value={newProjectNeurons}
                    onChange={(e) => setNewProjectNeurons(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-slate-300 font-medium">Brief Description</label>
                  <textarea
                    rows={2}
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Describe the biological dynamics, encoding objectives, or edge constraints..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                >
                  Save &amp; Initialize Experiment
                </button>
              </div>
            </form>
          )}

          {/* PROJECT LIST */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Synchronizing workspace experiments...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              No experiments found matching "{searchQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((proj) => {
                const isActive = proj.id === currentProjectId;

                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj);
                      onClose();
                    }}
                    className={`group p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isActive
                        ? "bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/50"
                        : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                              {proj.category}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                Loaded
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors mt-1.5">
                            {proj.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={(e) => handleExportJson(proj, e)}
                            title="Export Experiment Bundle (JSON)"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(proj.id, e)}
                            title="Delete Experiment"
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 hover:text-rose-300 text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {proj.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        <span className="truncate max-w-[160px]">{proj.targetHardware}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>{proj.neuronCount} Neurons</span>
                        <span className="text-emerald-400 font-bold">{proj.sparsityPercent}% Sparsity</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div>
            Synchronized with Central Neuromorphic Cloud • REST /api/projects Active
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
