# Architecture and system boundaries

## Current shape

- **Client:** React 19, TypeScript, Vite and Tailwind CSS.
- **Server:** Express application started through `tsx` in development and bundled with esbuild for production.
- **AI integration:** optional server-side Google GenAI client.
- **State:** React component state and browser local storage for the current user profile; the server currently holds project and mock-domain state in process memory.

## Request flow

1. The browser loads the Vite-built application.
2. The Express server exposes `/api/health`, project endpoints and the optional AI endpoint.
3. The AI endpoint reads `GEMINI_API_KEY` from the server environment.
4. The project endpoints currently use in-memory state and are not durable or multi-tenant.

## Explicit non-goals of the current prototype

The current application does not provide production-grade identity, tenant boundaries, persistent experiment storage, collaborative editing, immutable experiment provenance, payment processing, license enforcement, hardware attestation or a verified deployment pipeline for physical neuromorphic chips.

## Target architecture before production

- Identity provider with server-verified sessions and MFA for privileged roles.
- Organization and project authorization enforced on every API request.
- PostgreSQL persistence with migrations, backups, retention and restore drills.
- Immutable experiment manifests with dataset hashes, code revision, environment, seed and parameter snapshots.
- Background workers for long-running simulations and benchmark jobs.
- Versioned simulation engine separated from presentation components.
- Artifact storage for datasets, traces, checkpoints and benchmark reports.
- Observability: structured logs, request IDs, metrics, error reporting and audit events.
- Provider-backed billing only after verified webhooks, idempotency, reconciliation and entitlement tests exist.

## Numerical-engine boundary

Numerical model implementations should live in pure, deterministic modules with explicit units and validated parameter objects. UI components should call those modules rather than embed scientific equations in rendering code. Every model change should include analytical or reference tests and a documented numerical method.

## Deployment

The current build creates static client assets and a bundled Express server. A production host must run `npm run build` followed by `npm start`, provide the required environment variables, terminate TLS, configure health checks and persist any future database/artifact services independently of the application process.
