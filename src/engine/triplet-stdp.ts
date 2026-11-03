import { StdpParameters } from "./index.ts";
export interface TripletStdpParameters extends StdpParameters {
  a3Plus:number; a3Minus:number; tauXSlowMs:number; tauYSlowMs:number;
}
export interface TripletStdpState {
  weight:number; xPreFast:number; xPreSlow:number; yPostFast:number; yPostSlow:number; lastTimeMs:number;
}
const finite=(v:number,n:string)=>{if(!Number.isFinite(v))throw new Error(n+" must be finite");};
const positive=(v:number,n:string)=>{finite(v,n);if(v<=0)throw new Error(n+" must be > 0");};
function advance(s:TripletStdpState,p:TripletStdpParameters,t:number):TripletStdpState {
 finite(t,"timeMs");if(t<s.lastTimeMs)throw new Error("Triplet STDP events must be chronological");
 positive(p.tauPlusMs,"tauPlusMs");positive(p.tauMinusMs,"tauMinusMs");positive(p.tauXSlowMs,"tauXSlowMs");positive(p.tauYSlowMs,"tauYSlowMs");
 if(p.minWeight>p.maxWeight)throw new Error("minWeight must be <= maxWeight");
 const dt=t-s.lastTimeMs;
 return {...s,xPreFast:s.xPreFast*Math.exp(-dt/p.tauPlusMs),xPreSlow:s.xPreSlow*Math.exp(-dt/p.tauXSlowMs),yPostFast:s.yPostFast*Math.exp(-dt/p.tauMinusMs),yPostSlow:s.yPostSlow*Math.exp(-dt/p.tauYSlowMs),lastTimeMs:t};
}
const clamp=(w:number,p:TripletStdpParameters)=>Math.max(p.minWeight,Math.min(p.maxWeight,w));
export function createTripletStdpState(weight:number,timeMs=0):TripletStdpState {finite(weight,"weight");finite(timeMs,"timeMs");return {weight,xPreFast:0,xPreSlow:0,yPostFast:0,yPostSlow:0,lastTimeMs:timeMs};}
/** Pfister-Gerstner-style triplet rule. Pre events depress; post events potentiate.
 * Triplet terms couple a fast trace to a slow trace; amplitudes are fitted parameters.
 */
export function tripletStdpPre(s:TripletStdpState,p:TripletStdpParameters,t:number):TripletStdpState {
 const d=advance(s,p,t),delta=p.aMinus*d.yPostFast+p.a3Minus*d.yPostFast*d.xPreSlow;
 return {...d,weight:clamp(d.weight-delta,p),xPreFast:d.xPreFast+1,xPreSlow:d.xPreSlow+1};
}
export function tripletStdpPost(s:TripletStdpState,p:TripletStdpParameters,t:number):TripletStdpState {
 const d=advance(s,p,t),delta=p.aPlus*d.xPreFast+p.a3Plus*d.xPreFast*d.yPostSlow;
 return {...d,weight:clamp(d.weight+delta,p),yPostFast:d.yPostFast+1,yPostSlow:d.yPostSlow+1};
}
