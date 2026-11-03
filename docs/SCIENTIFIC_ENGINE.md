# Scientific simulation engine

## Scope and conventions

The deterministic core provides independently callable LIF, adaptive exponential integrate-and-fire (AdEx), and Izhikevich steps. The live neuron sandbox now calls these same tested functions rather than maintaining separate equations; it exposes all three models and uses a seeded PRNG for noise and Poisson stimulation. It supports RK4 integration in the live display. The engine also provides Euler and classical RK4 integration; pair-based exponential STDP; a trace-based triplet STDP rule; fixed-step LIF and heterogeneous LIF/AdEx/Izhikevich networks; deterministic topology builders; delayed synaptic events; spike-train statistics; raster binning; event CSV validation; benchmark metrics; and constrained exporter generators.

Time is milliseconds and voltage is mV. LIF/AdEx inputs use pA, LIF resistance uses MOhm, AdEx capacitance pF and conductance nS. Izhikevich uses the canonical normalized model drive in its quadratic equation; its input is not pA. Heterogeneous network connection weights are interpreted in the target neuron's input convention.

## Numerical methods and limitations

RK4 integrates continuous subthreshold equations over fixed caller-supplied steps. Threshold crossings are detected at step end and reset there; this is not event-time root finding. Reduce dt and compare against a reference. AdEx exponentials are capped at exponent 50 to avoid overflow. Izhikevich uses the canonical quadratic voltage and recovery equations with threshold/reset.

The LIF current convention is I[pA] * R[MOhm] / 1000 in mV. AdEx uses pA/pF and nS*mV = pA. Izhikevich uses normalized input drive; do not pass a value measured in pA without an explicit model-specific conversion.

## STDP conventions

The STDP lab manual pair, correlated-train and conditioning interactions now call the same trace engine rather than applying a separate hand-coded weight shortcut. Pair STDP maintains exponentially decaying pre/post traces. A pre-arrival event depresses by A_minus times the decayed post trace; a post spike potentiates by A_plus times the decayed pre trace. Weights are clamped to configured bounds.

Triplet STDP adds slow pre and post traces. The pre event includes the A3-minus triplet term and the post event includes the A3-plus term. Amplitudes and time constants must be fitted or declared; they are not universal constants. Events must be chronological. Network plasticity updates at presynaptic arrival, and post traces update at postsynaptic spike time.

## Network semantics

The original EventDrivenNetwork is a fixed-step LIF network. The HeterogeneousNetwork supports LIF, AdEx and Izhikevich neurons, deterministic all-to-all/ring/probability topology builders, and delay-boundary splitting. The live network view now runs this engine on a fixed 1 ms accumulator, uses seeded input/topology generation, schedules delayed synaptic events, and assigns inhibitory sign per source neuron for its reservoir/ring presets (Dale-consistent outgoing sign). integration intervals are shortened to land on the next queued synaptic arrival. The arriving event is applied at the start of the next integration segment as a current pulse held for that segment (up to the next event boundary or maximum step); exponential synaptic conductance kernels are not implemented. It is still a fixed-step numerical integrator, not an asynchronous continuous-time event solver. Simultaneous events are processed in stable sequence order.

## Reference comparison

A pinned Brian2 2.9.0 workflow generates one-step state fixtures for LIF, AdEx and Izhikevich with matching RK4 step sizes and compares the TypeScript engine against those fixtures. The CI workflow pins NumPy below 2 due Brian2 compatibility. This checks selected subthreshold trajectories; it is not a complete validation of all firing regimes, synaptic dynamics or network behavior. A separate NEST 3.10.0 workflow compares passive LIF membrane decay; broader NEST neuron/network comparisons and independent external reproduction remain open. A separate Brian2 event-driven pair-STDP fixture checks causal and anti-causal timing windows.

## Benchmark and dataset adapters

The benchmark module computes confusion matrix, accuracy, macro-F1, supplied mean latency, class-stratified bootstrap intervals and paired exact McNemar comparisons. Candidate/baseline sample IDs and labels must match exactly.

The optional Tonic 1.6.0 adapter exports N-MNIST, IBM DVS Gesture and SHD train/test splits to canonical event CSV with source, license declaration, loader version, preprocessing, SHA-256 and split-ID hash. The API can verify canonical CSV bytes and split IDs for smaller uploads. The dataset adapter does not itself train a model or establish a published leaderboard result.

## Hardware export boundary

- Lava export is a generated process graph executed against Lava's floating-point simulator in CI. It is not a physical Loihi 2 build.
- snnTorch export is a generated LIF module executed on CPU with pinned PyTorch/snnTorch. It does not transfer learned weights from the Studio model.
- Embedded export is a portable fixed-point C99 LIF kernel compiled with GCC. It does not include a board HAL, full synaptic matrix, sensor I/O or firmware image.
- Akida, SpiNNaker 2 and Speck have no verified exporter.

## Regression and validation

Run npm test, npm run typecheck and npm run build. Separate workflows run Brian2 reference comparison, Lava/snnTorch/C exporter smoke tests and Tonic dataset-adapter import checks. Passing software checks does not establish physical hardware validity or independent scientific reproduction.
