# Neuromorphic Studio

Neuromorphic Studio is an early-stage research and engineering workbench for exploring spiking neural networks (SNNs), event-based sensing, neuron dynamics, synaptic plasticity and edge deployment trade-offs.

> **Project status: research prototype.** The interface contains experimental simulators, illustrative presets and hardware-oriented planning tools. It is not yet a validated scientific instrument, a hardware compiler, a certified device interface, or a production SaaS product. Treat every output as exploratory until independently validated against reference implementations and physical measurements.

## What is in the repository

The current React + TypeScript + Vite application is organized around these work areas:

- **DVS encoder** — event-stream representation experiments.
- **Neuron sandbox** — LIF, AdEx and Izhikevich model exploration.
- **SNN network** — network topology and activity visualization.
- **STDP lab** — spike-timing-dependent plasticity experiments.
- **Hardware profiler** — preliminary hardware/energy trade-off exploration.
- **Benchmark evaluator** — dataset and model evaluation workflows.
- **ROI calculator** — exploratory deployment economics.
- **Robotics control** — control-loop demonstrations.
- **AI architect** — optional Gemini-assisted design support when configured.

The exact scientific scope and validation status of each work area is tracked in [docs/SCIENTIFIC_VALIDATION.md](docs/SCIENTIFIC_VALIDATION.md).

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
cp .env.example .env
# Add GEMINI_API_KEY only if you want to use the optional AI architect.
npm run dev
```

The development server starts on port 3000. The API health check is available at `/api/health`.

## Quality checks

```bash
npm run typecheck
npm run build
npm start
```

GitHub Actions runs type-checking and a production build on pushes and pull requests. These checks establish build integrity, not scientific correctness.

## Configuration

| Variable | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | No | Enables the optional server-side AI architecture assistant. Keep it server-side; never expose it through a `VITE_*` variable. |
| `PORT` | No | HTTP port. Defaults to 3000. |

See [.env.example](.env.example). Do not commit secrets.

## Important product and security boundaries

- Billing, checkout, trial activation and license verification are **disabled**. The previous implementation generated fabricated invoices and accepted arbitrary license strings; it must not be used to charge users or represent paid entitlements.
- Project storage is currently in process memory. Data can be lost on restart and is not isolated between authenticated users. Do not store confidential research or personal data.
- There is no production authentication, organization isolation, durable database, audit log or role-based authorization yet.
- Hardware names and compatibility references are not evidence of a tested hardware connection. Physical device support must be demonstrated with device-specific integration tests.
- AI output is advisory and may be incorrect. Do not treat generated architecture, code or scientific claims as verified results.

See [docs/SECURITY_AND_PRODUCT_LIMITS.md](docs/SECURITY_AND_PRODUCT_LIMITS.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Scientific reproducibility

Every experiment intended for publication or a competition should record:
1. model equations and parameter units;
2. integration method, timestep and numerical tolerances;
3. random seeds and stochastic assumptions;
4. dataset provenance, preprocessing and train/validation/test splits;
5. baseline/reference implementation and version;
6. metrics, confidence intervals and raw outputs;
7. hardware, firmware, compiler and measurement setup where applicable.

A chart or successful UI run is not by itself evidence of model validity. Use the validation checklist in [docs/SCIENTIFIC_VALIDATION.md](docs/SCIENTIFIC_VALIDATION.md).

## Contributing

Please include a reproducible test or reference comparison for changes to numerical models, event encoders, plasticity rules, benchmarks or energy estimates. Avoid presenting simulated estimates as measured hardware results.

## License

No repository license has been established yet. Until an explicit license is added, all rights are reserved by the copyright holder; do not assume the code is open source or reuse it under an unverified license.
