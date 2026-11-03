# Scientific validation plan

## Current status

The repository contains UI work areas for DVS encoding, LIF/AdEx/Izhikevich neuron models, SNN networks, STDP, hardware profiling, benchmarking and robotics control. Repository presence or UI output does **not** establish that these implementations reproduce accepted scientific models. No independent validation evidence is currently documented here.

## Validation requirements by subsystem

### Event-camera / DVS encoding
- Define the input representation, timestamp unit, polarity convention and coordinate bounds.
- Test ordering, duplicate timestamps, simultaneous events, empty streams and invalid coordinates.
- Compare encoders against published datasets or a trusted event-camera toolkit.
- Report event loss, latency, throughput and temporal distortion.

### Neuron dynamics
- Publish each differential equation, parameter units, reset behavior and refractory semantics.
- State integration scheme and timestep; test convergence as timestep decreases.
- Compare voltage traces, spike times, firing-rate curves and response regimes against Brian2 or another pinned reference implementation.
- Include analytic cases where available and test pathological parameter combinations.

### Synaptic plasticity
- Specify pair-based or triplet rule, trace convention, update ordering, weight bounds and units.
- Test pre-before-post and post-before-pre timing windows, zero lag, boundary clipping and repeated events.
- Compare the full STDP learning window against a reference and test conservation/stability assumptions.

### Network simulation
- Define connectivity generation, delay handling, event scheduling, synaptic current semantics and deterministic ordering.
- Test single-neuron, two-neuron, feed-forward and recurrent reference networks.
- Record seed, topology, parameter manifest and simulator revision for every run.

### Hardware and energy profiling
- Separate analytical estimates, vendor-published specifications, simulator estimates and physical measurements.
- Cite the source and revision for every vendor figure.
- Do not label energy-per-operation or latency as measured unless captured on the named hardware with a documented instrument and protocol.
- Report idle baseline, workload, sampling interval, repetitions, variance and thermal/power conditions.

### Benchmarks
- Pin dataset version and checksum, preprocessing, split and class mapping.
- Prevent train/test leakage; document model selection and hyperparameter tuning.
- Report accuracy plus per-class precision/recall, confusion matrix, latency distribution and energy methodology.
- Include confidence intervals and compare against a conventional baseline and a suitable SNN baseline.

### Robotics and control
- State plant dynamics, units, controller, observation delay and actuator constraints.
- Compare with a conventional control baseline.
- Test perturbations, sensor noise, latency, actuator saturation and failure recovery in simulation before any physical deployment.

## Required experiment record

Each reproducible result should capture:
- experiment ID and UTC timestamp;
- Git commit and simulator version;
- model equations, units and parameter values;
- dataset/source and cryptographic hash;
- random seed and runtime environment;
- numerical method and timestep;
- hardware/firmware details where relevant;
- raw trace/artifact location;
- metrics, uncertainty and baseline;
- reviewer and validation status.

## Status vocabulary

- **Implemented:** code exists and has local tests.
- **Reference-checked:** output agrees with a named, version-pinned reference within a stated tolerance.
- **Dataset-validated:** evaluated on a named, versioned holdout with reproducible protocol.
- **Hardware-measured:** measured on named physical hardware using a documented procedure.
- **Independently reproduced:** a separate operator reproduced the result from the recorded manifest.

Do not advance a subsystem's status without retaining the evidence.
