# Scientific simulation engine

## Scope and conventions

The first deterministic core provides independently callable LIF, adaptive exponential integrate-and-fire (AdEx), and Izhikevich steps; Euler and classical RK4 integration; pair-based all-to-all exponential STDP; a fixed-step event-driven LIF network with delayed synaptic deliveries; and spike-train summary statistics.

Units are explicit in identifiers: time ms, voltage mV, current pA, resistance MOhm, capacitance pF, conductance nS. No hidden random-number generator or wall-clock dependency is used.

## Numerical methods and limitations

RK4 integrates the continuous subthreshold differential equations over each caller-supplied fixed step. Threshold crossings are detected at the end of a step and reset there; this is not an event-time root solver. Reduce dtMs and run a convergence study for high precision. AdEx exponentials are capped at exponent 50 to avoid overflow; this is a numerical guard, not a biological saturation mechanism. Izhikevich uses the canonical quadratic voltage and recovery equations with threshold/reset.

The LIF current convention is I[pA] * R[MOhm] / 1000 in mV. AdEx uses pA/pF and nS*mV = pA. Izhikevich follows the conventional normalized-current equation; callers must document the current scaling used in each experiment.

## STDP convention

A presynaptic event depresses by A_minus times the decayed postsynaptic trace; a postsynaptic event potentiates by A_plus times the decayed presynaptic trace. Traces decay exponentially with their respective time constants, and weights are clamped to configured bounds. Events must be chronological. Nonzero-delay plasticity requires careful distinction between axonal emission and synaptic arrival; the current network implementation is an initial reference semantics, not a claim of equivalence to Brian2 or NEST.

## Network semantics

The network advances LIF neurons in fixed time steps, queues synaptic current events at emission time plus delay, and delivers queued events during the first step whose end reaches the arrival. Delays are therefore quantized by the integration step. This is a reproducible reference engine, not yet a high-performance sparse event scheduler.

## Regression tests

Run npm test. Tests cover a passive-membrane analytical comparison, threshold/refractory behavior, AdEx and Izhikevich reset behavior, causal/anti-causal STDP sign, clipping, delayed propagation, and spike-train statistics. Passing tests establishes software regression evidence only; it does not establish peer-reviewed simulator equivalence or physical hardware validity.

## Validation still required

- Compare each model against pinned Brian2 reference scripts with identical units, integrator, time step, initial state, and threshold/reset convention.
- Add dt-halving convergence curves and spike-time error bounds.
- Cross-check STDP curves against an independent analytical implementation, including nonzero delays and simultaneous events.
- Compare network raster and weight traces against Brian2 or NEST fixtures.
- Have an independent researcher reproduce versioned experiments from committed parameter manifests and input hashes.

## Benchmark evaluation primitives

The benchmark module currently ingests a strict, unquoted CSV table containing sample_id, actual, predicted, and optional latency_ms. It computes a confusion matrix, accuracy, macro-F1, and mean supplied latency. A seeded percentile bootstrap reports a reproducible accuracy interval; the seed and resample count are returned with the result. Candidate/baseline summaries can be compared when both summaries use the same sample count.

This is an evaluation primitive, not a dataset loader for raw N-MNIST, DVS Gesture, or SHD event files. It does not yet establish official train/validation/test splits, class-balanced bootstrap intervals, paired per-sample baseline significance tests, energy measurement, or dataset licensing/provenance. Never label an uploaded arbitrary prediction CSV as an official benchmark result. Record dataset version, split hash, preprocessing, model configuration, software versions, hardware and random seeds in the experiment manifest before making comparative claims.
