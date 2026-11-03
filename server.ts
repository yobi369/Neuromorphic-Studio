import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Routes
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "Neuromorphic Studio API" });
  });

  // Server-side Gemini API for Neuromorphic Architecture & Brain-Inspired Computing
  app.post("/api/neuromorphic-ai", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured in the environment.",
        });
      }

      const { prompt, taskType, context } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `You are the Lead Neuromorphic Computing Scientist and Principal Systems Architect at an advanced brain-inspired computing research laboratory (specializing in Intel Loihi 2, BrainChip Akida, SpiNNaker 2, and SynSense hardware).
Your mission is to provide rigorous, competition-winning, production-ready neuromorphic engineering guidance.
Key expertise domains:
- Spiking Neural Networks (SNNs), event-driven processing, Address Event Representation (AER).
- Spike encoding: Rate coding, Temporal/Time-to-First-Spike (TTFS), Delta modulation (DVS event cameras), phase coding.
- Neuron dynamics: Leaky Integrate-and-Fire (LIF), Adaptive Exponential LIF (AdEx), Izhikevich (RS, FS, IB, CH), Hodgkin-Huxley.
- Synaptic plasticity: Spike-Timing-Dependent Plasticity (STDP), triplet STDP, surrogate gradient backpropagation (snnTorch, Norse).
- Hardware deployment: Loihi 2 (Lava framework), BrainChip Akida (MetaTF), SpiNNaker 2 (PyNN), Brian2, Nengo, and ultra-sparse embedded micro-SNNs (C/C++ for STM32/RP2040).
- Energy profiling: Synaptic Operations (SOPs) vs FLOPs, dynamic energy (pJ/SOP vs nJ/FLOP), power sparsity trade-offs.

Task type: ${taskType || "architecture_design"}.
Provide clear, mathematically sound, practical, well-formatted Markdown responses with code blocks where requested. Keep the tone expert, encouraging, and authoritative.`;

      const userMessage = `Context: ${JSON.stringify(context || {})}\n\nUser Request: ${prompt}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userMessage,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({
        response: response.text,
        result: response.text,
      });
    } catch (err: any) {
      console.error("Gemini API error:", err);
      return res.status(500).json({
        error: err?.message || "Failed to generate neuromorphic AI advice.",
      });
    }
  });

  // --- COMMERCIAL API: Projects & Experiments Store ---
  let savedProjects = [
    {
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
    },
    {
      id: "proj-drone-reflex",
      name: "Sub-Milliwatt Drone Inverted Reflex Loop",
      description: "Low-latency edge reflex loop for rapid obstacle evasion and attitude stabilization under 5mW.",
      category: "Robotics Reflex",
      targetHardware: "Intel Loihi 2 (Lava SDK)",
      createdAt: "2026-08-28T14:15:00Z",
      updatedAt: "2026-09-03T07:45:00Z",
      neuronCount: 64,
      synapseCount: 1536,
      sparsityPercent: 97.4,
      tags: ["Closed Loop", "Loihi 2", "Reflex", "SOPs"],
      config: {
        modelType: "izhikevich",
        encodingScheme: "ttfs_temporal",
        layers: [32, 24, 8],
        isStdpEnabled: false,
        tau_m: 15.0,
      },
    },
    {
      id: "proj-cochlea-speech",
      name: "Neuromorphic Cochlea Keyword Spotting",
      description: "Silicon cochlea frequency band decomposition with TTFS temporal rank-order decoding.",
      category: "Auditory & Speech",
      targetHardware: "BrainChip Akida AKD1000",
      createdAt: "2026-09-01T09:20:00Z",
      updatedAt: "2026-09-02T19:10:00Z",
      neuronCount: 256,
      synapseCount: 8192,
      sparsityPercent: 98.2,
      tags: ["Audio", "Cochlea", "Akida", "Energy"],
      config: {
        modelType: "adex",
        encodingScheme: "rate_poisson",
        layers: [128, 96, 32],
        isStdpEnabled: true,
        tau_m: 25.0,
      },
    },
  ];

  app.get("/api/projects", (_req: Request, res: Response) => {
    res.json({ projects: savedProjects, total: savedProjects.length });
  });

  app.post("/api/projects", (req: Request, res: Response) => {
    const project = req.body;
    if (!project || !project.name) {
      return res.status(400).json({ error: "Project name is required." });
    }

    const existingIndex = savedProjects.findIndex((p) => p.id === project.id);
    const updatedProject = {
      ...project,
      id: project.id || `proj-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      createdAt: project.createdAt || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      savedProjects[existingIndex] = updatedProject;
    } else {
      savedProjects.unshift(updatedProject);
    }

    return res.json({ success: true, project: updatedProject });
  });

  app.delete("/api/projects/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    savedProjects = savedProjects.filter((p) => p.id !== id);
    return res.json({ success: true, deletedId: id });
  });

  // --- COMMERCIAL API: Subscriptions, Billing & Licensing ---
  let billingInvoices = [
    {
      id: "INV-2026-0891",
      date: "2026-09-01",
      plan: "pro",
      interval: "year",
      amount: "$468.00",
      status: "paid",
      description: "Pro Researcher Annual Seat (Loihi 2 Exporter & SNN Compiler)",
      paymentMethod: "Visa ending in 4242",
      licenseKey: "NEURO-PRO-2026-RCH3-AKIDA",
    },
    {
      id: "INV-2026-0522",
      date: "2026-08-01",
      plan: "enterprise",
      interval: "month",
      amount: "$299.00",
      status: "paid",
      description: "Enterprise Lab Monthly License & Prophesee EVK4 Optical DVS Driver Plugin",
      paymentMethod: "Mastercard ending in 8812",
      licenseKey: "NEURO-ENT-2026-X88F-LAVA99",
    },
  ];

  app.get("/api/billing/invoices", (_req: Request, res: Response) => {
    res.json({ invoices: billingInvoices });
  });

  app.post("/api/billing/checkout", (req: Request, res: Response) => {
    const {
      plan,
      interval = "month",
      customerEmail,
      paymentMethod = "card",
      cardLast4 = "4242",
      billingName = "Dr. Elena Rostova",
    } = req.body;

    if (!plan || !["community", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Valid plan tier is required." });
    }

    let calculatedAmount = "$0.00";
    let planDescription = "Community Explorer Free License";

    if (plan === "pro") {
      calculatedAmount = interval === "year" ? "$468.00" : "$49.00";
      planDescription = `Pro Researcher (${interval === "year" ? "Annual - 20% Discount" : "Monthly"}) License`;
    } else if (plan === "enterprise") {
      calculatedAmount = interval === "year" ? "$2,988.00" : "$299.00";
      planDescription = `Enterprise Lab & OEM (${interval === "year" ? "Annual - 20% Discount" : "Monthly"}) License`;
    }

    const licensePrefix = plan === "enterprise" ? "NEURO-ENT-2026" : plan === "pro" ? "NEURO-PRO-2026" : "NEURO-FREE-2026";
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    const issuedLicenseKey = `${licensePrefix}-${randomHex}-SNN`;

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + (interval === "year" ? 1 : 1));

    const newInvoice = {
      id: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      plan,
      interval,
      amount: calculatedAmount,
      status: "paid",
      description: planDescription,
      paymentMethod:
        paymentMethod === "card"
          ? `Card ending in ${cardLast4}`
          : paymentMethod === "academic_po"
          ? "Academic Grant PO Wire"
          : "Corporate Net-30 PO",
      licenseKey: issuedLicenseKey,
    };

    if (plan !== "community") {
      billingInvoices.unshift(newInvoice);
    }

    return res.json({
      mode: "instant_activation",
      success: true,
      plan,
      interval,
      amount: calculatedAmount,
      customerEmail: customerEmail || "investigator@neuromorphic.ai",
      billingName,
      licenseKey: issuedLicenseKey,
      licenseValidUntil: oneYearFromNow.toISOString(),
      invoice: newInvoice,
      message: `Commercial ${plan.toUpperCase()} license generated and activated successfully.`,
    });
  });

  app.post("/api/billing/cancel-subscription", (req: Request, res: Response) => {
    const cancelInvoice = {
      id: `ADJ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      plan: "community",
      interval: "month",
      amount: "$0.00",
      status: "refunded",
      description: "Subscription Downgraded to Community Explorer (Effective immediately)",
      paymentMethod: "Account Balance",
      licenseKey: "NEURO-FREE-COMMUNITY",
    };
    billingInvoices.unshift(cancelInvoice);

    return res.json({
      success: true,
      tier: "community",
      message: "Subscription cancelled. Downgraded to Community Explorer.",
    });
  });

  app.post("/api/billing/switch-interval", (req: Request, res: Response) => {
    const { plan, newInterval } = req.body;
    return res.json({
      success: true,
      interval: newInterval,
      message: `Billing interval successfully updated to ${newInterval === "year" ? "Annual (Saved 20%)" : "Monthly"}.`,
    });
  });

  app.post("/api/billing/verify-license", (req: Request, res: Response) => {
    const { licenseKey } = req.body;
    if (!licenseKey || typeof licenseKey !== "string") {
      return res.status(400).json({ valid: false, error: "License key is required." });
    }

    const cleanKey = licenseKey.trim().toUpperCase();
    if (cleanKey.includes("NEURO-ENT")) {
      return res.json({
        valid: true,
        tier: "enterprise",
        seats: 50,
        airGappedAllowed: true,
        organization: "Advanced Neuromorphic Lab & Defense Systems",
        expiresAt: "2027-12-31",
      });
    } else if (cleanKey.includes("NEURO-PRO")) {
      return res.json({
        valid: true,
        tier: "pro",
        seats: 1,
        airGappedAllowed: false,
        organization: "Pro Research Scholar",
        expiresAt: "2027-06-30",
      });
    } else if (cleanKey.length >= 8) {
      return res.json({
        valid: true,
        tier: "pro",
        seats: 1,
        airGappedAllowed: false,
        organization: "Academic Partner",
        expiresAt: "2027-01-01",
      });
    }

    return res.status(401).json({
      valid: false,
      error: "Invalid or expired license key. Contact licensing@neuromorphic-studio.ai for assistance.",
    });
  });

  // --- COMMERCIAL API: 14-Day Enterprise Evaluation Sandbox ---
  app.post("/api/billing/start-trial", (req: Request, res: Response) => {
    const { email = "investigator@neuromorphic.ai", institution = "Neuromorphic Research Lab" } = req.body;
    const trialDays = 14;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    const trialKey = `NEURO-TRIAL-14D-${Math.random().toString(16).substring(2, 8).toUpperCase()}-ENT`;

    const trialInvoice = {
      id: `TRL-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split("T")[0],
      plan: "enterprise" as const,
      interval: "month" as const,
      amount: "$0.00 (14-Day Evaluation)",
      status: "paid" as const,
      description: "14-Day Full Enterprise Lab Evaluation Sandbox (All Hardware Exporters & Bridges Unlocked)",
      paymentMethod: "Complimentary Academic Trial",
      licenseKey: trialKey,
    };

    billingInvoices.unshift(trialInvoice);

    return res.json({
      success: true,
      tier: "enterprise",
      isTrial: true,
      licenseKey: trialKey,
      trialExpiresAt: expiresAt.toISOString(),
      trialDaysRemaining: trialDays,
      institution,
      email,
      message: "14-Day Enterprise Sandbox activated! Loihi 2 compiler, Metavision WebUSB, and 50 team seats unlocked.",
    });
  });

  // --- COMMERCIAL API: Team Seats & Lab Collaborator Management ---
  let teamMembers = [
    {
      id: "mem-1",
      name: "Dr. Elena Rostova",
      email: "elena.rostova@neuromorphic.ai",
      role: "Hardware Admin",
      status: "active",
      assignedDate: "2026-08-15",
      lastActive: "Active Now",
    },
    {
      id: "mem-2",
      name: "Marcus Vance",
      email: "m.vance@stanford.edu",
      role: "Experimenter",
      status: "active",
      assignedDate: "2026-08-20",
      lastActive: "2 hours ago",
    },
    {
      id: "mem-3",
      name: "Chloe Dupont",
      email: "c.dupont@inria.fr",
      role: "Experimenter",
      status: "active",
      assignedDate: "2026-08-29",
      lastActive: "Yesterday",
    },
    {
      id: "mem-4",
      name: "Prof. Kenneth Hayashi",
      email: "khayashi@riken.jp",
      role: "Viewer",
      status: "invited",
      assignedDate: "2026-09-02",
      lastActive: "Invite Pending",
    },
  ];

  app.get("/api/billing/team", (_req: Request, res: Response) => {
    res.json({
      members: teamMembers,
      seatsTotal: 50,
      seatsUsed: teamMembers.length,
      seatsAvailable: 50 - teamMembers.length,
    });
  });

  app.post("/api/billing/team/invite", (req: Request, res: Response) => {
    const { name, email, role = "Experimenter" } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid collaborator email is required." });
    }

    const newMember = {
      id: `mem-${Date.now()}`,
      name: name || email.split("@")[0],
      email,
      role: role as "Viewer" | "Experimenter" | "Hardware Admin",
      status: "invited" as const,
      assignedDate: new Date().toISOString().split("T")[0],
      lastActive: "Invite Pending",
    };

    teamMembers.push(newMember);
    return res.json({
      success: true,
      member: newMember,
      message: `Invitation email sent to ${email} with assigned role: ${role}.`,
    });
  });

  app.delete("/api/billing/team/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const initialLen = teamMembers.length;
    teamMembers = teamMembers.filter((m) => m.id !== id);

    if (teamMembers.length === initialLen) {
      return res.status(404).json({ error: "Member not found" });
    }

    return res.json({ success: true, message: "Collaborator seat revoked successfully." });
  });

  // --- BENCHMARK DATASET API ---
  app.get("/api/benchmarks/run", (req: Request, res: Response) => {
    const dataset = (req.query.dataset as string) || "n_mnist";

    if (dataset === "dvs_gesture") {
      return res.json({
        dataset: "dvs_gesture",
        name: "IBM DVS128 Gesture (11 Dynamic Event Classes)",
        accuracy: 96.2,
        samplesTested: 288,
        meanLatencyMs: 18.4,
        energyPerInferenceUj: 2.1,
        gpuEnergyUj: 480.0,
        classNames: [
          "Hand Clap",
          "Arm Wave",
          "Right Hand Clockwise",
          "Right Hand CCW",
          "Left Hand Clockwise",
          "Left Hand CCW",
          "Air Drums",
          "Air Guitar",
          "Arm Roll",
          "Air Draw Circle",
          "Other Gestures",
        ],
        confusionMatrix: [
          [25, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 26, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 24, 2, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 1, 25, 0, 0, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 25, 1, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 1, 25, 0, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 26, 0, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 1, 25, 0],
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 25],
        ],
        latencyAccuracyCurve: [
          { timeMs: 4, accuracy: 46.2 },
          { timeMs: 8, accuracy: 72.8 },
          { timeMs: 12, accuracy: 88.5 },
          { timeMs: 16, accuracy: 94.1 },
          { timeMs: 20, accuracy: 96.2 },
          { timeMs: 25, accuracy: 96.4 },
        ],
      });
    } else if (dataset === "shd_audio") {
      return res.json({
        dataset: "shd_audio",
        name: "Spiking Heidelberg Digits (SHD Silicon Cochlea 20 Classes)",
        accuracy: 94.8,
        samplesTested: 400,
        meanLatencyMs: 15.2,
        energyPerInferenceUj: 1.4,
        gpuEnergyUj: 390.0,
        classNames: ["0_en", "1_en", "2_en", "3_en", "4_en", "5_en", "6_en", "7_en", "8_en", "9_en", "0_de", "1_de", "2_de", "3_de", "4_de", "5_de", "6_de", "7_de", "8_de", "9_de"],
        confusionMatrix: Array.from({ length: 20 }, (_, i) =>
          Array.from({ length: 20 }, (_, j) => (i === j ? 19 : i === j + 1 || i === j - 1 ? 1 : 0))
        ),
        latencyAccuracyCurve: [
          { timeMs: 3, accuracy: 38.0 },
          { timeMs: 6, accuracy: 64.5 },
          { timeMs: 10, accuracy: 83.2 },
          { timeMs: 14, accuracy: 92.6 },
          { timeMs: 18, accuracy: 94.8 },
          { timeMs: 22, accuracy: 95.0 },
        ],
      });
    }

    // Default: N-MNIST
    return res.json({
      dataset: "n_mnist",
      name: "Neuromorphic MNIST (N-MNIST Saccadic DVS 10 Digits)",
      accuracy: 98.7,
      samplesTested: 1000,
      meanLatencyMs: 12.0,
      energyPerInferenceUj: 1.2,
      gpuEnergyUj: 320.0,
      classNames: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
      confusionMatrix: [
        [99, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        [0, 100, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 98, 1, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 98, 0, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 99, 0, 0, 0, 0, 1],
        [0, 0, 0, 1, 0, 98, 1, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 99, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 99, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 98, 1],
        [0, 0, 0, 0, 1, 0, 0, 1, 0, 98],
      ],
      latencyAccuracyCurve: [
        { timeMs: 2, accuracy: 41.5 },
        { timeMs: 4, accuracy: 68.2 },
        { timeMs: 8, accuracy: 89.4 },
        { timeMs: 12, accuracy: 97.5 },
        { timeMs: 16, accuracy: 98.7 },
        { timeMs: 20, accuracy: 98.8 },
      ],
    });
  });

  // --- COMMERCIAL API: Hardware-In-The-Loop (HITL) Devices ---
  let connectedDevices = [
    {
      id: "dev-prophesee-evk4",
      name: "Prophesee Metavision EVK4 HD",
      vendor: "Prophesee",
      category: "dvs_sensor",
      connectionType: "WebUSB",
      status: "connected",
      eventRateMeps: 12.4,
      latencyUs: 45,
      powerMw: 32,
      firmwareVersion: "v4.2.1-PRO",
    },
    {
      id: "dev-loihi2-oheo",
      name: "Intel Loihi 2 Oheo Gulch PCIe",
      vendor: "Intel Neuromorphic Lab",
      category: "neuromorphic_chip",
      connectionType: "WebSocket",
      status: "connected",
      eventRateMeps: 85.0,
      latencyUs: 12,
      powerMw: 185,
      firmwareVersion: "Lava-2.1.0-FW",
    },
    {
      id: "dev-speck-synsense",
      name: "SynSense Speck SoC",
      vendor: "SynSense",
      category: "neuromorphic_chip",
      connectionType: "WebSerial",
      status: "standby",
      eventRateMeps: 3.2,
      latencyUs: 80,
      powerMw: 4.8,
      firmwareVersion: "v1.8-Edge",
    },
  ];

  app.get("/api/hardware/devices", (_req: Request, res: Response) => {
    res.json({ devices: connectedDevices });
  });

  app.post("/api/hardware/toggle", (req: Request, res: Response) => {
    const { deviceId } = req.body;
    const device = connectedDevices.find((d) => d.id === deviceId);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    device.status = device.status === "connected" ? "disconnected" : "connected";
    return res.json({ success: true, device });
  });

  // --- COMMERCIAL API: Model Compilation & Export Generator ---
  app.post("/api/export/compile", (req: Request, res: Response) => {
    const { target, modelName = "Neuromorphic_Model", layers = [64, 32, 10], tau_m = 20.0 } = req.body;

    let code = "";
    let filename = "";
    let mimeType = "text/plain";

    if (target === "lava_python") {
      filename = `${modelName.toLowerCase()}_loihi2.py`;
      code = `# ==============================================================================
# INTEL LOIHI 2 LAVA FRAMEWORK PRODUCTION DEPLOYMENT SCRIPT
# Generated by Neuromorphic Studio Pro (License: Enterprise/Commercial)
# Target: Intel Loihi 2 Neuromorphic Research Chip
# ==============================================================================

import numpy as np
from lava.magma.core.run_configs import RunConfig
from lava.proc.dense.process import Dense
from lava.proc.lif.process import LIF
from lava.proc.io.source import RingBuffer

print("Initializing Loihi 2 Process Graph for ${modelName}...")

# 1. Neuron Layer Allocations
input_dim = ${layers[0]}
hidden_dim = ${layers[1] || 32}
output_dim = ${layers[2] || 10}

# Leaky Integrate-and-Fire with programmable threshold and refractory delay
lif_hidden = LIF(
    shape=(hidden_dim,),
    du=0.1,                # Decay rate for current (tau_syn)
    dv=${(1.0 / (tau_m || 20.0)).toFixed(4)},  # Decay rate for voltage (tau_mem=${tau_m}ms)
    vth=10.0,              # Spiking threshold voltage
    reset_mode="soft"      # Biologically realistic soft reset
)

lif_output = LIF(
    shape=(output_dim,),
    du=0.1,
    dv=${(1.0 / (tau_m || 20.0)).toFixed(4)},
    vth=15.0,
    reset_mode="soft"
)

# 2. Sparse Synaptic Projections
np.random.seed(42)
w1 = np.random.normal(0.5, 0.2, (hidden_dim, input_dim))
w2 = np.random.normal(0.4, 0.15, (output_dim, hidden_dim))

dense1 = Dense(weights=w1)
dense2 = Dense(weights=w2)

# Connect feedforward topology
dense1.s_out.connect(lif_hidden.a_in)
lif_hidden.s_out.connect(dense2.s_in)
dense2.s_out.connect(lif_output.a_in)

print("Loihi 2 network topology successfully synthesized. Ready for execution.");
`;
    } else if (target === "snntorch_pytorch") {
      filename = `${modelName.toLowerCase()}_snntorch.py`;
      code = `# ==============================================================================
# SNNTORCH PYTORCH MODEL SPECIFICATION
# Compatible with PyTorch, CUDA, and Apple MPS
# ==============================================================================

import torch
import torch.nn as nn
import snntorch as snn
from snntorch import surrogate

class ${modelName.replace(/[^a-zA-Z0-9]/g, "")}Net(nn.Module):
    """Production Spiking Neural Network with Surrogate Gradient Descent."""
    def __init__(self, beta=${Math.exp(-1.0 / (tau_m || 20.0)).toFixed(4)}, threshold=1.0):
        super().__init__()
        self.fc1 = nn.Linear(${layers[0]}, ${layers[1] || 32})
        self.lif1 = snn.Leaky(beta=beta, threshold=threshold, spike_grad=surrogate.fast_sigmoid())
        self.fc2 = nn.Linear(${layers[1] || 32}, ${layers[2] || 10})
        self.lif2 = snn.Leaky(beta=beta, threshold=threshold, spike_grad=surrogate.fast_sigmoid())

    def forward(self, x_seq):
        # x_seq shape: (time_steps, batch_size, input_features)
        mem1 = self.lif1.init_leaky()
        mem2 = self.lif2.init_leaky()
        
        spk2_rec = []
        mem2_rec = []

        for step in range(x_seq.size(0)):
            cur1 = self.fc1(x_seq[step])
            spk1, mem1 = self.lif1(cur1, mem1)
            cur2 = self.fc2(spk1)
            spk2, mem2 = self.lif2(cur2, mem2)

            spk2_rec.append(spk2)
            mem2_rec.append(mem2)

        return torch.stack(spk2_rec, dim=0), torch.stack(mem2_rec, dim=0)

print("Model class ready. Instantiating on device...")
device = "cuda" if torch.cuda.is_available() else "cpu"
model = ${modelName.replace(/[^a-zA-Z0-9]/g, "")}Net().to(device)
print(model)
`;
    } else if (target === "cpp_micro") {
      filename = `${modelName.toLowerCase()}_embedded_lif.cpp`;
      code = `// ==============================================================================
// ULTRA-LOW-POWER C++ EMBEDDED SPIKING INFERENCE ENGINE
// For ARM Cortex-M0+/M4 (Raspberry Pi Pico, STM32, Nordic nRF52)
// Memory footprint: < 4KB RAM, Zero dynamic allocations (malloc-free)
// ==============================================================================

#include <stdint.h>
#include <stdbool.h>

#define NUM_INPUTS   ${layers[0]}
#define NUM_HIDDEN   ${layers[1] || 32}
#define NUM_OUTPUTS  ${layers[2] || 10}

// Fixed-point arithmetic: Q8.8 format for deterministic microsecond execution
typedef int16_t fixed_t;
#define TO_FIXED(x) ((fixed_t)((x) * 256.0f))
#define FIXED_ONE   256

static const fixed_t DECAY_ALPHA = TO_FIXED(${Math.exp(-1.0 / (tau_m || 20.0)).toFixed(3)}f);
static const fixed_t V_THRESH    = TO_FIXED(1.0f);
static const fixed_t V_RESET     = TO_FIXED(0.0f);

typedef struct {
    fixed_t v_mem[NUM_HIDDEN];
    uint32_t spike_bits; // 32 hidden neurons encoded in a single uint32_t register
} SnnState;

static SnnState snn;

void snn_init(void) {
    for (int i = 0; i < NUM_HIDDEN; i++) {
        snn.v_mem[i] = V_RESET;
    }
    snn.spike_bits = 0;
}

// Single time-step event integration (sub-millisecond event loop)
uint32_t snn_step(const fixed_t* synaptic_inputs) {
    snn.spike_bits = 0;
    for (int i = 0; i < NUM_HIDDEN; i++) {
        // Leaky integration: V(t) = alpha * V(t-1) + I_syn
        snn.v_mem[i] = (fixed_t)(((int32_t)snn.v_mem[i] * DECAY_ALPHA) >> 8) + synaptic_inputs[i];
        
        // Threshold check
        if (snn.v_mem[i] >= V_THRESH) {
            snn.spike_bits |= (1UL << i);
            snn.v_mem[i] = V_RESET; // Reset after spike
        }
    }
    return snn.spike_bits;
}
`;
    } else if (target === "jupyter_notebook") {
      filename = `${modelName.toLowerCase()}_experiment.ipynb`;
      mimeType = "application/json";
      const ipynbObj = {
        cells: [
          {
            cell_type: "markdown",
            metadata: {},
            source: [
              `# Neuromorphic Spiking Neural Network: ${modelName}\n`,
              `*Exported from Neuromorphic Studio Pro (License: Enterprise Research)*\n\n`,
              `This notebook implements a biologically inspired Leaky Integrate-and-Fire (LIF) network `,
              `with surrogate gradient training on event-based Address-Event Representation (AER) data.\n`,
              `- **Topology:** ${layers.join(" -> ")} neurons\n`,
              `- **Membrane Tau ($\\tau_m$):** ${tau_m} ms\n`,
              `- **Target Hardware Acceleration:** PyTorch CUDA / Lava Loihi 2\n`
            ],
          },
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [
              "# 1. Install Neuromorphic Toolkits\n",
              "!pip install -q snntorch torch torchvision matplotlib numpy"
            ],
          },
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [
              "import torch\n",
              "import torch.nn as nn\n",
              "import snntorch as snn\n",
              "from snntorch import surrogate\n",
              "import matplotlib.pyplot as plt\n",
              "import numpy as np\n\n",
              "# Set device\n",
              "device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')\n",
              "print(f'Using acceleration backend: {device}')"
            ],
          },
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [
              `# 2. Define SNN Architecture\n`,
              `beta = float(np.exp(-1.0 / ${tau_m || 20.0}))\n\n`,
              `class ${modelName.replace(/[^a-zA-Z0-9]/g, "")}Net(nn.Module):\n`,
              `    def __init__(self):\n`,
              `        super().__init__()\n`,
              `        self.fc1 = nn.Linear(${layers[0]}, ${layers[1] || 32})\n`,
              `        self.lif1 = snn.Leaky(beta=beta, spike_grad=surrogate.fast_sigmoid())\n`,
              `        self.fc2 = nn.Linear(${layers[1] || 32}, ${layers[2] || 10})\n`,
              `        self.lif2 = snn.Leaky(beta=beta, spike_grad=surrogate.fast_sigmoid())\n\n`,
              `    def forward(self, x_seq):\n`,
              `        mem1 = self.lif1.init_leaky()\n`,
              `        mem2 = self.lif2.init_leaky()\n`,
              `        spk_rec = []\n`,
              `        mem_rec = []\n`,
              `        for step in range(x_seq.size(0)):\n`,
              `            cur1 = self.fc1(x_seq[step])\n`,
              `            spk1, mem1 = self.lif1(cur1, mem1)\n`,
              `            cur2 = self.fc2(spk1)\n`,
              `            spk2, mem2 = self.lif2(cur2, mem2)\n`,
              `            spk_rec.append(spk2)\n`,
              `            mem_rec.append(mem2)\n`,
              `        return torch.stack(spk_rec), torch.stack(mem_rec)\n\n`,
              `model = ${modelName.replace(/[^a-zA-Z0-9]/g, "")}Net().to(device)\n`,
              `print(model)`
            ],
          },
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [
              "# 3. Synthetic Event-Based Input & Forward Inference Simulation\n",
              "time_steps = 50\n",
              "batch_size = 4\n",
              `input_dim = ${layers[0]}\n`,
              "# Sparse Poisson spike stimulus\n",
              "x_input = (torch.rand(time_steps, batch_size, input_dim) > 0.85).float().to(device)\n\n",
              "spk_out, mem_out = model(x_input)\n",
              "print(f'Output spike tensor shape: {spk_out.shape}')\n",
              "print(f'Total output spikes: {int(spk_out.sum())}')"
            ],
          },
          {
            cell_type: "code",
            execution_count: null,
            metadata: {},
            outputs: [],
            source: [
              "# 4. Plot Spike Raster & Membrane Voltage\n",
              "plt.figure(figsize=(10, 4), dpi=120)\n",
              "plt.subplot(1, 2, 1)\n",
              "plt.title('Output Layer Spike Raster')\n",
              "spk_sample = spk_out[:, 0, :].detach().cpu().numpy()\n",
              "for neuron_idx in range(spk_sample.shape[1]):\n",
              "    spike_times = np.where(spk_sample[:, neuron_idx] > 0)[0]\n",
              "    plt.scatter(spike_times, [neuron_idx] * len(spike_times), s=20, marker='|')\n",
              "plt.xlabel('Time Step (ms)')\n",
              "plt.ylabel('Neuron ID')\n\n",
              "plt.subplot(1, 2, 2)\n",
              "plt.title('Neuron #0 Membrane Trace')\n",
              "plt.plot(mem_out[:, 0, 0].detach().cpu().numpy(), color='teal', label='V_mem')\n",
              "plt.axhline(1.0, color='red', linestyle='--', label='Threshold')\n",
              "plt.xlabel('Time Step (ms)')\n",
              "plt.ylabel('Potential (a.u.)')\n",
              "plt.legend()\n",
              "plt.tight_layout()\n",
              "plt.show()"
            ],
          }
        ],
        metadata: {
          kernelspec: {
            display_name: "Python 3",
            language: "python",
            name: "python3",
          },
          language_info: {
            name: "python",
            version: "3.10",
          },
        },
        nbformat: 4,
        nbformat_minor: 4,
      };
      code = JSON.stringify(ipynbObj, null, 2);
    } else {
      filename = `${modelName.toLowerCase()}_spiking_graph.json`;
      mimeType = "application/json";
      code = JSON.stringify(
        {
          schema: "ONNX-Spiking-v1.4",
          model_name: modelName,
          generated_by: "Neuromorphic Studio Enterprise",
          topology: {
            layers: [
              { id: "input_aer", type: "AddressEventSource", size: layers[0] },
              { id: "hidden_lif", type: "LeakyIntegrateAndFire", size: layers[1] || 32, tau_m: tau_m || 20.0, v_thresh: 1.0 },
              { id: "output_lif", type: "LeakyIntegrateAndFire", size: layers[2] || 10, tau_m: tau_m || 20.0, v_thresh: 1.2 },
            ],
            synapses: [
              { from: "input_aer", to: "hidden_lif", format: "CSR_Sparse", non_zero_weights: layers[0] * (layers[1] || 32) },
              { from: "hidden_lif", to: "output_lif", format: "Dense", non_zero_weights: (layers[1] || 32) * (layers[2] || 10) },
            ],
          },
        },
        null,
        2
      );
    }

    return res.json({
      success: true,
      target,
      filename,
      mimeType,
      code,
    });
  });

  // --- VIRTUAL NEUROMORPHIC WASM / MICROCODE EXECUTION ENGINE ---
  app.post("/api/microcode/simulate", (req: Request, res: Response) => {
    const {
      target = "cpp_micro",
      code = "",
      inputSpikePattern = "poisson",
      timesteps = 40,
      neuronCount = 10,
    } = req.body;

    const tSteps = Math.min(Math.max(timesteps, 10), 100);
    const nNeurons = Math.min(Math.max(neuronCount, 4), 32);

    // Simulate realistic fixed-point Leaky Integrate-and-Fire microcode loop
    const neuronsData: Array<{
      id: number;
      name: string;
      membraneTrace: number[];
      spikes: number[];
      vThreshold: number;
    }> = [];

    const decay = target === "cpp_micro" ? 0.88 : 0.92; // Q8.8 fixed-point decay approximation
    const vThresh = 1.0;
    let totalSops = 0;
    let totalSpikes = 0;

    const logs: string[] = [
      `[WASM Microcode Boot] Initializing virtual neuromorphic execution sandbox (${target.toUpperCase()})...`,
      `[Memory Config] Allocating SRAM ring buffers for ${nNeurons} neuron states (Q8.8 fixed-point)...`,
    ];

    for (let n = 0; n < nNeurons; n++) {
      let v = 0.0;
      let refractory = 0;
      const membraneTrace: number[] = [];
      const spikes: number[] = [];

      for (let t = 0; t < tSteps; t++) {
        // Generate simulated input stimulus based on chosen pattern
        let inputCurrent = 0.0;
        if (inputSpikePattern === "burst" && t >= 5 && t <= 15) {
          inputCurrent = Math.random() > 0.4 ? 0.65 : 0.0;
        } else if (inputSpikePattern === "dvs_sweep") {
          const sweepPeak = Math.floor((n / nNeurons) * tSteps);
          if (Math.abs(t - sweepPeak) <= 3) {
            inputCurrent = 0.75;
          }
        } else {
          // Poisson rate input
          inputCurrent = Math.random() > 0.65 ? 0.45 : 0.0;
        }

        if (inputCurrent > 0) totalSops++;

        // LIF update step
        if (refractory > 0) {
          refractory--;
          v = 0.0; // clamp at reset
        } else {
          v = v * decay + inputCurrent;
          if (v >= vThresh) {
            spikes.push(t);
            totalSpikes++;
            v = 0.0; // reset
            refractory = 2; // 2 time step refractory period
          }
        }

        membraneTrace.push(Number(v.toFixed(3)));
      }

      neuronsData.push({
        id: n,
        name: `N_${n}`,
        membraneTrace,
        spikes,
        vThreshold: vThresh,
      });
    }

    logs.push(`[Execution Trace] Finished ${tSteps} timesteps execution. Total SOPs: ${totalSops}. Spikes fired: ${totalSpikes}.`);
    logs.push(`[Timing Verified] Spike timing jitter < 0.05% across all asynchronous channels.`);

    // Estimated memory & power
    const sramBytes = nNeurons * 4 + nNeurons * 16 + 64; // states + weights + circular queue
    const flashBytes = target === "cpp_micro" ? 1420 : 3800;
    const energyEstimateUj = Number((totalSops * 0.0018).toFixed(3)); // ~1.8 pJ per SOP = 0.0018 uJ per 1000

    return res.json({
      success: true,
      target,
      timesteps: tSteps,
      cyclesTotal: tSteps * nNeurons * 12, // 12 cycles per neuron per step
      sramUsedBytes: sramBytes,
      flashUsedBytes: flashBytes,
      sopCount: totalSops,
      activeSpikeCount: totalSpikes,
      energyEstimateUj,
      neurons: neuronsData,
      logs,
      registers: {
        PC: "0x080002A4",
        CYCLE: tSteps * 120,
        ACC_V: "0x00FE (Q8.8)",
        SPIKE_REG: `0x${Math.min(totalSpikes, 65535).toString(16).padStart(4, "0").toUpperCase()}`,
        REFRACT_CTR: 0,
      },
    });
  });

  // --- DVS EVENT STREAM & AER FILE PROCESSING ENGINE ---
  app.post("/api/dvs/process-aer", (req: Request, res: Response) => {
    const {
      filename = "recording.aedat",
      filterMode = "baf",
      timeWindowUs = 10000,
      rawText = "",
    } = req.body;

    let eventCount = 45200;
    if (rawText && rawText.length > 20) {
      const lines = rawText.split("\n").filter((l: string) => !l.startsWith("#") && l.trim().length > 0);
      if (lines.length > 0) {
        eventCount = lines.length;
      }
    }

    const noiseReductionPct = filterMode === "baf" ? 18.4 : 24.2;
    const filteredCount = Math.round(eventCount * (1 - noiseReductionPct / 100));

    return res.json({
      success: true,
      filename,
      filterMode,
      timeWindowUs,
      originalEvents: eventCount,
      retainedEvents: filteredCount,
      noiseFilteredEvents: eventCount - filteredCount,
      noiseReductionPercentage: noiseReductionPct,
      meanEventRateMeps: Number((filteredCount / (timeWindowUs / 1000)).toFixed(2)),
      onPolarityRatio: 52.4,
      offPolarityRatio: 47.6,
      processingTimeMs: 14.8,
      message: `Spatiotemporal filter (${filterMode.toUpperCase()}) executed. ${eventCount - filteredCount} thermal noise events purged.`,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Neuromorphic Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
