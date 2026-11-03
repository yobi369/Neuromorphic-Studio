# Security and product limits

## Current safeguards

- Express JSON request bodies are capped at 256 KiB.
- The server disables the `X-Powered-By` header.
- Responses include baseline content-type, framing, referrer, permissions and resource-policy headers.
- Billing endpoints return HTTP 503 with `BILLING_NOT_CONFIGURED`; the existing mock handlers are intentionally unreachable.
- The default browser profile is a generic community researcher rather than a fabricated named scientist or paid customer.

## Known gaps — do not deploy as a multi-user production service

1. **Authentication and authorization:** no verified identity/session middleware or per-user authorization.
2. **Persistence and isolation:** project data is in process memory; all callers share the same process-level collection.
3. **AI endpoint:** requires strict prompt/context validation, rate limiting, provider timeout, output limits, abuse monitoring and cost controls before public exposure.
4. **CORS and CSP:** no deployment-specific allowlist or Content Security Policy has been established.
5. **Rate limiting:** no distributed request throttling or abuse protection is implemented.
6. **Secrets:** production secret storage, rotation and access policy remain deployment responsibilities.
7. **Billing:** no payment provider, verified webhook, reconciliation or genuine license service exists.
8. **Auditability:** no durable audit events or tamper-evident experiment history.
9. **Supply chain:** dependency lockfile and automated dependency update policy still need to be added and reviewed.
10. **Hardware access:** no browser-to-device bridge should be considered secure or production-ready without a threat model and device-specific authorization.

## Release gates

Do not enable public user accounts, sensitive research storage, payments, license issuance, or physical hardware control until the relevant gaps above are closed and tested. Keep secrets out of browser bundles and logs. Use synthetic data in demonstrations.
