import React, { useState, useRef, useEffect } from "react";
import { AerEvent, EncodingScheme } from "../types";
import { spikeAudio } from "../utils/audioSynth";
import { SiliconCochleaSimulator } from "./SiliconCochleaSimulator";
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Zap,
  Activity,
  Layers,
  Info,
  Radio,
  Eye,
  CheckCircle2,
  Upload,
  Download,
  FileVideo,
  Volume2,
  Check,
} from "lucide-react";

export function DvsEncoderView() {
  // Sensory Modality: Vision DVS vs Auditory Cochlea
  const [activeModality, setActiveModality] = useState<"vision_dvs" | "audio_cochlea">("vision_dvs");

  // Mode: synthetic, webcam, or video_file upload
  const [sourceMode, setSourceMode] = useState<"synthetic" | "webcam" | "video_file">("synthetic");
  const [syntheticPattern, setSyntheticPattern] = useState<
    "rotating_bar" | "bouncing_particles" | "sine_wave" | "cursor_track"
  >("rotating_bar");
  const [uploadedVideoName, setUploadedVideoName] = useState<string>("synthetic-demo");
  const [copiedAer, setCopiedAer] = useState<boolean>(false);
  const [bafProcessing, setBafProcessing] = useState<boolean>(false);
  const [bafResult, setBafResult] = useState<{
    originalEvents: number;
    retainedEvents: number;
    noiseFilteredEvents: number;
    noiseReductionPercentage: number;
    meanEventRateMeps: number;
    processingTimeMs: number;
    message: string;
    filteredCsv: string;
    onPolarityRatio: number;
    offPolarityRatio: number;
  } | null>(null);
  const [bafError, setBafError] = useState<string | null>(null);

  // DVS parameters
  const [threshold, setThreshold] = useState<number>(25); // Temporal intensity contrast threshold
  const [noiseFilter, setNoiseFilter] = useState<number>(5); // Spatio-temporal filter
  const [decayRate, setDecayRate] = useState<number>(0.15); // Phosphor decay on event canvas
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Telemetry
  const [eventsPerSec, setEventsPerSec] = useState<number>(0);
  const [onOffRatio, setOnOffRatio] = useState<{ on: number; off: number }>({ on: 50, off: 50 });
  const [recentEvents, setRecentEvents] = useState<AerEvent[]>([]);

  // Spike Encoding Sandbox tab
  const [activeEncoderScheme, setActiveEncoderScheme] = useState<EncodingScheme>("delta_dvs");
  const [analogFreq, setAnalogFreq] = useState<number>(2.0); // Hz
  const [analogAmp, setAnalogAmp] = useState<number>(0.8);
  const [encodeThreshold, setEncodeThreshold] = useState<number>(0.3);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dvsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = useRef<Float32Array | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const lastEventCountRef = useRef<number>(0);
  const onCountRef = useRef<number>(0);
  const offCountRef = useRef<number>(0);
  const lastMetricsTimeRef = useRef<number>(performance.now());
  const recentEventsBufferRef = useRef<AerEvent[]>([]);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 128, y: 128 });
  const synthStateRef = useRef<{
    angle: number;
    particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }>;
  }>({
    angle: 0,
    particles: [
      { x: 50, y: 60, vx: 2.2, vy: 1.8, radius: 10 },
      { x: 180, y: 140, vx: -2.0, vy: 2.4, radius: 14 },
      { x: 120, y: 80, vx: 1.7, vy: -2.1, radius: 8 },
    ],
  });

  // Encoding Sandbox Canvas Ref
  const encoderCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle webcam toggle
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (sourceMode === "webcam") {
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 256, height: 256 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch((e) => console.log("Video play error:", e));
          }
        })
        .catch((err) => {
          console.warn("Webcam unavailable or permission denied, reverting to synthetic:", err);
          setSourceMode("synthetic");
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sourceMode]);

  // Main DVS processing loop
  useEffect(() => {
    const rawCanvas = rawCanvasRef.current;
    const dvsCanvas = dvsCanvasRef.current;
    if (!rawCanvas || !dvsCanvas) return;

    const rawCtx = rawCanvas.getContext("2d", { willReadFrequently: true });
    const dvsCtx = dvsCanvas.getContext("2d");
    if (!rawCtx || !dvsCtx) return;

    const width = 256;
    const height = 256;
    rawCanvas.width = width;
    rawCanvas.height = height;
    dvsCanvas.width = width;
    dvsCanvas.height = height;

    let running = isRunning;

    const render = () => {
      if (!running) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      // 1. Draw Raw Source
      if (
        (sourceMode === "webcam" || sourceMode === "video_file") &&
        videoRef.current &&
        videoRef.current.readyState >= 2
      ) {
        rawCtx.drawImage(videoRef.current, 0, 0, width, height);
      } else {
        // Render Synthetic Pattern
        rawCtx.fillStyle = "#030712";
        rawCtx.fillRect(0, 0, width, height);

        const st = synthStateRef.current;
        if (syntheticPattern === "rotating_bar") {
          st.angle += 0.04;
          rawCtx.save();
          rawCtx.translate(width / 2, height / 2);
          rawCtx.rotate(st.angle);
          rawCtx.fillStyle = "#ffffff";
          rawCtx.fillRect(-70, -10, 140, 20);
          // Center dot
          rawCtx.fillStyle = "#38bdf8";
          rawCtx.beginPath();
          rawCtx.arc(0, 0, 8, 0, Math.PI * 2);
          rawCtx.fill();
          rawCtx.restore();
        } else if (syntheticPattern === "bouncing_particles") {
          st.particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x - p.radius < 0 || p.x + p.radius > width) p.vx *= -1;
            if (p.y - p.radius < 0 || p.y + p.radius > height) p.vy *= -1;

            rawCtx.fillStyle = "#ffffff";
            rawCtx.beginPath();
            rawCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            rawCtx.fill();
          });
        } else if (syntheticPattern === "sine_wave") {
          st.angle += 0.05;
          rawCtx.strokeStyle = "#ffffff";
          rawCtx.lineWidth = 12;
          rawCtx.beginPath();
          for (let x = 0; x < width; x += 4) {
            const y = height / 2 + Math.sin(x * 0.04 + st.angle) * 60;
            if (x === 0) rawCtx.moveTo(x, y);
            else rawCtx.lineTo(x, y);
          }
          rawCtx.stroke();
        } else if (syntheticPattern === "cursor_track") {
          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;
          rawCtx.fillStyle = "#ffffff";
          rawCtx.beginPath();
          rawCtx.arc(mx, my, 18, 0, Math.PI * 2);
          rawCtx.fill();
        }
      }

      // 2. Compute DVS Temporal Differences
      const frame = rawCtx.getImageData(0, 0, width, height);
      const data = frame.data;
      const numPixels = width * height;

      if (!prevFrameRef.current) {
        prevFrameRef.current = new Float32Array(numPixels);
        for (let i = 0; i < numPixels; i++) {
          const idx = i * 4;
          // Grayscale luminance
          prevFrameRef.current[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        }
      }

      const prev = prevFrameRef.current;

      // Phosphor decay on DVS canvas
      dvsCtx.fillStyle = `rgba(3, 7, 18, ${decayRate})`;
      dvsCtx.fillRect(0, 0, width, height);

      let currentFrameEvents = 0;
      let onEvents = 0;
      let offEvents = 0;
      const sampleEvents: AerEvent[] = [];
      const frameEvents: AerEvent[] = [];
      const nowMicros = Math.floor(performance.now() * 1000);

      // Downsample/step to keep 60fps silky smooth
      const step = 2;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const pIdx = y * width + x;
          const dIdx = pIdx * 4;
          const lum = 0.299 * data[dIdx] + 0.587 * data[dIdx + 1] + 0.114 * data[dIdx + 2];
          const diff = lum - prev[pIdx];

          if (Math.abs(diff) > threshold) {
            currentFrameEvents++;
            if (diff > 0) {
              // ON Event: Green/Cyan
              dvsCtx.fillStyle = "#00ffcc";
              dvsCtx.fillRect(x, y, step, step);
              onEvents++;
              if (sampleEvents.length < 5) {
                sampleEvents.push({ t: nowMicros, x, y, p: 1 });
              }
              if(frameEvents.length<1000)frameEvents.push({t:nowMicros,x,y,p:1});
              if(false){
              }
            } else {
              // OFF Event: Red/Orange
              dvsCtx.fillStyle = "#ff0055";
              dvsCtx.fillRect(x, y, step, step);
              offEvents++;
              if (sampleEvents.length < 5) {
                sampleEvents.push({ t: nowMicros, x, y, p: -1 });
              }
              if(frameEvents.length<1000)frameEvents.push({t:nowMicros,x,y,p:-1});
              if(false){
              }
            }
            prev[pIdx] = lum; // Update reference memory on spike
          } else {
            // Leak / slow drift towards current value
            prev[pIdx] += diff * 0.05;
          }
        }
      }

      lastEventCountRef.current += currentFrameEvents;
      onCountRef.current += onEvents;
      offCountRef.current += offEvents;

      if(frameEvents.length>0){
        recentEventsBufferRef.current.push(...frameEvents);
        if(recentEventsBufferRef.current.length>1000)recentEventsBufferRef.current=recentEventsBufferRef.current.slice(-1000);
      }

      // Audio feedback if events fired
      if (currentFrameEvents > 15) {
        spikeAudio.playSpike(Math.min(1.0, currentFrameEvents / 200), 1.0);
      }

      // Update telemetry every 250ms
      const now = performance.now();
      if (now - lastMetricsTimeRef.current >= 250) {
        const deltaSec = (now - lastMetricsTimeRef.current) / 1000;
        const eps = Math.round(lastEventCountRef.current / deltaSec);
        setEventsPerSec(eps);

        const total = onCountRef.current + offCountRef.current;
        if (total > 0) {
          setOnOffRatio({
            on: Math.round((onCountRef.current / total) * 100),
            off: Math.round((offCountRef.current / total) * 100),
          });
        }
        if(recentEventsBufferRef.current.length>0){
          setRecentEvents([...recentEventsBufferRef.current]);
          recentEventsBufferRef.current=[];
        }

        lastEventCountRef.current = 0;
        onCountRef.current = 0;
        offCountRef.current = 0;
        lastMetricsTimeRef.current = now;
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [sourceMode, syntheticPattern, threshold, decayRate, isRunning]);

  // Spike Encoding Schemes Canvas Loop (Rate vs TTFS vs Delta vs Burst)
  useEffect(() => {
    const canvas = encoderCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, w, h);

    // Draw grid lines
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.4);
    ctx.lineTo(w, h * 0.4);
    ctx.moveTo(0, h * 0.75);
    ctx.lineTo(w, h * 0.75);
    ctx.stroke();

    // 1. Draw continuous analog input signal
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const timeSpan = 2.0; // seconds
    const points: number[] = [];

    for (let px = 0; px < w; px++) {
      const t = (px / w) * timeSpan;
      // Analog waveform: combination of sine and slow ramp
      const val = 0.5 + 0.4 * analogAmp * Math.sin(2 * Math.PI * analogFreq * t);
      points.push(val);
      const py = h * 0.35 - (val - 0.5) * (h * 0.55);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Label analog
    ctx.font = "10px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Analog Signal x(t)", 10, 18);

    // 2. Generate and draw spike trains according to selected scheme
    ctx.fillText(`Encoded Spikes (${activeEncoderScheme.toUpperCase()})`, 10, h * 0.48);

    const spikeX: number[] = [];

    if (activeEncoderScheme === "delta_dvs") {
      let lastVal = points[0];
      for (let px = 1; px < w; px++) {
        const diff = points[px] - lastVal;
        if (Math.abs(diff) >= encodeThreshold * 0.4) {
          spikeX.push(px);
          lastVal = points[px];
        }
      }
    } else if (activeEncoderScheme === "rate_poisson") {
      // Poisson rate generator: probability of spike at each step is proportional to intensity
      for (let px = 0; px < w; px += 2) {
        const rate = points[px] * 0.35;
        if (Math.random() < rate) {
          spikeX.push(px);
        }
      }
    } else if (activeEncoderScheme === "ttfs_temporal") {
      // Time-to-first-spike per cycle window
      const cycleLength = Math.floor(w / (analogFreq * timeSpan));
      for (let start = 0; start < w; start += cycleLength) {
        // Find max in this cycle
        let maxVal = -1;
        let bestIdx = start;
        for (let i = start; i < Math.min(w, start + cycleLength); i++) {
          if (points[i] > maxVal) {
            maxVal = points[i];
            bestIdx = i;
          }
        }
        // Higher value fires earlier in cycle
        const delay = Math.floor((1.0 - maxVal) * (cycleLength * 0.8));
        const fireX = Math.min(w - 1, start + Math.max(2, delay));
        spikeX.push(fireX);
      }
    } else if (activeEncoderScheme === "burst") {
      // Burst coding: high amplitude emits tight bursts of 3-4 spikes
      for (let px = 1; px < w; px += 4) {
        if (points[px] > 0.65 && points[px - 1] <= 0.65) {
          spikeX.push(px);
          spikeX.push(px + 4);
          spikeX.push(px + 8);
        }
      }
    }

    // Render spikes as vertical action potential pulses
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 1.5;
    spikeX.forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx, h * 0.85);
      ctx.lineTo(sx, h * 0.55);
      ctx.stroke();
    });

    // Draw bottom timeline
    ctx.fillStyle = "#64748b";
    ctx.fillText("0.0s", 10, h - 6);
    ctx.fillText("1.0s", w / 2 - 10, h - 6);
    ctx.fillText("2.0s", w - 30, h - 6);
  }, [activeEncoderScheme, analogFreq, analogAmp, encodeThreshold]);

  const exportAerFile = () => {
    const header="sample_id,label,split,timestamp_us,x,y,polarity";
    const rows=recentEvents.map(e=>["live-preview","synthetic-or-video","test",e.t,e.x,e.y,e.p>0?1:-1].join(","));
    const blob=new Blob([header+"\n"+rows.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="dvs-event-stream-"+Date.now()+".csv";a.click();URL.revokeObjectURL(url);
    setCopiedAer(true);setTimeout(()=>setCopiedAer(false),2000);
  };

  const handleServerSideBaf = async () => {
    setBafProcessing(true);setBafError(null);
    try {
      if(recentEvents.length===0)throw new Error("No recent events to filter. Start the encoder and wait for event samples.");
      const header="sample_id,label,split,timestamp_us,x,y,polarity";
      const rows=recentEvents.map(e=>["live-preview","synthetic-or-video","test",e.t,e.x,e.y,e.p>0?1:-1].join(","));
      const res=await fetch("/api/dvs/process-aer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        filename:(uploadedVideoName||"synthetic-demo").replace(/[^a-zA-Z0-9_.-]/g,"_")+".csv",
        filterMode:"baf",timeWindowUs:10000,sensorWidth:256,sensorHeight:256,rawText:header+"\n"+rows.join("\n")
      })});
      const data=await res.json();if(!res.ok)throw new Error(data.error||"Event filtering failed.");
      setBafResult(data);setOnOffRatio({on:data.onPolarityRatio,off:data.offPolarityRatio});
    }catch(err){setBafError(err instanceof Error?err.message:"Event filtering failed.");}
    finally{setBafProcessing(false);}
  };

  const downloadFilteredCsv=()=>{
    if(!bafResult?.filteredCsv)return;
    const url=URL.createObjectURL(new Blob([bafResult.filteredCsv],{type:"text/csv"}));
    const a=document.createElement("a");a.href=url;a.download="dvs-background-activity-filtered.csv";a.click();URL.revokeObjectURL(url);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      setUploadedVideoName(file.name);
      videoRef.current.src = URL.createObjectURL(file);
      videoRef.current.loop = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => console.log("Video play error:", err));
      setSourceMode("video_file");
    }
  };

  const loadPresetVideo = (presetName: string) => {
    setUploadedVideoName(presetName);
    setSourceMode("video_file");
    if (videoRef.current) {
      // Standard HTML5 video sample or fallback
      videoRef.current.src = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm";
      videoRef.current.loop = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (syntheticPattern === "cursor_track" && rawCanvasRef.current) {
      const rect = rawCanvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 256;
      const y = ((e.clientY - rect.top) / rect.height) * 256;
      mousePosRef.current = { x, y };
    }
  };

  if (activeModality === "audio_cochlea") {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
                PHASE 01 & 02
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Sensory Ingestion &amp; Bio-Spike Encoders
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Visual Event Cameras (DVS) and Auditory Silicon Cochlea (DAS) bio-inspired sensory streams.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveModality("vision_dvs")}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            >
              Visual DVS Camera
            </button>
            <button
              onClick={() => setActiveModality("audio_cochlea")}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 cursor-pointer"
            >
              Auditory Silicon Cochlea
            </button>
          </div>
        </div>

        <SiliconCochleaSimulator />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Title & Section intro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-xs font-bold">
              PHASE 01 & 02
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              DVS Event Camera &amp; Spike Encoders
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Asynchronous Address Event Representation (AER) sensing and bio-inspired spike encoding.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveModality("vision_dvs")}
              className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 cursor-pointer"
            >
              Visual DVS
            </button>
            <button
              onClick={() => setActiveModality("audio_cochlea")}
              className="px-3 py-1 rounded-lg text-xs font-mono font-semibold text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            >
              Silicon Cochlea
            </button>
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isRunning
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                : "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? "Pause Stream" : "Resume Stream"}</span>
          </button>
        </div>
      </div>

      {/* DVS Dual-Canvas Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Raw Sensor & Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                Input Sensor Source
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                256 × 256 px
              </span>
            </div>

            {/* Source selector */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setSourceMode("synthetic")}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer truncate ${
                  sourceMode === "synthetic"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Synthetic
              </button>
              <button
                onClick={() => setSourceMode("webcam")}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer truncate ${
                  sourceMode === "webcam"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Live Webcam
              </button>
              <button
                onClick={() => setSourceMode("video_file")}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium border transition-all cursor-pointer truncate ${
                  sourceMode === "video_file"
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Video Upload
              </button>
            </div>

            {/* Video File Upload Mode */}
            {sourceMode === "video_file" && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <label className="text-[11px] font-mono text-slate-400 block">
                  Video-to-AER File Ingestion:
                </label>
                <label className="border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/60 bg-slate-950/60 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                  <Upload className="w-5 h-5 text-cyan-400 mb-1" />
                  <span className="text-xs font-bold text-slate-200">Upload Video (MP4/WebM)</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{uploadedVideoName}</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-500">Or Select High-Speed Clip Preset:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { name: "Drone Evasion", file: "drone_highspeed_evasion.mp4" },
                      { name: "Saccadic Gesture", file: "gesture_hand_saccade.mp4" },
                    ].map((p) => (
                      <button
                        key={p.name}
                        onClick={() => loadPresetVideo(p.file)}
                        className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300 hover:border-cyan-500/50 text-left truncate cursor-pointer"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Synthetic pattern options */}
            {sourceMode === "synthetic" && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <label className="text-[11px] font-mono text-slate-400">Target Motion Pattern:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "rotating_bar", label: "Rotating Bar" },
                    { id: "bouncing_particles", label: "Brownian Particles" },
                    { id: "sine_wave", label: "Dynamic Wave" },
                    { id: "cursor_track", label: "Mouse Tracker" },
                  ].map((pat) => (
                    <button
                      key={pat.id}
                      onClick={() => setSyntheticPattern(pat.id as any)}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-left truncate transition-colors cursor-pointer ${
                        syntheticPattern === pat.id
                          ? "bg-slate-800 border-cyan-500/60 text-cyan-300"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Slider Parameters */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Contrast Threshold (θ):</span>
                  <span className="text-cyan-400">{threshold} LSB</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <span className="text-[10px] text-slate-500">
                  Lower = hyper-sensitive, Higher = ultra-sparse
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                  <span>Pixel Phosphor Decay:</span>
                  <span className="text-cyan-400">{decayRate.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.01"
                  value={decayRate}
                  onChange={(e) => setDecayRate(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* AER Event Inspector Box */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-[11px] uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Live AER Stream Packet
              </span>
              <span className="text-[10px] text-slate-500">t_us | x | y | pol</span>
            </div>
            <div className="bg-slate-950 rounded-lg p-2 border border-slate-800 text-[10px] space-y-1 h-24 overflow-y-auto">
              {recentEvents.length > 0 ? (
                recentEvents.map((ev, i) => (
                  <div key={i} className="flex justify-between text-slate-400">
                    <span className="text-cyan-400">0x{ev.t.toString(16).slice(-6)}</span>
                    <span>
                      x:{ev.x.toString().padStart(3, "0")} y:{ev.y.toString().padStart(3, "0")}
                    </span>
                    <span className={ev.p > 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {ev.p > 0 ? "+1 (ON)" : "-1 (OFF)"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic text-center pt-6">
                  No events fired (Static Scene - 0% Power)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right: Dual DVS Display & Live Metrics */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Raw Frame View */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  Conventional CMOS Sensor (30 FPS)
                </span>
                <span className="text-[10px] text-slate-500">Standard Frame</span>
              </div>
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                <canvas
                  ref={rawCanvasRef}
                  onMouseMove={handleMouseMove}
                  className="w-full h-full object-cover cursor-crosshair"
                />
                <video ref={videoRef} className="hidden" playsInline muted />
              </div>
              <p className="text-[11px] text-slate-400">
                Captures all pixels redundantly every 33ms, wasting bus bandwidth on static pixels.
              </p>
            </div>

            {/* DVS Neuromorphic Event View */}
            <div className="p-3 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-2 shadow-lg shadow-cyan-950/20">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Neuromorphic DVS Event Stream
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleServerSideBaf}
                    disabled={bafProcessing}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                    title="Run server-side background activity spatio-temporal filter (BAF)"
                  >
                    <Sliders className="w-2.5 h-2.5 text-cyan-400" />
                    <span>{bafProcessing ? "Filtering..." : "Run BAF"}</span>
                  </button>

                  <button
                    onClick={exportAerFile}
                    className="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                    title="Export recorded event stream as standard .aedat file"
                  >
                    {copiedAer ? (
                      <>
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Exported!</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-2.5 h-2.5" />
                        <span>Export event CSV</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-950 border border-cyan-950">
                <canvas ref={dvsCanvasRef} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-slate-950/80 px-2 py-1 rounded text-[10px] font-mono border border-slate-800">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> ON (+1)
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> OFF (-1)
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-cyan-200/80">
                Emits spikes ONLY when illumination changes. Zero data emitted for motionless regions!
              </p>
            </div>
          </div>

          {bafError && <p role="alert" className="rounded border border-rose-700/40 bg-rose-950/20 p-2 text-xs text-rose-300">{bafError}</p>}

          {/* Server-Side BAF Results Card */}
          {bafResult && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-950 text-cyan-400 border border-cyan-800">
                    Background Activity Filter (BAF)
                  </span>
                  <span className="text-slate-200 font-bold">{bafResult.message}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-[11px] font-mono text-slate-400 pt-1">
                  <span>Raw: <strong className="text-slate-200">{bafResult.originalEvents.toLocaleString()}</strong> ev</span>
                  <span>Retained: <strong className="text-emerald-400">{bafResult.retainedEvents.toLocaleString()}</strong> ev</span>
                  <span>Filtered: <strong className="text-red-400">{bafResult.noiseFilteredEvents.toLocaleString()}</strong> ev ({bafResult.noiseReductionPercentage}%)</span>
                  <span>Throughput: <strong className="text-cyan-300">{bafResult.meanEventRateMeps} MEPS</strong></span>
                  <span>Latency: <strong className="text-teal-300">{bafResult.processingTimeMs} ms</strong></span>
                </div>
              </div>
              <div className="flex flex-col gap-2"><button onClick={downloadFilteredCsv} className="rounded border border-cyan-700 px-2 py-1 text-[10px] text-cyan-300">Download filtered CSV</button><button
                onClick={() => setBafResult(null)}
                className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1 rounded cursor-pointer"
              >
                Dismiss
              </button></div>
            </div>
          )}

          {/* DVS Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Event Rate</div>
              <div className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">
                {(eventsPerSec / 1000).toFixed(1)}{" "}
                <span className="text-xs font-normal text-slate-400">kEPS</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Temporal Sparsity</div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                {(100 - Math.min(99.9, (eventsPerSec / (256 * 256 * 30)) * 100)).toFixed(1)}%
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Bandwidth Savings</div>
              <div className="text-xl font-extrabold text-teal-300 font-mono mt-0.5">
                96.8%
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="text-[10px] font-mono text-slate-400 uppercase">ON / OFF Ratio</div>
              <div className="text-sm font-bold text-slate-200 font-mono mt-1 flex items-center gap-1">
                <span className="text-emerald-400">{onOffRatio.on}%</span> /{" "}
                <span className="text-red-400">{onOffRatio.off}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 02: Spike Encoding Schemes Interactive Lab */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold">
              02
            </span>
            <div>
              <h3 className="text-lg font-bold text-white">
                Spike Encoding Schemes Lab (Rate vs Temporal vs Delta)
              </h3>
              <p className="text-xs text-slate-400">
                Transform continuous physical variables into neural spike trains for SNN ingestion.
              </p>
            </div>
          </div>

          {/* Scheme Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[
              { id: "delta_dvs", label: "Delta Modulation" },
              { id: "rate_poisson", label: "Rate Coding (Poisson)" },
              { id: "ttfs_temporal", label: "Time-to-First-Spike" },
              { id: "burst", label: "Burst Coding" },
            ].map((scheme) => (
              <button
                key={scheme.id}
                onClick={() => setActiveEncoderScheme(scheme.id as EncodingScheme)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeEncoderScheme === scheme.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {scheme.label}
              </button>
            ))}
          </div>
        </div>

        {/* Oscilloscope Visualizer */}
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-2">
            <canvas ref={encoderCanvasRef} width={800} height={180} className="w-full h-44 block" />
          </div>

          {/* Controls for analog signal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Signal Frequency:</span>
                <span className="text-cyan-400">{analogFreq.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={analogFreq}
                onChange={(e) => setAnalogFreq(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Signal Amplitude:</span>
                <span className="text-cyan-400">{analogAmp.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={analogAmp}
                onChange={(e) => setAnalogAmp(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Encoder Threshold:</span>
                <span className="text-cyan-400">{encodeThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={encodeThreshold}
                onChange={(e) => setEncodeThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
