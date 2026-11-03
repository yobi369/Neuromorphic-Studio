"""Generate independent Brian2 RK4 reference fixtures for one-step neuron states."""
import json
from pathlib import Path
from brian2 import *

prefs.codegen.target = "numpy"
defaultclock.dt = 0.01 * ms
start_scope()

# Passive LIF: same differential equation and RK4 integration as the TS core.
lif = NeuronGroup(1, "dv/dt = (v_rest-v)/tau : volt", method="rk4")
lif.v = -60*mV
lif.v_rest = -70*mV
lif.tau = 20*ms
ml = StateMonitor(lif, "v", record=True)
run(1*ms)

# AdEx subthreshold dynamics, with explicitly dimensioned conductance/capacitance.
start_scope()
eq_adex = """
dv/dt = (-gL*(v-EL) + gL*DeltaT*exp((v-VT)/DeltaT) - w + I)/C : volt
dw/dt = (a*(v-EL)-w)/tauw : amp
gL : siemens
EL : volt
DeltaT : volt
VT : volt
C : farad
a : siemens
tauw : second
I : amp
"""
adex = NeuronGroup(1, eq_adex, method="rk4")
adex.v=-70*mV; adex.w=0*pA; adex.gL=10*nS; adex.EL=-70*mV
adex.DeltaT=2*mV; adex.VT=-50*mV; adex.C=200*pF
adex.a=2*nS; adex.tauw=100*ms; adex.I=0*pA
ma=StateMonitor(adex, ["v","w"], record=True)
run(0.1*ms)

# Izhikevich subthreshold equations in mV and ms.
start_scope()
eq_izh = """
dv/dt = (0.04/mV/ms)*v*v + 5/ms*v + 140*mV/ms - u*mV/ms + I*mV/ms : volt
du/dt = a/ms*(b*v/mV-u) : 1
a : 1
b : 1
I : 1
"""
izh=NeuronGroup(1,eq_izh,method="rk4")
izh.v=-65*mV; izh.u=-13; izh.a=.02; izh.b=.2; izh.I=0
mi=StateMonitor(izh,["v","u"],record=True)
run(.1*ms)

fixture={
 "source":"Brian2 2.9.0; NumPy code generation; RK4; dt=0.01 ms",
 "lif":{"dtMs":0.01,"steps":100,"state":{"voltageMv":float(lif.v[0]/mV)}},
 "adex":{"dtMs":0.01,"steps":10,"state":{"voltageMv":float(adex.v[0]/mV),"adaptationPa":float(adex.w[0]/pA)}},
 "izhikevich":{"dtMs":0.01,"steps":10,"state":{"voltageMv":float(izh.v[0]/mV),"recovery":float(izh.u[0])}}
}
Path("validation").mkdir(exist_ok=True)
Path("validation/brian2-reference.json").write_text(json.dumps(fixture,indent=2)+"\n")
print(json.dumps(fixture,indent=2))
