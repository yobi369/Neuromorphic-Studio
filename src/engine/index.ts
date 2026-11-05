/** Deterministic SNN primitives. Units: ms, mV, pA, pF, nS, MOhm. */
export type Integrator = "euler" | "rk4";
export interface StepResult<S> { state:S; spike:boolean; }
export interface LifParameters { tauM:number; resistanceMOhm:number; restMv:number; resetMv:number; thresholdMv:number; refractoryMs:number; }
export interface LifState { voltageMv:number; refractoryRemainingMs:number; }
export interface AdExParameters { capacitancePf:number; leakConductanceNs:number; leakReversalMv:number; thresholdMv:number; slopeFactorMv:number; adaptationA:number; adaptationTauMs:number; adaptationBPa:number; resetMv:number; spikeCutoffMv:number; }
export interface AdExState { voltageMv:number; adaptationPa:number; }
export interface IzhikevichParameters { a:number; b:number; c:number; d:number; spikeCutoffMv:number; }
export interface IzhikevichState { voltageMv:number; recovery:number; }
const finite=(v:number,n:string)=>{if(!Number.isFinite(v))throw new Error(n+" must be finite");};
const positive=(v:number,n:string)=>{finite(v,n);if(v<=0)throw new Error(n+" must be > 0");};
function validateParameters(p:Record<string,number>){for(const [name,value] of Object.entries(p))finite(value,name);}
const validIntegrator=(m:Integrator)=>{if(m!=="euler"&&m!=="rk4")throw new Error("integrator must be euler or rk4");};
function validateStep(dt:number,current:number){positive(dt,"dtMs");finite(current,"currentPa");}
function scalar(y:number,dt:number,f:(v:number)=>number,m:Integrator):number {
 if(m==="euler")return y+dt*f(y);
 const k1=f(y),k2=f(y+dt*k1/2),k3=f(y+dt*k2/2),k4=f(y+dt*k3);
 return y+dt*(k1+2*k2+2*k3+k4)/6;
}
function pair(x:number,y:number,dt:number,f:(x:number,y:number)=>number,g:(x:number,y:number)=>number,m:Integrator):[number,number]{
 if(m==="euler")return [x+dt*f(x,y),y+dt*g(x,y)];
 const k1x=f(x,y),k1y=g(x,y),k2x=f(x+dt*k1x/2,y+dt*k1y/2),k2y=g(x+dt*k1x/2,y+dt*k1y/2);
 const k3x=f(x+dt*k2x/2,y+dt*k2y/2),k3y=g(x+dt*k2x/2,y+dt*k2y/2),k4x=f(x+dt*k3x,y+dt*k3y),k4y=g(x+dt*k3x,y+dt*k3y);
 return [x+dt*(k1x+2*k2x+2*k3x+k4x)/6,y+dt*(k1y+2*k2y+2*k3y+k4y)/6];
}
export function stepLif(s:LifState,p:LifParameters,i:number,dt:number,m:Integrator="rk4"):StepResult<LifState>{
 validateStep(dt,i);validateParameters(p);validIntegrator(m);positive(p.tauM,"tauM");positive(p.resistanceMOhm,"resistanceMOhm");if(p.refractoryMs<0)throw new Error("refractoryMs must be >= 0");
 if(s.refractoryRemainingMs>0)return {state:{voltageMv:p.resetMv,refractoryRemainingMs:Math.max(0,s.refractoryRemainingMs-dt)},spike:false};
 const v=scalar(s.voltageMv,dt,x=>(p.restMv-x+i*p.resistanceMOhm/1000)/p.tauM,m);
 return v>=p.thresholdMv?{state:{voltageMv:p.resetMv,refractoryRemainingMs:p.refractoryMs},spike:true}:{state:{voltageMv:v,refractoryRemainingMs:0},spike:false};
}
export function stepAdEx(s:AdExState,p:AdExParameters,i:number,dt:number,m:Integrator="rk4"):StepResult<AdExState>{
 validateStep(dt,i);validateParameters(p);validIntegrator(m);positive(p.capacitancePf,"capacitancePf");positive(p.leakConductanceNs,"leakConductanceNs");positive(p.slopeFactorMv,"slopeFactorMv");positive(p.adaptationTauMs,"adaptationTauMs");
 const f=(v:number,w:number)=>(-p.leakConductanceNs*(v-p.leakReversalMv)+p.leakConductanceNs*p.slopeFactorMv*Math.exp(Math.min(50,(v-p.thresholdMv)/p.slopeFactorMv))-w+i)/p.capacitancePf;
 const g=(v:number,w:number)=>(p.adaptationA*(v-p.leakReversalMv)-w)/p.adaptationTauMs;
 const [v,w]=pair(s.voltageMv,s.adaptationPa,dt,f,g,m);
 return v>=p.spikeCutoffMv?{state:{voltageMv:p.resetMv,adaptationPa:w+p.adaptationBPa},spike:true}:{state:{voltageMv:v,adaptationPa:w},spike:false};
}
export function stepIzhikevich(s:IzhikevichState,p:IzhikevichParameters,inputDrive:number,dt:number,m:Integrator="rk4"):StepResult<IzhikevichState>{
 validateStep(dt,inputDrive);validateParameters(p);validIntegrator(m);const f=(v:number,u:number)=>0.04*v*v+5*v+140-u+inputDrive,g=(v:number,u:number)=>p.a*(p.b*v-u);
 const [v,u]=pair(s.voltageMv,s.recovery,dt,f,g,m);
 return v>=p.spikeCutoffMv?{state:{voltageMv:p.c,recovery:u+p.d},spike:true}:{state:{voltageMv:v,recovery:u},spike:false};
}
export interface StdpParameters { aPlus:number;aMinus:number;tauPlusMs:number;tauMinusMs:number;minWeight:number;maxWeight:number; }
export interface StdpState { weight:number;preTrace:number;postTrace:number;lastTimeMs:number; }
export function createStdpState(weight:number,timeMs=0):StdpState{finite(weight,"weight");finite(timeMs,"timeMs");return {weight,preTrace:0,postTrace:0,lastTimeMs:timeMs};}
function decay(s:StdpState,p:StdpParameters,t:number):StdpState{
 finite(t,"timeMs");if(t<s.lastTimeMs)throw new Error("STDP events must be chronological");positive(p.tauPlusMs,"tauPlusMs");positive(p.tauMinusMs,"tauMinusMs");finite(p.aPlus,"aPlus");finite(p.aMinus,"aMinus");finite(p.minWeight,"minWeight");finite(p.maxWeight,"maxWeight");if(p.minWeight>p.maxWeight)throw new Error("minWeight must be <= maxWeight");
 const d=t-s.lastTimeMs;return {...s,preTrace:s.preTrace*Math.exp(-d/p.tauPlusMs),postTrace:s.postTrace*Math.exp(-d/p.tauMinusMs),lastTimeMs:t};
}
export function stdpPre(s:StdpState,p:StdpParameters,t:number):StdpState{const d=decay(s,p,t);return {...d,weight:Math.max(p.minWeight,Math.min(p.maxWeight,d.weight-p.aMinus*d.postTrace)),preTrace:d.preTrace+1};}
export function stdpPost(s:StdpState,p:StdpParameters,t:number):StdpState{const d=decay(s,p,t);return {...d,weight:Math.max(p.minWeight,Math.min(p.maxWeight,d.weight+p.aPlus*d.preTrace)),postTrace:d.postTrace+1};}
export interface NetworkNeuron{id:number;model:"lif";state:LifState;parameters:LifParameters;biasCurrentPa?:number;}
export interface NetworkSynapse{id:string;from:number;to:number;weightPa:number;delayMs:number;plasticity?:StdpParameters;stdpState?:StdpState;}
export interface NetworkSpike{neuronId:number;timeMs:number;}
interface QueuedEvent{atMs:number;target:number;currentPa:number;synapseId:string;}
export interface NetworkStep{timeMs:number;spikes:NetworkSpike[];deliveredEvents:number;}
export class EventDrivenNetwork{
 private neurons=new Map<number,NetworkNeuron>();private synapses:NetworkSynapse[]=[];private queue:QueuedEvent[]=[];private clock=0;readonly spikeHistory:NetworkSpike[]=[];
 constructor(neurons:NetworkNeuron[],synapses:NetworkSynapse[]){
  for(const n of neurons){if(this.neurons.has(n.id))throw new Error("duplicate neuron id");this.neurons.set(n.id,{...n,state:{...n.state},parameters:{...n.parameters}});}
  const ids=new Set<string>();for(const s of synapses){if(ids.has(s.id))throw new Error("duplicate synapse id");ids.add(s.id);if(!this.neurons.has(s.from)||!this.neurons.has(s.to))throw new Error("unknown neuron in synapse");if(s.delayMs<0||!Number.isFinite(s.weightPa))throw new Error("invalid synapse delay or weight");this.synapses.push({...s,stdpState:s.stdpState?{...s.stdpState}:s.plasticity?createStdpState(s.weightPa):undefined});}
 }
 get timeMs(){return this.clock;}getWeights(){return this.synapses.map(s=>({id:s.id,weightPa:s.weightPa}));}
 step(dt:number,external:ReadonlyMap<number,number>=new Map(),method:Integrator="rk4"):NetworkStep{
  positive(dt,"dtMs");const end=this.clock+dt,due=this.queue.filter(e=>e.atMs<=end+1e-12);this.queue=this.queue.filter(e=>e.atMs>end+1e-12);
  const currents=new Map<number,number>();
  for(const e of due.sort((a,b)=>a.atMs-b.atMs)){const syn=this.synapses.find(s=>s.id===e.synapseId);if(syn?.plasticity&&syn.stdpState){syn.stdpState=stdpPre(syn.stdpState,syn.plasticity,e.atMs);syn.weightPa=syn.stdpState.weight;}currents.set(e.target,(currents.get(e.target)||0)+e.currentPa);}
  for(const [id,v] of external)currents.set(id,(currents.get(id)||0)+v);
  const spikes:NetworkSpike[]=[];for(const n of this.neurons.values()){const r=stepLif(n.state,n.parameters,(n.biasCurrentPa||0)+(currents.get(n.id)||0),dt,method);n.state=r.state;if(r.spike)spikes.push({neuronId:n.id,timeMs:end});}
  for(const sp of spikes){this.spikeHistory.push(sp);for(const syn of this.synapses.filter(s=>s.from===sp.neuronId)){this.queue.push({atMs:end+syn.delayMs,target:syn.to,currentPa:syn.weightPa,synapseId:syn.id});}
   for(const syn of this.synapses.filter(s=>s.to===sp.neuronId&&s.plasticity&&s.stdpState)){syn.stdpState=stdpPost(syn.stdpState!,syn.plasticity!,end);syn.weightPa=syn.stdpState.weight;}}
  this.clock=end;return {timeMs:end,spikes,deliveredEvents:due.length};
 }
 run(duration:number,dt:number,input:(t:number)=>ReadonlyMap<number,number>=()=>new Map(),method:Integrator="rk4"):NetworkStep[]{positive(duration,"durationMs");positive(dt,"dtMs");const out:NetworkStep[]=[];for(let i=0;i<Math.ceil(duration/dt);i++){const h=Math.min(dt,duration-i*dt);if(h>1e-12)out.push(this.step(h,input(this.clock),method));}return out;}
}
export interface SpikeTrainStats{count:number;rateHz:number;meanIsiMs:number|null;cvIsi:number|null;}
export function analyzeSpikeTrain(times:number[],duration:number):SpikeTrainStats{
 positive(duration,"durationMs");for(let i=0;i<times.length;i++){finite(times[i],"spike time");if(times[i]<0||times[i]>duration)throw new Error("spike time outside duration");if(i&&times[i]<times[i-1])throw new Error("spike times must be sorted");}
 const isi=times.slice(1).map((t,i)=>t-times[i]),mean=isi.length?isi.reduce((a,b)=>a+b,0)/isi.length:null;
 const variance=mean===null?null:isi.reduce((a,b)=>a+(b-mean)**2,0)/isi.length;
 return {count:times.length,rateHz:times.length/(duration/1000),meanIsiMs:mean,cvIsi:mean===null||mean===0?null:Math.sqrt(variance!)/mean};
}
