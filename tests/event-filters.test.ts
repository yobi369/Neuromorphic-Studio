import test from "node:test";
import assert from "node:assert/strict";
import {filterBackgroundActivity} from "../src/engine/event-filters.ts";
import type {EventRecord} from "../src/engine/dataset.ts";
const event=(sampleId:string,timestampUs:number,x:number,y:number):EventRecord=>({sampleId,label:"motion",split:"test",timestampUs,x,y,polarity:1});
test("background activity filter retains events with a recent active 8-neighbour",()=>{const input=[event("a",0,1,1),event("a",10,2,1),event("a",15,4,4),event("a",40,1,1),event("b",11,2,1)];const out=filterBackgroundActivity(input,20,8,8);assert.deepEqual(out.retained.map(e=>e.timestampUs),[10]);assert.equal(out.rejected.length,4);});
test("background activity filter validates time window and sensor bounds",()=>{assert.throws(()=>filterBackgroundActivity([event("a",0,1,1)],0,8,8),/positive/);assert.throws(()=>filterBackgroundActivity([event("a",0,8,1)],10,8,8),/bounds/);assert.throws(()=>filterBackgroundActivity([event("a",10,1,1),event("a",9,2,1)],10,8,8),/chronological/);});
