import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {stepLif,stepAdEx,stepIzhikevich} from "../src/engine/index.ts";
const fixturePath="validation/brian2-reference.json";
test("neuron models agree with independent Brian2 RK4 reference fixture",{skip:!existsSync(fixturePath)},()=>{
 const f=JSON.parse(readFileSync(fixturePath,"utf8"));
 const lif=stepLif({voltageMv:-60,refractoryRemainingMs:0},{tauM:20,resistanceMOhm:100,restMv:-70,resetMv:-65,thresholdMv:100,refractoryMs:0},0,f.lif.dtMs,"rk4");
 assert.ok(Math.abs(lif.state.voltageMv-f.lif.state.voltageMv)<1e-7);
 const adex=stepAdEx({voltageMv:-70,adaptationPa:0},{capacitancePf:200,leakConductanceNs:10,leakReversalMv:-70,thresholdMv:-50,slopeFactorMv:2,adaptationA:2,adaptationTauMs:100,adaptationBPa:20,resetMv:-60,spikeCutoffMv:100},0,f.adex.dtMs,"rk4");
 assert.ok(Math.abs(adex.state.voltageMv-f.adex.state.voltageMv)<1e-6);
 assert.ok(Math.abs(adex.state.adaptationPa-f.adex.state.adaptationPa)<1e-6);
 const izh=stepIzhikevich({voltageMv:-65,recovery:-13},{a:.02,b:.2,c:-65,d:8,spikeCutoffMv:1000},0,f.izhikevich.dtMs,"rk4");
 assert.ok(Math.abs(izh.state.voltageMv-f.izhikevich.state.voltageMv)<1e-6);
 assert.ok(Math.abs(izh.state.recovery-f.izhikevich.state.recovery)<1e-6);
});
