import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {stepLif,stepAdEx,stepIzhikevich} from "../src/engine/index.ts";

const fixturePath="validation/brian2-convergence-reference.json";
test("RK4 LIF, AdEx and Izhikevich converge toward high-resolution Brian2 references", {skip:!existsSync(fixturePath)}, () => {
  const f=JSON.parse(readFileSync(fixturePath,"utf8"));
  const stepSizes=[0.1,0.05,0.025,0.0125,0.00625];
  const integrate=(dt:number,kind:"lif"|"adex"|"izhikevich")=>{
    const count=Math.round(f.durationMs/dt);
    if(kind==="lif"){
      let state={voltageMv:-60,refractoryRemainingMs:0};
      const p={tauM:20,resistanceMOhm:100,restMv:-70,resetMv:-65,thresholdMv:100,refractoryMs:0};
      for(let i=0;i<count;i++)state=stepLif(state,p,0,dt,"rk4").state;
      return Math.abs(state.voltageMv-f.lif.voltageMv);
    }
    if(kind==="adex"){
      let state={voltageMv:-70,adaptationPa:0};
      const p={capacitancePf:200,leakConductanceNs:10,leakReversalMv:-70,thresholdMv:-50,slopeFactorMv:2,adaptationA:2,adaptationTauMs:100,adaptationBPa:20,resetMv:-60,spikeCutoffMv:1000};
      for(let i=0;i<count;i++)state=stepAdEx(state,p,250,dt,"rk4").state;
      return Math.abs(state.voltageMv-f.adex.voltageMv)+Math.abs(state.adaptationPa-f.adex.adaptationPa);
    }
    let state={voltageMv:-65,recovery:-13};
    const p={a:.02,b:.2,c:-65,d:8,spikeCutoffMv:1000};
    for(let i=0;i<count;i++)state=stepIzhikevich(state,p,2,dt,"rk4").state;
    return Math.abs(state.voltageMv-f.izhikevich.voltageMv)+Math.abs(state.recovery-f.izhikevich.recovery);
  };
  for(const kind of ["lif","adex","izhikevich"] as const){
    const errors=stepSizes.map(dt=>integrate(dt,kind));
    for(let i=1;i<errors.length;i++)assert.ok(errors[i]<errors[i-1],kind+" RK4 error did not decrease under step halving: "+JSON.stringify({stepSizes,errors}));
  }
});
