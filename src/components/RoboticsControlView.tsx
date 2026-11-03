import { useState, useRef, useEffect } from "react";
import { CartPoleState } from "../types";
import { spikeAudio } from "../utils/audioSynth";
import {
  Bot,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export function RoboticsControlView() {
  const [controllerType, setControllerType] = useState<"neuromorphic_snn" | "frame_lagged">("neuromorphic_snn");
  const [isSimulating, setIsSimulating] = useState<boolean>(true);

  // Disturbance controls
  const [disturbanceMagnitude, setDisturbanceMagnitude] = useState<number>(1.8);

  // Telemetry
  const [timeSurvived, setTimeSurvived] = useState<number>(0);
  const [motorLeftSpikes, setMotorLeftSpikes] = useState<number>(0);
  const [motorRightSpikes, setMotorRightSpikes] = useState<number>(0);
  const [isFailed, setIsFailed] = useState<boolean>(false);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cart-Pole state
  const stateRef = useRef<CartPoleState>({
    x: 0,
    x_dot: 0,
    theta: 0.05, // start slightly off-center
    theta_dot: 0,
    timeSurvived: 0,
    isFailed: false,
  });

  // Lag buffer for conventional 33ms controller
  const lagBufferRef = useRef<Array<{ theta: number; theta_dot: number; x: number; x_dot: number; time: number }>>([]);

  const resetCartPole = () => {
    stateRef.current = {
      x: 0,
      x_dot: 0,
      theta: (Math.random() - 0.5) * 0.08,
      theta_dot: 0,
      timeSurvived: 0,
      isFailed: false,
    };
    lagBufferRef.current = [];
    setTimeSurvived(0);
    setIsFailed(false);
  };

  const applyPerturbation = (direction: "left" | "right") => {
    const sign = direction === "left" ? -1 : 1;
    stateRef.current.x_dot += sign * disturbanceMagnitude;
    stateRef.current.theta_dot += -sign * (disturbanceMagnitude * 1.5);
    spikeAudio.playSpike(0.9, 1.4);
  };

  // Main Physics & Control Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    // Physical constants
    const g = 9.81;
    const m_cart = 1.0; // kg
    const m_pole = 0.1; // kg
    const total_m = m_cart + m_pole;
    const l = 0.5; // half pole length (m)
    const polemass_length = m_pole * l;

    const loop = (currentTime: number) => {
      const dt = Math.min(0.03, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      if (!isSimulating) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const st = stateRef.current;

      if (!st.isFailed) {
        st.timeSurvived += dt;
        setTimeSurvived(Number(st.timeSurvived.toFixed(1)));

        // Record lag buffer
        lagBufferRef.current.push({
          theta: st.theta,
          theta_dot: st.theta_dot,
          x: st.x,
          x_dot: st.x_dot,
          time: currentTime,
        });

        // 1. Determine Control Force (F)
        let force = 0;
        let leftFired = 0;
        let rightFired = 0;

        if (controllerType === "neuromorphic_snn") {
          // Zero-latency Neuromorphic Spike Rate Control
          // Threshold-based spiking reflex: if angle or angular rate exceeds deadband, emit spikes
          const reflexRate = st.theta * 28.0 + st.theta_dot * 5.2 + st.x * 2.5 + st.x_dot * 2.0;

          if (reflexRate > 0.05) {
            // Right motor push
            force = Math.min(24, reflexRate * 14.0);
            rightFired = 1;
          } else if (reflexRate < -0.05) {
            // Left motor push
            force = Math.max(-24, reflexRate * 14.0);
            leftFired = 1;
          }
        } else {
          // Conventional Frame-Lagged Controller (33ms delayed feedback)
          const targetTime = currentTime - 35; // 35ms frame latency
          const delayedState = lagBufferRef.current.find((s) => s.time >= targetTime) || lagBufferRef.current[0];

          if (delayedState) {
            const laggedSignal = delayedState.theta * 25.0 + delayedState.theta_dot * 4.5 + delayedState.x * 2.0 + delayedState.x_dot * 1.5;
            force = Math.max(-20, Math.min(20, laggedSignal * 12.0));
            if (force > 1) rightFired = 1;
            if (force < -1) leftFired = 1;
          }
        }

        // Clean up lag buffer
        if (lagBufferRef.current.length > 50) {
          lagBufferRef.current.shift();
        }

        if (leftFired || rightFired) {
          if (Math.random() < 0.2) {
            spikeAudio.playSpike(0.3, rightFired ? 1.2 : 0.9);
          }
        }
        setMotorLeftSpikes((prev) => prev + leftFired);
        setMotorRightSpikes((prev) => prev + rightFired);

        // 2. Numerical Integration of Cart-Pole Equations of Motion
        const cos_th = Math.cos(st.theta);
        const sin_th = Math.sin(st.theta);

        const temp = (force + polemass_length * st.theta_dot * st.theta_dot * sin_th) / total_m;
        const theta_acc =
          (g * sin_th - cos_th * temp) /
          (l * (4.0 / 3.0 - (m_pole * cos_th * cos_th) / total_m));
        const x_acc = temp - (polemass_length * theta_acc * cos_th) / total_m;

        // Semi-implicit Euler
        st.x_dot += x_acc * dt;
        st.x += st.x_dot * dt;
        st.theta_dot += theta_acc * dt;
        st.theta += st.theta_dot * dt;

        // Natural damping / friction
        st.x_dot *= 0.995;
        st.theta_dot *= 0.995;

        // Failure conditions: |theta| > 24 degrees (0.42 rad) or |x| > 2.2 meters
        if (Math.abs(st.theta) > 0.42 || Math.abs(st.x) > 2.2) {
          st.isFailed = true;
          setIsFailed(true);
        }
      }

      // 3. Render Cart-Pole Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          ctx.fillStyle = "#030712";
          ctx.fillRect(0, 0, w, h);

          // Track Ground line
          const groundY = h * 0.72;
          ctx.strokeStyle = "#334155";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(20, groundY);
          ctx.lineTo(w - 20, groundY);
          ctx.stroke();

          // Track hash marks
          for (let tx = 40; tx < w - 20; tx += 40) {
            ctx.beginPath();
            ctx.moveTo(tx, groundY);
            ctx.lineTo(tx - 10, groundY + 10);
            ctx.stroke();
          }

          // Cart coordinate mapping (-2.2m to +2.2m)
          const scale = (w - 120) / 4.4;
          const cartScreenX = w / 2 + st.x * scale;
          const cartW = 68;
          const cartH = 32;
          const cartY = groundY - cartH - 8;

          // Wheels
          ctx.fillStyle = "#475569";
          ctx.beginPath();
          ctx.arc(cartScreenX - 20, groundY - 8, 8, 0, Math.PI * 2);
          ctx.arc(cartScreenX + 20, groundY - 8, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#64748b";
          ctx.stroke();

          // Cart Body
          ctx.fillStyle = st.isFailed ? "#7f1d1d" : "#0f766e";
          ctx.strokeStyle = st.isFailed ? "#ef4444" : "#00ffcc";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(cartScreenX - cartW / 2, cartY, cartW, cartH, 6);
          ctx.fill();
          ctx.stroke();

          // Cart center axle
          const axleX = cartScreenX;
          const axleY = cartY + 6;

          // Pole length in pixels
          const polePixelLength = 110;
          const poleEndX = axleX + polePixelLength * Math.sin(st.theta);
          const poleEndY = axleY - polePixelLength * Math.cos(st.theta);

          // Pole line
          ctx.strokeStyle = st.isFailed ? "#ef4444" : "#38bdf8";
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(axleX, axleY);
          ctx.lineTo(poleEndX, poleEndY);
          ctx.stroke();

          // Tip bob weight
          ctx.fillStyle = st.isFailed ? "#ef4444" : "#00ffcc";
          ctx.beginPath();
          ctx.arc(poleEndX, poleEndY, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Axle pivot dot
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(axleX, axleY, 4, 0, Math.PI * 2);
          ctx.fill();

          // Motor Force Arrows
          if (controllerType === "neuromorphic_snn" && !st.isFailed) {
            ctx.fillStyle = "#00ffcc";
            ctx.font = "10px monospace";
            if (st.theta < -0.02) {
              // Pushing Right
              ctx.fillText("▶ SNN MOTOR BURST", cartScreenX + cartW / 2 + 8, cartY + 18);
            } else if (st.theta > 0.02) {
              // Pushing Left
              ctx.fillText("◀ SNN MOTOR BURST", cartScreenX - cartW / 2 - 130, cartY + 18);
            }
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [controllerType, isSimulating]);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
              PHASE 05
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Edge Robotics & Closed-Loop Reflex Control
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sub-millisecond neuromorphic spike actuation vs conventional frame-lagged robotics controllers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSimulating
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? "Pause Physics" : "Resume Physics"}</span>
          </button>

          <button
            onClick={resetCartPole}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Cart</span>
          </button>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controller Switch & Perturbation Injections */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              Robotic Reflex Controller
            </span>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setControllerType("neuromorphic_snn");
                  resetCartPole();
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  controllerType === "neuromorphic_snn"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Neuromorphic SNN Reflex</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    &lt; 0.5ms Latency
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Continuous asynchronous spike feedback balances smoothly under sudden shocks.
                </p>
              </button>

              <button
                onClick={() => {
                  setControllerType("frame_lagged");
                  resetCartPole();
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  controllerType === "frame_lagged"
                    ? "bg-red-950/30 border-red-500 text-red-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Conventional Frame Controller</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                    33ms Frame Lag
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Delayed feedback loop causes severe oscillation and crashes under disturbances.
                </p>
              </button>
            </div>

            {/* Disturbance Shocks */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[11px] font-mono text-slate-400">
                Apply External Physical Shock:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyPerturbation("left")}
                  className="py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Push Left</span>
                </button>

                <button
                  onClick={() => applyPerturbation("right")}
                  className="py-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Push Right</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Disturbance Force:</span>
                  <span className="text-cyan-400">{disturbanceMagnitude.toFixed(1)} N</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.5"
                  step="0.2"
                  value={disturbanceMagnitude}
                  onChange={(e) => setDisturbanceMagnitude(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Canvas & Telemetry */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                Real-Time Inverted Pendulum Dynamics Simulation
              </span>
              <div className="flex items-center gap-3">
                <span>
                  Survival Time:{" "}
                  <strong className="text-emerald-400 font-mono">{timeSurvived}s</strong>
                </span>
                {isFailed && (
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> FAILED
                  </span>
                )}
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
              <canvas ref={canvasRef} width={640} height={260} className="w-full h-64 block" />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Reaction latency: {controllerType === "neuromorphic_snn" ? "< 0.5ms (Spiking)" : "33ms (Camera Lag)"}</span>
              <span>Inverted pendulum mass: 100g, Cart mass: 1.0kg</span>
            </div>
          </div>

          {/* Spiking Actuation Telemetry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Left Motor Spike Pulses
              </span>
              <div className="text-xl font-extrabold text-cyan-400 font-mono">
                {motorLeftSpikes.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80 space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                Right Motor Spike Pulses
              </span>
              <div className="text-xl font-extrabold text-emerald-400 font-mono">
                {motorRightSpikes.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
