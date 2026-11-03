# Security and product limits

## Implemented safeguards

- Express JSON body limit: 256 KiB.
- Baseline security headers and disabled X-Powered-By.
- Billing/licensing endpoints fail closed with HTTP 503.
- PostgreSQL-backed registration/login with scrypt password hashes and random session tokens stored as SHA-256 digests.
- HttpOnly, SameSite=Strict session cookies; Secure flag in production; origin checks for state-changing requests.
- Per-user project and experiment access enforced in SQL predicates.
- Dataset validation and benchmark evaluation APIs require authentication and enforce persistent per-user quotas of 5/minute and 30/day.
- Database-backed AI quotas: 4 requests/minute and 20/day per account.
- AI prompt limit 6,000 characters, context JSON limit 4 KiB, output cap 4,096 tokens / 24,000 returned characters, and provider HTTP timeout configuration.
- Hardware endpoints return unavailable rather than presenting mock devices or telemetry.
- Benchmark API accepts supplied prediction artifacts and records declared provenance; dataset hashes can be checked against canonical event CSV bytes.

## Required deployment configuration

- Configure DATABASE_URL to a private PostgreSQL endpoint with TLS where required.
- Set PGSSLMODE=require only when appropriate for the provider.
- Store GEMINI_API_KEY in the host's secret manager, never in VITE_ variables.
- Restrict network access to PostgreSQL, configure provider backups and retention, and test restoration before storing important work.
- Terminate TLS at the trusted host and validate forwarded-header configuration.

## Remaining security gaps

1. **Identity lifecycle:** email verification, password reset, MFA, session revocation UI, suspicious-login detection and account deletion are not implemented.
2. **Authorization roles:** account-level isolation exists; organization/workspace roles, sharing and delegated access are not implemented.
3. **Abuse controls:** authentication and AI quotas use database state for per-user windows; broader IP/network abuse controls, provider budget enforcement and anomaly monitoring need deployment review.
4. **AI cancellation:** provider timeout is configured, but request cancellation and provider-side spend reconciliation need validation against the installed SDK/runtime.
5. **Browser policy:** a deployment-specific CSP and explicit CORS allowlist have not been configured.
6. **Data lifecycle:** backup/restore drills, retention, export/delete workflows, audit log and immutable provenance storage are not complete.
7. **Supply chain:** a committed npm lockfile, pinned GitHub Action SHAs and automated dependency review remain release gates.
8. **Hardware security:** no device control channel is active; any future bridge needs device identity, authorization, replay protection and a threat model.

## Release gates

Do not describe the service as production-ready until database backups have been restored in a drill, account lifecycle/security review is complete, the lockfile and action pinning are complete, and the relevant scientific/hardware validation evidence exists. Billing and physical hardware control remain disabled.
\n## Explicitly unavailable capabilities\n\n- Binary AEDAT decoding and complete raw sensor capture archival.
- Execution of user-supplied microcode, C firmware or Lava source from the browser.
- Hardware cycle, energy, SRAM/flash, device telemetry or certified deployment claims.
- Billing, checkout, subscription management and license verification.
