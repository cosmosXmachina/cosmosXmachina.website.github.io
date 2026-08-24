# cosmosXmachina Creation Lab

Status: browser-only implementation and complete local release rehearsal passed; clean commit-scoped release verification remains before production approval.

This is the canonical portfolio architecture. Operational setup is in `installation.md`, detailed system architecture in `cosmos_interface.md`, and repository rules in `AGENTS.md`.

## Direction

The Creation Lab presents four inspectable professional systems built by Davide Deon/Vash around Orion Works, a clearly fictional Veneto SME. Every interface is a self-directed demonstration using synthetic data, not a client result.

- Keep `/portfolio/` and `/portfolio/<demo-slug>/` bilingual through `?lang=it|en`.
- Open demos directly into usable interfaces with independent visual identities.
- Expose problem, workflow, architecture, decisions, failure modes, tests and relevant service.
- Preserve the expiring, reviewable `sessionStorage` handoff to the homepage contact form.
- Keep the homepage and its Three.js bundle isolated from React/ECharts demo costs.

## Active Scope

Only ranks **1, 2, 3 and 6** are public. Demos 4, 5, 7, 8, 9 and 10 remain deferred and absent from Vite inputs, public cards, active route allowlists and browser tests.

| Rank | Demo | Browser implementation |
| ---: | --- | --- |
| 1 | Document & Email Operations | React/TypeScript workstation; deterministic classification, typed extraction, validation, evidence and human review in memory |
| 2 | Orion Operations Hub | React workspace; transactional state machine, roles, replay and versioned IndexedDB persistence |
| 3 | Secure Knowledge Assistant | React research interface; permission-first demonstration filter, native inverted index, citations, evaluation and abstention |
| 6 | KPI & Reporting Studio | React/ECharts interface; deterministic Web Worker calculations, local narrative, accessible table and CSV export |

The retained roadmap concepts are E-commerce Catalog Intelligence, Lead-to-Appointment System, Integration Reliability Control Room, Architecture Rescue Lab, Workflow Audit & ROI Architect and Browser Opportunity Scout.

## Browser Runtime

Version 1 makes no real AI calls, requires no AI key and makes zero runtime requests to `/api/lab/*`.

The shared non-visual runtime in `portfolio/shared/` provides:

- versioned Orion Works fixtures and a provider-neutral simulated contract;
- bounded input/schema validation and hostile-input rejection;
- synthetic role-bound 30-minute sessions and 25 successful actions;
- deterministic action IDs, idempotency replay, transactional rollback and reset;
- evidence, traces, warnings and simulated latency/cancellation;
- browser-local retrieval and persistence abstractions.

Provider-neutral contract:

```text
execute({ task, schema, context, input })
  -> { output, evidence, usage, trace, warnings }
```

Normalized action envelope:

```text
{ ok, mode, demo, action, session, role, result, trace, warnings, quota }
```

OpenAI, Google Gemini, Anthropic Claude, xAI Grok and OpenRouter choices are presentation targets only; the deterministic fixture provider records the selection but contacts none of them. Dormant server adapters remain mock-tested compatibility code and are not imported by public demo bundles.

## State And Security Boundaries

- Document, knowledge and KPI demo state is browser-memory state reset on reload or with the visible reset control.
- Operations Hub stores a bounded schema-versioned synthetic order record in IndexedDB and visibly restores fixtures if storage is unavailable, stale or corrupt.
- `cosmos-lab-provider` and the contact handoff retain their documented `sessionStorage` behavior.
- Browser role filtering in Secure Knowledge Assistant demonstrates retrieval architecture only. Real authorization must filter protected data on a trusted server before it reaches an untrusted client.
- Arbitrary uploads, URLs, scraping, external submission and real personal/business data are excluded.

## Preserved Server Infrastructure

Apache still serves only the verified `dist/` tree and proxies `/api/*` to the loopback Node service. Node remains required for Gmail contact delivery and aggregate analytics. Existing Node Lab routes and the private Python deterministic service remain dormant compatibility infrastructure so the established Apache/systemd/SFTP/rollback topology does not require privileged reconfiguration.

The production release must continue to force `AI_MODE=fixture` and `AI_LIVE_ENABLED=false`. No public demo waits for Node/Python health or substitutes a hidden server fallback.

## Build And Deployment

- `npm run build` builds the homepage, Portfolio and four demos into `dist/`, enforces bundle/distribution budgets, scans for secrets/provider endpoints and rejects `/api/lab` references in published code.
- Playwright starts Vite without Node or Python, proving the demos work in a static-only topology at 360, 768, 1024 and 1440 pixels.
- `npm run serve:local` intentionally starts the preserved full topology for contact, analytics and compatibility testing.
- `npm run release:build` retains Node/Python unit and packaged smoke gates, then creates the verified archive, checksum and `.ready` marker locally.
- Production remains Apache-native and uses the existing SFTP marker activation and rollback flow. Never serve the repository root.
- Building a release candidate does not authorize upload or production activation.

## Verification

- Vitest covers fixture determinism, validation, quota, expiry, replay, rollback, cancellation, retrieval ranking, role filtering, citations, KPI formulas and storage schemas.
- `node:test` and pytest retain contact, analytics, deployment and dormant compatibility coverage.
- Playwright covers both languages, happy/failure paths, reset, IndexedDB persistence/recovery, contact handoff, keyboard/responsive behavior and reduced motion.
- Browser tests assert zero fetch/XHR traffic during active workflows and zero Lab/provider requests.
- The build rejects private files, secret-like values, live-provider endpoints, oversized assets, `/api/lab` coupling and a public distribution over 8 MiB.

The 24 August 2026 release rehearsal passed 17 Vitest checks, 49 Node checks with one expected Windows-only skip, 7 pytest checks and 84 Playwright cases across 360, 768, 1024 and 1440 pixel viewports. The public build measured 3.76 MiB and the verified local rehearsal archive measured 3.17 MiB. Packaged Node/FastAPI compatibility smoke tests also passed; no production upload or activation was performed.

## Locked Decisions

- Public demos are deterministic browser systems, not cosmetic screenshots and not server-backed applications.
- The existing homepage, URLs, contact SMTP, aggregate analytics and production infrastructure remain intact.
- No new framework, WASM database, PDF parser, live AI SDK, external backend or tracking service is introduced.
- Capability is demonstrated through working synthetic systems and explicit reasoning, never invented clients or results.
