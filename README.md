# Neuromorphic Studio

Neuromorphic Studio is an early-stage research workbench for spiking neural networks, event-based sensing, neuron dynamics, synaptic plasticity, reproducible evaluation and deployment scaffolds.

> **Status: research prototype.** The code now includes deterministic neuron models, STDP, heterogeneous network primitives, dataset adapters, benchmark statistics, reference checks and constrained exporter templates. This is not yet a scientifically validated instrument or a production neuromorphic hardware compiler.

## Implemented research core

- LIF, AdEx and Izhikevich single-neuron models with Euler and RK4 integration.
- Pair-based exponential STDP and a trace-based triplet STDP rule.
- Fixed-step LIF network and heterogeneous LIF/AdEx/Izhikevich populations, deterministic topology builders, delayed synaptic events and spike-raster summaries.
- Strict event CSV parser and Tonic adapters for N-MNIST, IBM DVS Gesture and SHD.
- Confusion matrix, accuracy, macro-F1, class-stratified bootstrap intervals and paired exact McNemar comparisons.
- Brian2 reference fixture generation and automated comparisons for all three neuron equations.
- Lava simulation scaffold, snnTorch/PyTorch module scaffold and portable fixed-point C99 kernel. These are software exports, not certified board firmware.

See [Scientific engine](docs/SCIENTIFIC_ENGINE.md), [Reproducible experiments](docs/REPRODUCIBLE_EXPERIMENTS.md) and [Scientific validation](docs/SCIENTIFIC_VALIDATION.md).

## Run locally

Requirements: Node.js 22+, npm and PostgreSQL.

~~~bash
npm install
cp .env.example .env
# Set DATABASE_URL to a PostgreSQL database before signing in.
# Set GEMINI_API_KEY only if the optional AI assistant is needed.
npm run dev
~~~

The app starts on port 3000. Health: /api/health. Without DATABASE_URL, account and project APIs fail closed and the workspace cannot be used.

## Quality checks

~~~bash
npm test
npm run typecheck
npm run build
~~~

GitHub Actions also runs:
- Brian2 2.9.0 reference comparisons using NumPy below 2.
- Lava 0.10.0 simulation, snnTorch 1.0.0 CPU execution and GCC C99 compilation.
- Tonic 1.6.0 dataset adapter import checks.
- CodeQL static analysis.

A green build or simulator test is not proof of independent scientific reproduction or physical board compatibility.

## Configuration

| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection for users, sessions, private projects and experiment records. Required for application use. |
| PGSSLMODE | Set to require when the PostgreSQL provider requires TLS. |
| GEMINI_API_KEY | Optional server-side AI integration. Never use a VITE_ prefix. |
| PORT | HTTP port, default 3000. |

## Security and product boundaries

- Registration/login uses scrypt password hashes and HttpOnly SameSite session cookies. Project and experiment queries are scoped to the authenticated user.
- AI requests require a valid session and use database-backed quotas (8/minute, 60/day), prompt/context size limits, output limits and provider timeout configuration.
- Account recovery, email verification, MFA, organization roles, audit log export and independent penetration testing remain incomplete.
- Billing, checkout, trial activation and license verification are disabled.
- Hardware bridge reports no connected devices unless a real adapter is integrated. No telemetry is fabricated.
- Project and experiment data require PostgreSQL; set backups, retention, TLS and restore procedures at the hosting provider.
- AI responses are advisory. Do not treat generated code, scientific explanations or architecture as validated evidence.

See [Security and product limits](docs/SECURITY_AND_PRODUCT_LIMITS.md) and [Architecture](docs/ARCHITECTURE.md).

## Official dataset adapters

Install Tonic 1.6.0 in an isolated Python environment, then use validation/official_datasets.py to export N-MNIST, DVS Gesture or SHD train/test splits. Review the upstream license and provide it explicitly to the exporter. The script records canonical CSV and split hashes; it does not download full datasets in CI.

## Remaining independent evidence

- NEST cross-checks and broader Brian2 network/STDP reference traces.
- External researcher reproduction from a frozen manifest.
- Full official dataset holdout experiments, multiple seeds and baseline result archives.
- Physical Loihi 2 / Akida / SpiNNaker 2 / Speck / MCU board builds, timing, power and I/O validation.
- Deployment-specific database backup/restore drill, security review and account recovery.

No scientific or hardware readiness claim should be promoted without retaining the evidence.

## License

No repository license has been established. Do not assume the code is open source or reusable under an unverified license.
