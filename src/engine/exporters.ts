export type ExportTarget="lava"|"snntorch"|"embedded-c";
export interface ExportConfig {name:string;inputSize:number;hiddenSize:number;outputSize:number;tauMs:number;dtMs:number;threshold:number;weights?:number[][];bias?:number[];}
export interface ExportArtifact {target:ExportTarget;filename:string;language:"python"|"c";code:string;compatibility:"template-generated-not-sdk-certified";assumptions:string[];}
const safeName=(name:string)=>{const n=name.replace(/[^a-zA-Z0-9_]/g,"");if(!n||!/^[a-zA-Z_]/.test(n))throw new Error("Model name must produce a valid identifier");return n;};
export function validateExportConfig(c:ExportConfig){
 for(const [k,v] of Object.entries({inputSize:c.inputSize,hiddenSize:c.hiddenSize,outputSize:c.outputSize,tauMs:c.tauMs,dtMs:c.dtMs,threshold:c.threshold}))if(!Number.isFinite(v)||v<=0)throw new Error(k+" must be finite and > 0");
 if(!Number.isInteger(c.inputSize)||!Number.isInteger(c.hiddenSize)||!Number.isInteger(c.outputSize))throw new Error("layer sizes must be integers");
 if(c.hiddenSize>32&&c.target==="embedded-c")throw new Error("embedded-c exporter supports at most 32 hidden neurons (uint32 spike mask)");
}
export function exportModel(target:ExportTarget,c:ExportConfig):ExportArtifact{
 validateExportConfig({...c,target} as ExportConfig & {target:ExportTarget});const name=safeName(c.name),beta=Math.exp(-c.dtMs/c.tauMs);
 if(target==="snntorch"){
 const code=`"""Generated SNN inference/training scaffold. Install pinned torch and snntorch versions separately.""" 
import torch
import torch.nn as nn
import snntorch as snn
from snntorch import surrogate

class ${name}(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(${c.inputSize}, ${c.hiddenSize})
        self.lif1 = snn.Leaky(beta=${beta.toFixed(8)}, threshold=${c.threshold}, spike_grad=surrogate.fast_sigmoid(), reset_mechanism="zero")
        self.fc2 = nn.Linear(${c.hiddenSize}, ${c.outputSize})
        self.lif2 = snn.Leaky(beta=${beta.toFixed(8)}, threshold=${c.threshold}, spike_grad=surrogate.fast_sigmoid(), reset_mechanism="zero")

    def forward(self, x_seq):
        mem1 = self.lif1.reset_mem()
        mem2 = self.lif2.reset_mem()
        spikes = []
        for x_t in x_seq:  # [time, batch, features]
            spk1, mem1 = self.lif1(self.fc1(x_t), mem1)
            spk2, mem2 = self.lif2(self.fc2(spk1), mem2)
            spikes.append(spk2)
        return torch.stack(spikes), mem2

if __name__ == "__main__":
    model = ${name}()
    example = torch.zeros(10, 2, ${c.inputSize})
    out, final_membrane = model(example)
    print(out.shape, final_membrane.shape)
`;
 return {target,filename:name.toLowerCase()+"_snntorch.py",language:"python",code,compatibility:"template-generated-not-sdk-certified",assumptions:["LIF-only discrete-time model","Zero-reset snn.Leaky semantics","Weights are initialized by PyTorch; exported source does not claim to preserve trained source weights","CPU/GPU execution depends on separately installed compatible PyTorch build"]};
 }
 if(target==="lava"){
 const code=`"""Lava process-graph scaffold. Run with a Lava version installed and a supported RunConfig."""
import numpy as np
from lava.magma.core.run_conditions import RunSteps
from lava.magma.core.run_configs import Loihi2SimCfg
from lava.proc.io.source import RingBuffer
from lava.proc.dense.process import Dense
from lava.proc.lif.process import LIF

INPUTS, HIDDEN, OUTPUTS = ${c.inputSize}, ${c.hiddenSize}, ${c.outputSize}
STEPS = 100
rng = np.random.default_rng(20261103)
input_spikes = rng.integers(0, 2, size=(INPUTS, STEPS), dtype=np.int32)
source = RingBuffer(data=input_spikes)
hidden = LIF(shape=(HIDDEN,), du=0, dv=${Math.max(0,Math.min(1,1-beta)).toFixed(8)}, vth=${Math.round(c.threshold)})
output = LIF(shape=(OUTPUTS,), du=0, dv=${Math.max(0,Math.min(1,1-beta)).toFixed(8)}, vth=${Math.round(c.threshold)})
w1 = rng.integers(-2, 3, size=(HIDDEN, INPUTS), dtype=np.int32)
w2 = rng.integers(-2, 3, size=(OUTPUTS, HIDDEN), dtype=np.int32)
dense1, dense2 = Dense(weights=w1), Dense(weights=w2)
source.s_out.connect(dense1.s_in)
dense1.a_out.connect(hidden.a_in)
hidden.s_out.connect(dense2.s_in)
dense2.a_out.connect(output.a_in)
hidden.run(condition=RunSteps(num_steps=STEPS), run_cfg=Loihi2SimCfg(select_tag="floating_pt"))
hidden.stop()
print("Lava simulation completed. This uses the Lava simulator configuration, not physical Loihi hardware.")
`;
 return {target,filename:name.toLowerCase()+"_lava.py",language:"python",code,compatibility:"template-generated-not-sdk-certified",assumptions:["LIF-only export; AdEx, Izhikevich and custom delays are not represented","Weights are generated deterministically for a runnable topology scaffold, not transferred from trained source weights","Loihi2SimCfg selects a simulation configuration; it does not establish access to physical Loihi 2 hardware","Lava package, SDK version and hardware compiler must be installed and validated by the user"]};
 }
 const code=`/* Generated fixed-point C99 LIF inference kernel.
 * Q8.8 voltage/current; caller supplies already quantized synaptic currents.
 * No dynamic allocation. This is portable C, not a board-specific firmware image.
 */
#include <stdint.h>
#include <stddef.h>
#define INPUTS ${c.inputSize}
#define HIDDEN ${c.hiddenSize}
#define OUTPUTS ${c.outputSize}
#define Q 256
#define DECAY_Q8 ${Math.round(beta*256)}
#define THRESHOLD_Q8 ${Math.round(c.threshold*256)}
typedef struct { int16_t v[HIDDEN]; uint32_t spikes; } ${name}_state;
void ${name}_reset(${name}_state *s) { if (!s) return; for (size_t i=0;i<HIDDEN;i++) s->v[i]=0; s->spikes=0; }
uint32_t ${name}_step(${name}_state *s, const int16_t current_q8[HIDDEN]) {
 if (!s || !current_q8) return 0;
 s->spikes=0;
 for (size_t i=0;i<HIDDEN;i++) {
   int32_t v=((int32_t)s->v[i]*DECAY_Q8)/Q + current_q8[i];
   if (v>=THRESHOLD_Q8) { s->spikes |= ((uint32_t)1u<<i); v=0; }
   if (v>INT16_MAX) v=INT16_MAX; if (v<INT16_MIN) v=INT16_MIN;
   s->v[i]=(int16_t)v;
 }
 return s->spikes;
}
`;
 return {target,filename:name.toLowerCase()+"_embedded.c",language:"c",code,compatibility:"template-generated-not-sdk-certified",assumptions:["Portable C99 kernel; no CMSIS, HAL, startup code, linker script or board peripheral drivers","Q8.8 quantization and decay coefficient approximation introduce numerical error","Input current must be quantized and supplied by the caller; no full synaptic matrix is exported","Compile with a target toolchain and validate on the actual MCU before deployment"]};
}
