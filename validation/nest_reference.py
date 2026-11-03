"""Generate a passive membrane reference fixture from NEST 3.10.0."""
import json
from pathlib import Path
import nest

nest.ResetKernel()
nest.SetKernelStatus({"resolution": 0.01, "print_time": False})
neuron = nest.Create("iaf_psc_alpha", params={
    "V_m": -60.0, "E_L": -70.0, "V_th": 100.0, "V_reset": -65.0,
    "tau_m": 20.0, "C_m": 200.0, "t_ref": 2.0,
    "tau_syn_ex": 2.0, "tau_syn_in": 2.0, "I_e": 0.0,
})
meter = nest.Create("multimeter", params={"record_from": ["V_m"], "interval": 0.01})
nest.Connect(meter, neuron)
nest.Simulate(1.0)
events = meter.get("events")
if len(events["V_m"]) == 0:
    raise RuntimeError("NEST did not record membrane voltage")
fixture = {"source":"NEST Simulator 3.10.0; iaf_psc_alpha; resolution=0.01 ms",
 "lif":{"dtMs":0.01,"steps":100,"state":{"voltageMv":float(events["V_m"][-1])}}}
Path("validation").mkdir(exist_ok=True)
Path("validation/nest-reference.json").write_text(json.dumps(fixture,indent=2)+"\n")
print(json.dumps(fixture,indent=2))
