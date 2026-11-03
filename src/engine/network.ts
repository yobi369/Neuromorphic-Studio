import { stepLif, stepAdEx, stepIzhikevich, LifParameters, LifState, AdExParameters, AdExState, IzhikevichParameters, IzhikevichState, Integrator, StdpParameters, StdpState, createStdpState, stdpPre, stdpPost } from "./index.ts";
import { TripletStdpParameters, TripletStdpState, createTripletStdpState, tripletStdpPre, tripletStdpPost } from "./triplet-stdp.ts";
export type NeuronSpec =
 | {id:number;model:"lif";parameters:LifParameters;state:LifState;biasPa?:number}
 | {id:number;model:"adex";parameters:AdExParameters;state:AdExState;biasPa?:number}
 | {id:number;model:"izhikevich";parameters:IzhikevichParameters;state:IzhikevichState;biasPa?:number};
export interface Connection {id:string;from:number;to:number;weightPa:number;delayMs:number;plasticity?:StdpParameters;tripletPlasticity?:TripletStdpParameters;stdpState?:StdpState;tripletState?:TripletStdpState;}
export interface TimedSpike {neuronId:number;timeMs:number;}
interface Event {at:number;target:number;current:number;connectionId:string;sequence:number;}
export interface TopologyEdge {from:number;to:number;}
export function seededRandom(seed:number){let x=seed>>>0;return ()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};}
export function allToAllTopology(source:number[],target:number[],includeSelf=false):TopologyEdge[]{return source.flatMap(from=>target.filter(to=>includeSelf||from!==to).map(to=>({from,to}))).sort((a,b)=>a.from-b.from||a.to-b.to);}
export function ringTopology(ids:number[],fanOut=1):TopologyEdge[]{if(!Number.isInteger(fanOut)||fanOut<1||fanOut>=ids.length)throw new Error("fanOut must be an integer in [1, neuronCount)");const out:TopologyEdge[]=[];ids.forEach((from,i)=>{for(let k=1;k<=fanOut;k++)out.push({from,to:ids[(i+k)%ids.length]});});return out;}
export function probabilityTopology(source:number[],target:number[],probability:number,seed:number,includeSelf=false):TopologyEdge[]{if(probability<0||probability>1||!Number.isFinite(probability))throw new Error("probability must be in [0,1]");const random=seededRandom(seed);return source.flatMap(from=>target.filter(to=>(includeSelf||from!==to)&&random()<probability).map(to=>({from,to}))).sort((a,b)=>a.from-b.from||a.to-b.to);}
export class HeterogeneousNetwork {
 private neurons=new Map<number,NeuronSpec>();private connections:Connection[];private queue:Event[]=[];private sequence=0;private clock=0;readonly spikes:TimedSpike[]=[];
 constructor(neurons:NeuronSpec[],connections:Connection[]){for(const n of neurons){if(this.neurons.has(n.id))throw new Error("duplicate neuron id");this.neurons.set(n.id,structuredClone(n));}
  const ids=new Set<string>();for(const c of connections){if(ids.has(c.id))throw new Error("duplicate connection id");ids.add(c.id);if(!this.neurons.has(c.from)||!this.neurons.has(c.to))throw new Error("connection references missing neuron");if(c.delayMs<0||!Number.isFinite(c.delayMs)||!Number.isFinite(c.weightPa))throw new Error("invalid connection weight/delay");}
  this.connections=connections.map(c=>{if(c.plasticity&&c.tripletPlasticity)throw new Error("select pair or triplet STDP, not both");return {...c,stdpState:c.plasticity?(c.stdpState||createStdpState(c.weightPa)):undefined,tripletState:c.tripletPlasticity?(c.tripletState||createTripletStdpState(c.weightPa)):undefined};});
 }
 get timeMs(){return this.clock;}
 get weights(){return this.connections.map(c=>({id:c.id,weightPa:c.weightPa}));}
 private integrate(h:number,external:ReadonlyMap<number,number>,method:Integrator):TimedSpike[]{
  const now=this.clock,due=this.queue.filter(e=>e.at<=now+1e-10).sort((a,b)=>a.at-b.at||a.sequence-b.sequence);this.queue=this.queue.filter(e=>e.at>now+1e-10);
  const currents=new Map<number,number>();for(const e of due){const c=this.connections.find(x=>x.id===e.connectionId);if(c?.plasticity&&c.stdpState){c.stdpState=stdpPre(c.stdpState,c.plasticity,e.at);c.weightPa=c.stdpState.weight;}if(c?.tripletPlasticity&&c.tripletState){c.tripletState=tripletStdpPre(c.tripletState,c.tripletPlasticity,e.at);c.weightPa=c.tripletState.weight;}currents.set(e.target,(currents.get(e.target)||0)+e.current);}for(const [id,v] of external)currents.set(id,(currents.get(id)||0)+v);
  const fired:TimedSpike[]=[];
  for(const n of this.neurons.values()){const input=(n.biasPa||0)+(currents.get(n.id)||0);let spike=false;
   if(n.model==="lif"){const r=stepLif(n.state,n.parameters,input,h,method);n.state=r.state;spike=r.spike;}
   else if(n.model==="adex"){const r=stepAdEx(n.state,n.parameters,input,h,method);n.state=r.state;spike=r.spike;}
   else {const r=stepIzhikevich(n.state,n.parameters,input,h,method);n.state=r.state;spike=r.spike;}
   if(spike)fired.push({neuronId:n.id,timeMs:now+h});
  }
  for(const spike of fired){
   this.spikes.push(spike);
   for(const c of this.connections)if(c.from===spike.neuronId)this.queue.push({at:spike.timeMs+c.delayMs,target:c.to,current:c.weightPa,connectionId:c.id,sequence:this.sequence++});
   for(const c of this.connections)if(c.to===spike.neuronId){
    if(c.plasticity&&c.stdpState){c.stdpState=stdpPost(c.stdpState,c.plasticity,spike.timeMs);c.weightPa=c.stdpState.weight;}
    if(c.tripletPlasticity&&c.tripletState){c.tripletState=tripletStdpPost(c.tripletState,c.tripletPlasticity,spike.timeMs);c.weightPa=c.tripletState.weight;}
   }
  }
  this.clock=now+h;return fired;
 }
 advance(durationMs:number,maxStepMs:number,external:(timeMs:number)=>ReadonlyMap<number,number>=()=>new Map(),method:Integrator="rk4"):TimedSpike[]{
  if(!Number.isFinite(durationMs)||durationMs<=0||!Number.isFinite(maxStepMs)||maxStepMs<=0)throw new Error("durationMs and maxStepMs must be > 0");
  const stop=this.clock+durationMs,all:TimedSpike[]=[];
  while(this.clock<stop-1e-10){const nextEvent=this.queue.reduce((min,e)=>e.at>this.clock+1e-10?Math.min(min,e.at):min,stop);const h=Math.min(maxStepMs,stop-this.clock,nextEvent-this.clock);if(h<=1e-10){this.clock=Math.min(stop,nextEvent);continue;}all.push(...this.integrate(h,external(this.clock),method));}
  return all;
 }
}
export function binSpikeRaster(spikes:TimedSpike[],binWidthMs:number,durationMs:number):number[][]{
 if(!Number.isFinite(binWidthMs)||binWidthMs<=0||!Number.isFinite(durationMs)||durationMs<=0)throw new Error("binWidthMs and durationMs must be > 0");
 const ids=[...new Set(spikes.map(s=>s.neuronId))].sort((a,b)=>a-b),bins=Math.ceil(durationMs/binWidthMs),rows=ids.map(()=>Array(bins).fill(0)),index=new Map(ids.map((id,i)=>[id,i]));
 for(const s of spikes){if(s.timeMs<0||s.timeMs>durationMs)throw new Error("spike time outside raster duration");const b=Math.min(bins-1,Math.floor(s.timeMs/binWidthMs));rows[index.get(s.neuronId)!][b]++;}
 return rows;
}
