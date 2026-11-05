"""Generate pair-STDP timing-window references with Brian2 event-driven synaptic traces."""
import json
from pathlib import Path
from brian2 import *

prefs.codegen.target = "numpy"
defaultclock.dt = 0.01 * ms
A_PLUS = 0.08
A_MINUS = 0.12
TAU_PLUS = 20 * ms
TAU_MINUS = 30 * ms

def run_pair(pre_time_ms, post_time_ms):
    start_scope()
    pre = SpikeGeneratorGroup(1, [0], [pre_time_ms] * ms)
    post = SpikeGeneratorGroup(1, [0], [post_time_ms] * ms)
    syn = Synapses(
        pre, post,
        model="""
        w : 1
        dApre/dt = -Apre/tau_plus : 1 (event-driven)
        dApost/dt = -Apost/tau_minus : 1 (event-driven)
        tau_plus : second (shared)
        tau_minus : second (shared)
        A_plus : 1 (shared)
        A_minus : 1 (shared)
        """,
        on_pre="""
        w = clip(w - A_minus*Apost, 0, 1)
        Apre += 1
        """,
        on_post="""
        w = clip(w + A_plus*Apre, 0, 1)
        Apost += 1
        """,
    )
    syn.connect()
    syn.w = 0.5
    syn.tau_plus = TAU_PLUS
    syn.tau_minus = TAU_MINUS
    syn.A_plus = A_PLUS
    syn.A_minus = A_MINUS
    run(15 * ms)
    return float(syn.w[0])

fixture = {
 "source":"Brian2 2.9.0; event-driven exponential pair STDP; dt=0.01 ms",
 "parameters":{"initialWeight":0.5,"aPlus":A_PLUS,"aMinus":A_MINUS,"tauPlusMs":20.0,"tauMinusMs":30.0},
 "causal":{"preTimeMs":1.0,"postTimeMs":11.0,"weight":run_pair(1.0,11.0)},
 "antiCausal":{"preTimeMs":11.0,"postTimeMs":1.0,"weight":run_pair(11.0,1.0)}
}
Path("validation").mkdir(exist_ok=True)
Path("validation/brian2-stdp-reference.json").write_text(json.dumps(fixture,indent=2)+"\n")
print(json.dumps(fixture,indent=2))
