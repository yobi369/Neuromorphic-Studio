import { mkdirSync, writeFileSync } from "node:fs";
import { exportModel } from "../src/engine/exporters.ts";
const config={name:"NeuromorphicSmoke",inputSize:8,hiddenSize:16,outputSize:4,tauMs:20,dtMs:1,threshold:1};
mkdirSync("validation/generated",{recursive:true});
for(const target of ["lava","snntorch","embedded-c"] as const){const artifact=exportModel(target,config);writeFileSync("validation/generated/"+artifact.filename,artifact.code);}
