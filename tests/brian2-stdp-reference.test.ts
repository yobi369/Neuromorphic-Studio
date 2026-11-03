import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {createStdpState,stdpPre,stdpPost} from "../src/engine/index.ts";
const fixturePath="validation/brian2-stdp-reference.json";
test("pair STDP timing windows agree with independent Brian2 event-driven synapse",{skip:!existsSync(fixturePath)},()=>{
 const f=JSON.parse(readFileSync(fixturePath,"utf8")),p={...f.parameters,minWeight:0,maxWeight:1};
 let causal=stdpPre(createStdpState(p.initialWeight),p,f.causal.preTimeMs);
 causal=stdpPost(causal,p,f.causal.postTimeMs);
 let anti=stdpPost(createStdpState(p.initialWeight),p,f.antiCausal.postTimeMs);
 anti=stdpPre(anti,p,f.antiCausal.preTimeMs);
 assert.ok(Math.abs(causal.weight-f.causal.weight)<1e-8,"causal Brian2 comparison");
 assert.ok(Math.abs(anti.weight-f.antiCausal.weight)<1e-8,"anti-causal Brian2 comparison");
});
