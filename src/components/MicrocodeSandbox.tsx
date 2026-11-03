import {useState,useEffect} from "react";
import {Play,Activity,AlertTriangle,Terminal} from "lucide-react";
interface MicrocodeSandboxProps {onClose?:()=>void;initialCode?:string;initialTarget?:"cpp_micro"|"loihi2_lava";}
interface SimulationResult {
 simulator:string;requestedTarget:string;codePreviewProvided:boolean;codeExecuted:boolean;hardwareMetrics:null;
 inputSpikePattern:string;seed:number;dtMs:number;timesteps:number;neuronCount:number;inputEventCount:number;
 activeSpikeCount:number;synapticEventsScheduled:number;softwareElapsedMs:number;membraneUnits:string;inputCurrentUnits:string;
 neurons:Array<{id:number;name:string;membraneTrace:number[];spikes:number[];vThresholdMv:number}>;logs:string[];
}
const PRESETS={
 cpp_micro:"/* Portable C99 LIF kernel preview.\n * This editor is not compiled or executed by the reference simulator.\n * The separately generated exporter artifact has its own GCC CI smoke test.\n */\n#include <stdint.h>\n#define NUM_NEURONS 8\n#define V_THRESHOLD_Q8 256\ntypedef struct { int16_t voltage[NUM_NEURONS]; } lif_state;\nvoid lif_step(lif_state *state,const int16_t current_q8[NUM_NEURONS]);",
 loihi2_lava:"# Lava process-graph preview.\n# The separate exporter workflow executes a generated Lava graph in the\n# Lava floating-point simulator. This text preview is not executed here.\nfrom lava.proc.lif.process import LIF\nlayer = LIF(shape=(8,), du=0, dv=0.1, vth=100)"
};
export function MicrocodeSandbox({onClose,initialCode,initialTarget="cpp_micro"}:MicrocodeSandboxProps){
 const [target,setTarget]=useState<"cpp_micro"|"loihi2_lava">(initialTarget);
 const [code,setCode]=useState(initialCode||PRESETS[initialTarget]);
 const [spikePattern,setSpikePattern]=useState<"poisson"|"burst"|"dvs_sweep">("poisson");
 const [timesteps,setTimesteps]=useState(100),[neuronCount,setNeuronCount]=useState(8),[seed,setSeed]=useState(20261103);
 const [isRunning,setIsRunning]=useState(false),[error,setError]=useState("");
 const [simResult,setSimResult]=useState<SimulationResult|null>(null),[selectedNeuronIndex,setSelectedNeuronIndex]=useState(0);
 async function runSimulation(){
  setIsRunning(true);setError("");
  try{
   const res=await fetch("/api/microcode/simulate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({target,inputSpikePattern:spikePattern,timesteps,neuronCount,seed,code})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Reference simulation failed.");setSimResult(data);setSelectedNeuronIndex(0);
  }catch(e){setError(e instanceof Error?e.message:"Reference simulation failed.");}
  finally{setIsRunning(false);}
 }
 useEffect(()=>{void runSimulation();},[]);
 return <div className="space-y-5">
  <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
   <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono"><Activity className="w-4 h-4"/> SOFTWARE REFERENCE SIMULATOR</div>
   <h3 className="text-lg font-bold text-white">Deterministic LIF network run</h3>
   <p className="text-xs text-slate-400">Runs the shared TypeScript network engine with seeded inputs and delayed ring connectivity. The editable code below is a preview only; it is not compiled or executed. This simulator reports no hardware cycles, SRAM, flash, energy or device telemetry.</p>
   <button onClick={runSimulation} disabled={isRunning} className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"><Play className="inline w-3 h-3 mr-2"/>{isRunning?"Running…":"Run reference simulation"}</button>
  </header>
  <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
   <div className="flex flex-wrap gap-2 items-center justify-between"><strong className="text-sm text-white">Simulation inputs</strong><span className="text-[10px] text-amber-300">Software model, not hardware target execution</span></div>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <label className="text-xs text-slate-300">Requested export target<select value={target} onChange={e=>{const next=e.target.value as "cpp_micro"|"loihi2_lava";setTarget(next);setCode(PRESETS[next]);}} className="mt-1 w-full rounded bg-slate-900 border border-slate-700 p-2"><option value="cpp_micro">Portable C99 template</option><option value="loihi2_lava">Lava simulator template</option></select></label>
    <label className="text-xs text-slate-300">Input pattern<select value={spikePattern} onChange={e=>setSpikePattern(e.target.value as typeof spikePattern)} className="mt-1 w-full rounded bg-slate-900 border border-slate-700 p-2"><option value="poisson">Seeded Poisson input</option><option value="burst">Burst input</option><option value="dvs_sweep">Sequential sweep</option></select></label>
    <label className="text-xs text-slate-300">Timesteps: {timesteps} ms<input type="range" min="10" max="1000" step="10" value={timesteps} onChange={e=>setTimesteps(Number(e.target.value))} className="mt-2 w-full"/></label>
    <label className="text-xs text-slate-300">Neurons: {neuronCount}<input type="range" min="4" max="32" step="1" value={neuronCount} onChange={e=>setNeuronCount(Number(e.target.value))} className="mt-2 w-full"/></label>
    <label className="text-xs text-slate-300">Deterministic seed<input type="number" min="0" step="1" value={seed} onChange={e=>setSeed(Math.max(0,Math.floor(Number(e.target.value)||0)))} className="mt-1 w-full rounded bg-slate-900 border border-slate-700 p-2"/></label>
   </div>
  </section>
  <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
   <div className="flex items-center gap-2 text-xs text-slate-300"><Terminal className="w-4 h-4 text-cyan-300"/> Export code preview (not executed)</div>
   <textarea value={code} onChange={e=>setCode(e.target.value)} rows={8} spellCheck={false} className="w-full rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] text-cyan-200"/>
  </section>
  {error&&<p role="alert" className="rounded border border-rose-700/40 bg-rose-950/20 p-3 text-xs text-rose-300">{error}</p>}
  {simResult&&<>
   <section className="space-y-3">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
     <Metric label="Input events" value={simResult.inputEventCount.toLocaleString()}/>
     <Metric label="Neuron spikes" value={simResult.activeSpikeCount.toLocaleString()}/>
     <Metric label="Synaptic events scheduled" value={simResult.synapticEventsScheduled.toLocaleString()}/>
     <Metric label="Software elapsed" value={simResult.softwareElapsedMs+" ms"}/>
    </div>
    <div className="rounded-lg border border-amber-700/30 bg-amber-950/10 p-3 text-xs text-amber-200 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0"/>Code executed: {String(simResult.codeExecuted)}. Hardware metrics: unavailable. Requested target: {simResult.requestedTarget}. Simulation: {simResult.simulator}.</div>
   </section>
   <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
    <div className="flex items-center justify-between"><strong className="text-sm text-white">Spike raster</strong><span className="text-[10px] text-slate-500">{simResult.dtMs} ms fixed step · {simResult.timesteps} steps</span></div>
    {simResult.neurons.map((n,i)=><button key={n.id} onClick={()=>setSelectedNeuronIndex(i)} className={"w-full flex items-center gap-2 rounded px-2 py-1 text-left "+(selectedNeuronIndex===i?"bg-cyan-950/40":"hover:bg-slate-900")}><span className="w-8 text-[10px] font-mono text-slate-500">{n.name}</span><span className="relative h-4 flex-1 rounded bg-slate-900 overflow-hidden">{n.spikes.map((t,j)=><i key={j} className="absolute top-0 bottom-0 w-px bg-cyan-300" style={{left:(t/simResult.timesteps*100)+"%"}}/>)}</span><span className="w-6 text-right text-[10px] text-cyan-300">{n.spikes.length}</span></button>)}
   </section>
   {simResult.neurons[selectedNeuronIndex]&&<section className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2"><div className="flex justify-between text-xs"><strong className="text-white">Membrane trace · {simResult.neurons[selectedNeuronIndex].name}</strong><span className="text-amber-300">Threshold {simResult.neurons[selectedNeuronIndex].vThresholdMv} mV</span></div><div className="h-36"><svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none"><line x1="0" y1="26.25" x2="100" y2="26.25" stroke="#fbbf24" strokeDasharray="2,2"/><polyline fill="none" stroke="#22d3ee" strokeWidth="1" points={simResult.neurons[selectedNeuronIndex].membraneTrace.map((v,i)=>(i/(simResult.timesteps-1)*100)+","+(36-((v+80)/80)*26)).join(" ")}/></svg></div></section>}
   <section className="rounded-xl border border-slate-800 bg-slate-950 p-3"><strong className="text-xs text-slate-300">Run log</strong>{simResult.logs.map((line,i)=><p key={i} className="mt-1 text-[11px] text-slate-400">{line}</p>)}</section>
  </>}
 </div>;
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="text-[10px] uppercase text-slate-500">{label}</div><div className="mt-1 text-lg font-bold text-white">{value}</div></div>;}
