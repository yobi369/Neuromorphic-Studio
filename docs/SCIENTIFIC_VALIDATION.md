# Scientific validation plan

## Current status

The repository now has automated deterministic neuron regression tests, selected Brian2 reference fixtures, analytical pair/triplet STDP tests, delayed heterogeneous network tests, benchmark metric tests and software exporter smoke tests. These are implementation checks, not an independent scientific reproduction.

## Evidence by subsystem

### Neuron dynamics
- Implemented LIF, AdEx and Izhikevich equations with Euler/RK4 fixed-step integration; the live sandbox uses the shared tested engine and seeded stimulus generation.
- Analytical passive-membrane LIF test and timestep-convergence regression.
- Brian2 2.9.0 subthreshold state comparison for all three models and NEST 3.10.0 passive LIF reference comparison in CI.
- Still needed: spiking-regime trace/raster comparisons, parameter-regime sweeps, dt-halving error curves and broader NEST cross-checks for firing regimes and network traces.

### Synaptic plasticity
- Pair exponential STDP with pre/post traces, chronological ordering and weight bounds.
- Triplet trace rule with slow traces and A3 terms.
- Hand-computed pair and triplet timing-window regression tests.
- Heterogeneous network applies plasticity at delayed pre-arrival and post-spike times.
- Still needed: independent Brian2/NEST STDP curve fixtures, simultaneous-event conventions, nonzero-delay protocol studies and fitted parameter sensitivity.

### Network simulation
- LIF fixed-step network and heterogeneous LIF/AdEx/Izhikevich engine.
- Deterministic all-to-all, ring and seeded probability topology.
- Delay-boundary splitting, raster binning and spike-train summaries.
- Still needed: recurrent benchmark fixtures, large sparse networks, conductance synapses, event-time root finding, stochastic inputs and full reference raster/weight-trace comparison.

### Event filtering\n- 8-neighbour background activity filter with per-sample temporal surfaces and tests for temporal support, sample isolation and bounds.\n- The UI submits bounded canonical CSV event samples; binary AEDAT decoding and full-frame archival are not implemented.\n\n### Datasets and benchmarks
- Tonic 1.6.0 adapters for N-MNIST, IBM DVS Gesture and SHD train/test.
- Canonical event CSV export with SHA-256, split hash, counts, loader version and explicit license declaration.
- Prediction evaluation with accuracy, macro-F1, confusion matrix, stratified bootstrap interval and paired exact McNemar test.
- Still needed: full dataset downloads/acceptance runs, frozen split artifacts, official published baseline reproductions, multi-seed training and class-wise confidence intervals.

### Hardware
- Lava floating-point simulator scaffold executed in CI.
- snnTorch LIF scaffold executed on CPU in CI.
- Portable fixed-point C99 kernel compiled with GCC in CI.
- Still needed: physical Loihi 2 compilation/board execution, Akida/SpiNNaker 2/Speck exporters, MCU board port, I/O/timing/power measurements and vendor SDK version matrix.

### Product infrastructure
- PostgreSQL schema for users, sessions, projects, experiment records and AI quotas.
- scrypt password hashing, HttpOnly session cookies and user-scoped project/experiment queries.
- Still needed: deployed DATABASE_URL, backup/restore drill, email verification, account recovery, MFA, organization roles, sharing, audit export and penetration testing.

### Secure AI
- Authenticated AI endpoint, strict task/prompt/context limits, persistent per-user minute/day quotas, token/output cap and provider timeout setting.
- Still needed: cancellation verification, provider spend reconciliation, abuse monitoring, retention policy and independent security review.

## Required experiment record

Each result should include exact Git commit, dataset/archive SHA-256, split sample-ID hash, license/source, preprocessing, model artifact hash, parameters, random seed, integrator/time step, framework versions, hardware/firmware, raw outputs and uncertainty.

## Status vocabulary

- **Implemented:** code exists with regression tests.
- **Reference-checked:** agrees with a named, version-pinned reference within a stated tolerance.
- **Dataset-validated:** evaluated on a named, versioned holdout with a frozen reproducible protocol.
- **Hardware-measured:** measured on named physical hardware using a documented procedure.
- **Independently reproduced:** a separate operator reproduced the result from the frozen manifest.

Do not promote a subsystem to a stronger status without retaining the evidence.
