# Architecture and system boundaries

## Current shape

- **Client:** React 19, TypeScript, Vite and Tailwind CSS.
- **Server:** Express, TypeScript and esbuild.
- **Persistence:** PostgreSQL via node-postgres. Startup creates users, sessions, projects, experiments and AI quota tables.
- **Authentication:** scrypt password hashes, random opaque session tokens stored only as SHA-256 digests, HttpOnly SameSite=Strict cookies and origin checks for state-changing requests.
- **Research engine:** pure TypeScript model, plasticity, network, dataset validation, benchmark and exporter modules.
- **Optional AI:** server-side Google GenAI integration, authenticated requests and database-backed quotas.

## Request and data boundaries

1. Express parses bounded JSON and adds baseline browser security headers.
2. Account, project and experiment routes are registered before legacy mock handlers; they fail closed if DATABASE_URL is absent.
3. Every project and experiment query is scoped to the authenticated user ID. Experiment records reference only projects owned by that user.
4. Passwords are scrypt-hashed with random salts. Raw session tokens are not persisted; the server stores token digests and expiry timestamps.
5. AI routes require an authenticated session, validate task type/prompt/context sizes, enforce database-backed per-user quotas and cap output.
6. Billing and hardware transport APIs return explicit unavailable responses rather than fabricated invoices or device telemetry.

## Persistence schema

- users: unique email, password hash, display name.
- sessions: token digest, user ID, expiry.
- projects: owner ID, name, JSONB project snapshot and timestamps.
- experiments: owner ID, optional owned project ID, manifest, result and creation timestamp.
- ai_usage: per-user minute/day request windows.

Projects and experiments are durable only when backed by a correctly configured and backed-up PostgreSQL service. The app does not provision a database, create provider backups or perform restore drills automatically.

## Scientific engine boundary

Numerical equations live in deterministic modules with explicit unit conventions. LIF and AdEx use pA-based input conventions; Izhikevich uses its canonical normalized input drive. Heterogeneous connections use target-model input units, so the same numeric weight must not be interpreted as pA when targeting an Izhikevich neuron. UI code should call the engine rather than reimplement equations.

## Export boundary

- Lava: generated process-graph scaffold and Lava CPU simulator test; not a physical Loihi 2 compiler certification.
- snnTorch: generated LIF PyTorch module executed on CPU; source model weights are not transferred.
- Embedded C: portable fixed-point LIF kernel compiled with GCC; board-specific HAL, memory map, sensor I/O and timing remain unimplemented.
- Akida, SpiNNaker 2 and Speck: no exporter or device runtime.

## Remaining production architecture

- Account recovery, email verification, MFA, organization roles and audit export.
- Object storage for datasets, checkpoints, traces and reports.
- Background workers for long simulations and benchmark runs.
- Database migrations with versioning, automated backups and restore drills.
- Observability, security review, threat model, CSP and deployment-specific CORS policy.
- Board-specific SDK integration and physical validation.
