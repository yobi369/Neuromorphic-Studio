import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {stepLif} from "../src/engine/index.ts";
const fixturePath="validation/nest-reference.json";
test("LIF passive membrane agrees with independent NEST iaf_psc_alpha fixture",{skip:!existsSync(fixturePath)},()=>{
 const f=JSON.parse(readFileSync(fixturePath,"utf8"));
 let state={voltageMv:-60,refractoryRemainingMs:0};
 for(let i=0;i<f.lif.steps;i++)state=stepLif(state,{tauM:20,resistanceMOhm:100,restMv:-70,resetMv:-65,thresholdMv:100,refractoryMs:0},0,f.lif.dtMs,"rk4").state;
 assert.ok(Math.abs(state.voltageMv-f.lif.state.voltageMv)<0.03,"TypeScript="+state.voltageMv+", NEST="+f.lif.state.voltageMv);
});
