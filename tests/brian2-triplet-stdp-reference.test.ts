import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {createTripletStdpState,tripletStdpPre,tripletStdpPost} from "../src/engine/triplet-stdp.ts";

const fixturePath="validation/brian2-triplet-stdp-reference.json";
test("triplet STDP matches independent Brian2 event-driven reference sequences", {skip:!existsSync(fixturePath)}, () => {
  const f=JSON.parse(readFileSync(fixturePath,"utf8"));
  const p={...f.parameters,minWeight:0,maxWeight:1};
  for(const name of ["causalTriplets","antiCausalTriplets","mixedTriplets"] as const){
    const c=f[name];
    const events=[
      ...c.preTimesMs.map((timeMs:number)=>({timeMs,kind:"pre" as const})),
      ...c.postTimesMs.map((timeMs:number)=>({timeMs,kind:"post" as const})),
    ].sort((a,b)=>a.timeMs-b.timeMs);
    let state=createTripletStdpState(p.initialWeight);
    for(const event of events){
      state=event.kind==="pre"
        ?tripletStdpPre(state,p,event.timeMs)
        :tripletStdpPost(state,p,event.timeMs);
    }
    assert.ok(Math.abs(state.weight-c.weight)<1e-8,name+" Brian2 comparison: TypeScript="+state.weight+", Brian2="+c.weight);
  }
});
