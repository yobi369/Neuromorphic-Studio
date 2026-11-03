export type TabMode =
  | "overview"
  | "dvs_encoder"
  | "neuron_models"
  | "snn_network"
  | "stdp_lab"
  | "hardware_profiler"
  | "benchmark_evaluator"
  | "roi_calculator"
  | "robotics_control"
  | "ai_architect";

export type AppTab = TabMode;

export interface AerEvent {
  t: number; // microseconds or ms timestamp
  x: number;
  y: number;
  p: 1 | -1; // polarity: +1 (ON), -1 (OFF)
}

export type EncodingScheme = "delta_dvs" | "rate_poisson" | "ttfs_temporal" | "burst";

export type NeuronModelType = "lif" | "adex" | "izhikevich";

export type IzhikevichPreset =
  | "regular_spiking"
  | "intrinsically_bursting"
  | "chattering"
  | "fast_spiking"
  | "thalamocortical"
  | "resonator";

export interface LifParams {
  tau_m: number; // ms membrane time constant (e.g. 20ms)
  v_rest: number; // mV resting potential (e.g. -70mV)
  v_reset: number; // mV reset potential (e.g. -65mV)
  v_thresh: number; // mV threshold potential (e.g. -50mV)
  r_m: number; // MOhms membrane resistance
  tau_ref: number; // ms refractory period (e.g. 2ms)
}

export interface IzhikevichParams {
  a: number; // time scale of recovery variable u
  b: number; // sensitivity of u to subthreshold fluctuations of v
  c: number; // after-spike reset value of v (mV)
  d: number; // after-spike reset of u
  v_peak: number; // spike cutoff (mV)
}

export interface AdExParams {
  c_m: number; // pF
  g_l: number; // nS
  e_l: number; // mV
  v_t: number; // mV
  delta_t: number; // mV
  a: number; // nS
  tau_w: number; // ms
  b: number; // pA
  v_reset: number; // mV
}

export interface StdpParams {
  a_plus: number; // potentiation amplitude (e.g. 0.01)
  a_minus: number; // depression amplitude (e.g. 0.012)
  tau_plus: number; // ms potentiation time constant (e.g. 20ms)
  tau_minus: number; // ms depression time constant (e.g. 20ms)
  w_min: number;
  w_max: number;
  w_init: number;
}

export interface HardwareSpec {
  id: string;
  name: string;
  vendor: string;
  processNode: string;
  neuronsPerChip: string;
  synapsesPerChip: string;
  energyPerSop: string; // picojoules per Synaptic Operation (pJ/SOP)
  typicalPower: string;
  latencyUs: string;
  targetDomain: string;
  architecture: string;
  comparisonNote: string;
}

export interface SnnNeuron {
  id: number;
  layer: "input" | "hidden" | "output";
  x: number;
  y: number;
  v: number;
  threshold: number;
  spiked: boolean;
  spikeHistory: number[];
  label?: string;
}

export interface SnnSynapse {
  fromId: number;
  toId: number;
  weight: number;
  delayMs: number;
  lastActive: number;
}

export interface CartPoleState {
  x: number; // cart position (-2.4 to 2.4 m)
  x_dot: number; // cart velocity (m/s)
  theta: number; // pole angle in radians (-0.4 to 0.4 rad)
  theta_dot: number; // pole angular velocity (rad/s)
  timeSurvived: number;
  isFailed: boolean;
}

export type CommercialTier = "community" | "pro" | "enterprise";

export interface InvoiceRecord {
  id: string;
  date: string;
  plan: CommercialTier;
  interval: "month" | "year";
  amount: string;
  status: "paid" | "pending" | "refunded";
  description: string;
  paymentMethod: string;
  licenseKey: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  institution: string;
  tier: CommercialTier;
  role: "Lead Scientist" | "Research Engineer" | "Lab Director" | "Student Investigator";
  licenseKey: string;
  licenseValidUntil: string;
  activeWorkspace: string;
  billingInterval?: "month" | "year";
  isTrial?: boolean;
  trialExpiresAt?: string;
  teamSeatsTotal?: number;
  teamSeatsUsed?: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Viewer" | "Experimenter" | "Hardware Admin";
  status: "active" | "invited";
  assignedDate: string;
  lastActive: string;
}

export interface BenchmarkResult {
  dataset: "n_mnist" | "dvs_gesture" | "shd_audio";
  accuracy: number;
  samplesTested: number;
  meanLatencyMs: number;
  energyPerInferenceUj: number;
  gpuEnergyUj: number;
  confusionMatrix: number[][];
  classNames: string[];
  latencyAccuracyCurve: Array<{ timeMs: number; accuracy: number }>;
}

export interface ProjectExperiment {
  id: string;
  name: string;
  description: string;
  category: "Vision & DVS" | "Robotics Reflex" | "Auditory & Speech" | "Bio-Physiology" | "Edge Silicon";
  targetHardware: string;
  createdAt: string;
  updatedAt: string;
  neuronCount: number;
  synapseCount: number;
  sparsityPercent: number;
  tags: string[];
  config: {
    modelType: NeuronModelType;
    encodingScheme: EncodingScheme;
    layers: number[];
    isStdpEnabled: boolean;
    tau_m: number;
  };
}

export interface HardwareDevice {
  id: string;
  name: string;
  vendor: string;
  category: "dvs_sensor" | "neuromorphic_chip" | "edge_actuator";
  connectionType: "WebUSB" | "WebSerial" | "WebSocket" | "TCP/IP";
  status: "connected" | "disconnected" | "streaming" | "standby";
  eventRateMeps: number; // Mega-events per second
  latencyUs: number; // microseconds
  powerMw: number; // milliwatts
  firmwareVersion: string;
}

export type ExportTarget =
  | "lava_python"
  | "snntorch_pytorch"
  | "onnx_spiking"
  | "cpp_micro"
  | "aedat_dvs"
  | "jupyter_notebook";

