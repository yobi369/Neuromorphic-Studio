import test from "node:test";
import assert from "node:assert/strict";
import {createTripletStdpState,tripletStdpPre,tripletStdpPost} from "../src/engine/triplet-stdp.ts";
import {exportModel} from "../src/engine/exporters.ts";
test("triplet STDP gives pair-based LTP/LTD and validates event ordering",()=>{const p={aPlus:.01,aMinus:.012,tauPlusMs:20,tauMinusMs:20,a3Plus:.005,a3Minus:.004,tauXSlowMs:100,tauYSlowMs:100,minWeight:0,maxWeight:1};let s=tripletStdpPre(createTripletStdpState(.5),p,0);s=tripletStdpPost(s,p,10);assert.ok(s.weight>.5);let d=tripletStdpPost(createTripletStdpState(.5),p,0);d=tripletStdpPre(d,p,10);assert.ok(d.weight<.5);assert.throws(()=>tripletStdpPre(s,p,0),/chronological/);});
test("exporters validate topology and disclose compatibility limits",()=>{const c={name:"Model_1",inputSize:8,hiddenSize:16,outputSize:4,tauMs:20,dtMs:1,threshold:1};for(const target of ["lava","snntorch","embedded-c"] as const){const artifact=exportModel(target,c);assert.ok(artifact.code.length>100);assert.equal(artifact.compatibility,"template-generated-not-sdk-certified");}assert.throws(()=>exportModel("embedded-c",{...c,hiddenSize:64}),/32 hidden/);});
