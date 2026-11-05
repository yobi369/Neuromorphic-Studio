import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {stepLif,stepAdEx,stepIzhikevich} from "../src/engine/index.ts";
const fixturePath="validation/brian2-reference.json";
test("neuron models agree with independent Brian2 RK4 reference fixture",{skip:!existsSync(fixturePath)},()=>{
 const f=JSON.parse(readFileSync(fixturePath,"utf8"));
 let lifState={voltageMv:-60,refractoryRemainingMs:0};for(let i=0;i<f.lif.steps;i++)lifState=stepLif(lifState,{tauM:20,resistanceMOhm:100,restMv:-70,resetMv:-65,thresholdMv:100,refractoryMs:0},0,f.lif.dtMs,"rk4").state;
 assert.ok(Math.abs(lifState.voltageMv-f.lif.state.voltageMv)<1e-7);
 let adexState={voltageMv:-70,adaptationPa:0};for(let i=0;i<f.adex.steps;i++)adexState=stepAdEx(adexState,{capacitancePf:200,leakConductanceNs:10,leakReversalMv:-70,thresholdMv:-50,slopeFactorMv:2,adaptationA:2,adaptationTauMs:100,adaptationBPa:20,resetMv:-60,spikeCutoffMv:100},0,f.adex.dtMs,"rk4").state;
 assert.ok(Math.abs(adexState.voltageMv-f.adex.state.voltageMv)<1e-6);
 assert.ok(Math.abs(adexState.adaptationPa-f.adex.state.adaptationPa)<1e-6);
 let izhState={voltageMv:-65,recovery:-13};for(let i=0;i<f.izhikevich.steps;i++)izhState=stepIzhikevich(izhState,{a:.02,b:.2,c:-65,d:8,spikeCutoffMv:1000},0,f.izhikevich.dtMs,"rk4").state;
 assert.ok(Math.abs(izhState.voltageMv-f.izhikevich.state.voltageMv)<1e-6);
 assert.ok(Math.abs(izhState.recovery-f.izhikevich.state.recovery)<1e-6);
});
