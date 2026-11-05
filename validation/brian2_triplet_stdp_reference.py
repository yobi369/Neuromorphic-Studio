"""Generate independent Brian2 event-driven triplet-STDP reference fixtures."""
import json
from pathlib import Path
import numpy as np
from brian2 import *

prefs.codegen.target = "numpy"
defaultclock.dt = 0.01 * ms

A_PLUS = 0.08
A_MINUS = 0.12
A3_PLUS = 0.015
A3_MINUS = 0.02
TAU_PLUS = 20 * ms
TAU_MINUS = 30 * ms
TAU_X_SLOW = 100 * ms
TAU_Y_SLOW = 120 * ms

def run_triplet(pre_times_ms, post_times_ms):
    start_scope()
    pre = SpikeGeneratorGroup(1, np.zeros(len(pre_times_ms), dtype=int), np.asarray(pre_times_ms) * ms)
    post = SpikeGeneratorGroup(1, np.zeros(len(post_times_ms), dtype=int), np.asarray(post_times_ms) * ms)
    syn = Synapses(
        pre, post,
        model="""
        w : 1
        dApre/dt = -Apre/tau_plus : 1 (event-driven)
        dApre2/dt = -Apre2/tau_x_slow : 1 (event-driven)
        dApost/dt = -Apost/tau_minus : 1 (event-driven)
        dApost2/dt = -Apost2/tau_y_slow : 1 (event-driven)
        tau_plus : second (shared)
        tau_minus : second (shared)
        tau_x_slow : second (shared)
        tau_y_slow : second (shared)
        A_plus : 1 (shared)
        A_minus : 1 (shared)
        A3_plus : 1 (shared)
        A3_minus : 1 (shared)
        """,
        on_pre="""
        w = clip(w - A_minus*Apost - A3_minus*Apost*Apre2, 0, 1)
        Apre += 1
        Apre2 += 1
        """,
        on_post="""
        w = clip(w + A_plus*Apre + A3_plus*Apre*Apost2, 0, 1)
        Apost += 1
        Apost2 += 1
        """,
    )
    syn.connect()
    syn.w = 0.5
    syn.tau_plus = TAU_PLUS
    syn.tau_minus = TAU_MINUS
    syn.tau_x_slow = TAU_X_SLOW
    syn.tau_y_slow = TAU_Y_SLOW
    syn.A_plus = A_PLUS
    syn.A_minus = A_MINUS
    syn.A3_plus = A3_PLUS
    syn.A3_minus = A3_MINUS
    run(40 * ms)
    return float(syn.w[0])

cases = {
    "causalTriplets": {"preTimesMs": [1.0, 11.0, 21.0], "postTimesMs": [6.0, 16.0, 26.0]},
    "antiCausalTriplets": {"preTimesMs": [6.0, 16.0, 26.0], "postTimesMs": [1.0, 11.0, 21.0]},
    "mixedTriplets": {"preTimesMs": [1.0, 10.0, 19.0], "postTimesMs": [5.0, 14.0, 23.0]},
}
for case in cases.values():
    case["weight"] = run_triplet(case["preTimesMs"], case["postTimesMs"])

fixture = {
    "source": "Brian2 2.9.0; event-driven Pfister-Gerstner-style triplet traces; dt=0.01 ms",
    "parameters": {
        "initialWeight": 0.5, "aPlus": A_PLUS, "aMinus": A_MINUS,
        "a3Plus": A3_PLUS, "a3Minus": A3_MINUS,
        "tauPlusMs": 20.0, "tauMinusMs": 30.0,
        "tauXSlowMs": 100.0, "tauYSlowMs": 120.0,
    },
    **cases,
}
Path("validation").mkdir(exist_ok=True)
Path("validation/brian2-triplet-stdp-reference.json").write_text(json.dumps(fixture, indent=2) + "\n")
print(json.dumps(fixture, indent=2))
