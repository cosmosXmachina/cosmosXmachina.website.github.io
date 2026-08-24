# cosmosXmachina Creation Lab — Zero-Backend Decision Summary

**Decision date:** 24 August 2026
**Status:** Implemented and locally verified; clean commit-scoped release and production approval remain pending
**Target:** Keep the live production website on the existing machine and transform the active Creation Lab demos so all demo execution happens in the visitor's browser.

## 1. Context

The approved Creation Lab currently publishes four active demonstrations:

1. AI Document & Email Operations
2. Orion Operations Hub
3. Secure Knowledge Assistant
6. KPI & Reporting Studio

The original production topology was:

```text
browser
  -> Apache
       -> static site, portfolio and demo bundles
       -> /api/* -> Node gateway
                       -> Python/FastAPI pipelines
```

Version 1 is already synthetic and deterministic. It makes no real AI calls and requires no AI API key. The demos exist to demonstrate workflows, validation, retrieval, failure handling, traceability and engineering reasoning using synthetic Orion Works data.

The production machine is a low-tier VPS. The new constraint is that the public demos must not depend on Node/FastAPI execution capacity on that machine.

## 2. Alternatives considered

### A. GitHub Pages

Pages could host compiled frontend assets but not the current request-time Node/FastAPI services. Moving the Lab there would also complicate the existing canonical `/portfolio/...` setup.

**Rejected.**

### B. External backend

Keeping static assets on the current VPS while hosting Node/Python elsewhere would preserve a full remote backend.

**Rejected. No other machine or external runtime will be introduced.**

### C. Browser-only Creation Lab on the existing site

Move deterministic demo execution into the browser while continuing to serve the website and compiled demo assets from the current Apache production setup.

**Selected.**

## 3. Precise meaning of "zero backend"

The Creation Lab becomes a **zero-backend demo system**, but this does not mean deleting the production backend.

> The four active demos must no longer require server-side Lab execution. Existing working production systems must remain intact.

The objective is to change the demos, not rebuild the server.

There must be:

- no GitHub Pages deployment;
- no new server or cloud runtime;
- no DNS change;
- no Apache/bootstrap reconfiguration requiring root;
- no systemd change requiring root;
- no request for Vash's friend/server administrator to do anything;
- no removal of working Node/Python functionality merely because the Lab stops using it.

## 4. Target topology

```text
visitor browser
  |
  | HTTPS
  v
existing Apache on cosmos-x-machina.it
  |
  +-- homepage
  +-- /portfolio/
  +-- /portfolio/<demo>/
  +-- compiled JS/CSS/assets
  |
  +-- existing /api/* infrastructure remains available
      for production features that already use it

Creation Lab execution:
  browser only
  +-- deterministic fixture provider
  +-- state machines
  +-- validation
  +-- synthetic sessions/quotas
  +-- idempotency/replay simulation
  +-- retrieval
  +-- deterministic synthetic document processing
  +-- persistence where appropriate
  +-- traces/evidence/warnings
```

The active demos must make **zero runtime requests to `/api/lab/*`** and zero requests to real AI providers.

Existing non-Lab endpoints used by the rest of the website are outside this migration and must keep working.

## 5. Principles to preserve

Keep:

- deterministic and reproducible behavior;
- synthetic Orion Works data;
- clear disclosure that these are demonstrations, not client results;
- the provider-neutral AI-style contract;
- schema/input validation;
- bounded inputs;
- workflow/state validation;
- visible evidence, traces and warnings;
- deterministic replay/idempotency semantics where the demo is meant to show them;
- human-review flows;
- resettable demo state;
- bilingual Italian/English behavior;
- accessibility and responsive behavior;
- testable failure cases;
- existing contact-form summary transfer through `sessionStorage`;
- independent visual identities for the four demos;
- current public URLs and portfolio structure.

The browser-only implementation must not falsely present a client-side mechanism as a real security boundary.

## 6. Per-demo migration direction

### Demo 1 — AI Document & Email Operations

Move deterministic classification, extraction, validation and workflow logic from FastAPI/Pydantic into a browser-side TypeScript engine. Version 1 operates on the approved bundled synthetic fixtures and does not introduce a general-purpose PDF parser.

```text
synthetic/sample document
  -> versioned fixture loading
  -> browser-side classification
  -> extraction
  -> schema validation
  -> workflow decision
  -> human review
  -> evidence + trace + warnings
```

Preserve the provider-neutral contract concept:

```text
execute({ task, schema, context, input })
  -> { output, evidence, usage, trace, warnings }
```

No live AI provider and no `/api/lab` request.

### Demo 2 — Orion Operations Hub

Move demo state from Node/Fastify + SQLite into browser state.

Preferred storage:

- in-memory state for transient transactions;
- IndexedDB for durable browser-local state where useful;
- `sessionStorage` for short-lived cross-page transfer already used by the site.

Preserve meaningful operations, valid/invalid state transitions, idempotent replay, rollback, deterministic IDs and reset.

### Demo 3 — Secure Knowledge Assistant

Move retrieval from SQLite FTS5/server execution into the browser using the smallest robust deterministic approach.

Prefer a lightweight TypeScript retrieval/indexing strategy unless the existing repository already justifies browser SQLite/WASM without breaking the bundle budget.

Preserve:

- deterministic retrieval;
- citations/evidence;
- role-aware filtering;
- evaluation fixtures;
- injection/adversarial cases;
- refusal/warning paths.

Critical disclosure:

> Browser-side role restrictions demonstrate permission-aware retrieval architecture, but they are not a genuine authorization/security boundary because all shipped client code and synthetic data are inspectable.

### Demo 6 — KPI & Reporting Studio

This demo is already designed for browser-side deterministic processing with React, ECharts and Web Workers.

Keep it browser-side and change only what is required for shared runtime consistency or removal of accidental Lab API coupling.

## 7. Shared browser runtime

Create or consolidate a small non-visual shared Lab runtime instead of duplicating backend emulation in each demo.

It may provide:

- versioned fixtures;
- deterministic fixture provider;
- schema/input validation;
- synthetic 30-minute sessions;
- 25-action quota semantics;
- deterministic action/record IDs;
- idempotency-key replay;
- transactional copy/apply/commit behavior;
- reset;
- trace events;
- warnings;
- redaction helpers;
- deterministic clock/seed helpers for tests;
- browser persistence abstraction.

The existing result envelope can remain useful internally:

```text
{
  ok,
  mode,
  demo,
  action,
  session,
  result,
  trace,
  warnings,
  quota
}
```

Do not create a shared visual design system. Each demo keeps its independent product identity.

## 8. Network boundary

For active demo execution in production:

**Forbidden:**

- `/api/lab/session`;
- `/api/lab/:demo/:action`;
- `/api/lab/:demo/reset`;
- real OpenAI/Anthropic/Gemini/xAI/OpenRouter calls;
- arbitrary URL fetching;
- scraping;
- external data submission.

Automated browser tests must prove this.

The site's already-working non-Lab behavior is not part of this prohibition.

## 9. Existing production systems to preserve

Do not remove or disable working infrastructure merely because the Lab becomes browser-executed.

Preserve:

- Apache and TLS/Certbot behavior;
- canonical document root/release symlink structure;
- production `.env`;
- Node systemd unit;
- Python systemd unit;
- contact/Gmail SMTP behavior;
- aggregate analytics;
- cron release activation;
- SFTP incoming/status directories;
- checksum/manifest verification;
- `.ready` activation convention;
- rollback mechanism;
- release retention;
- health-check machinery unless a narrow code compatibility update is strictly necessary and requires no privilege change.

Prefer minimal, additive changes.

## 10. Deployment constraint

Use only the existing routine release path:

1. implement locally;
2. keep the tracked worktree compatible with clean-release rules;
3. run all repository test/build gates;
4. run `npm run release:build`;
5. prepare the normal archive, SHA-256 and `.ready` artifacts locally;
6. **STOP**;
7. show Vash the release candidate, test results, changes, risks and rollback information;
8. obtain one explicit final approval;
9. only then use the already-authorized SFTP uploader;
10. verify `STATUS_DIR/active.json` and perform live smoke tests.

No production upload or activation trigger is allowed before final approval.

## 11. Documentation consequence

The canonical documentation currently describes the old Lab backend dependency. After implementation Codex must update relevant tracked documentation, at minimum reviewing:

- `creation_lab_plan.md`;
- `installation.md`;
- `cosmos_interface.md` if present/relevant;
- `README.md`;
- `AGENTS.md` only if repository rules require it.

Documentation must clearly distinguish:

- active Creation Lab demos: browser-only;
- server infrastructure: preserved;
- Node/Python services: retained for existing working production responsibilities/compatibility, not removed by this migration.

## 12. Definition of done

The change is complete when:

- all four active demos work fully from the static production build;
- demos 1, 2 and 3 no longer need Lab backend execution;
- demo 6 remains browser-side;
- workflows remain substantive and deterministic rather than cosmetic;
- demo interaction makes no `/api/lab/*` calls;
- demo interaction makes no external AI calls;
- homepage/contact/analytics behavior is not regressed;
- bilingual behavior works;
- reset, persistence and failure paths work;
- accessibility/responsive gates pass;
- release size and private-file/security gates pass;
- `npm run release:build` passes;
- a deployable release candidate is prepared;
- production remains untouched until Vash gives explicit approval;
- after approval, deployment uses the existing SFTP release flow;
- activation and live smoke tests succeed;
- rollback remains available.

## 13. Final conclusion

The selected architecture is **Version 1A: a zero-backend Creation Lab running entirely in the browser while being served from the existing cosmos-x-machina.it production machine**.

The website does not move to GitHub Pages. No new machine is introduced. The current production infrastructure is not dismantled.

The four active demonstrations have been migrated from server-dependent synthetic workflows to deterministic browser implementations while preserving their architectural depth and the existing deployment system.

Production deployment is a separate gated action requiring Vash's explicit final approval.

## 14. Implementation record

The selected architecture is now implemented in the working tree:

- `portfolio/shared/browser-runtime.js` owns bounded synthetic sessions, quota, replay, validation and atomic action dispatch;
- `portfolio/shared/fixture-ai.js` derives deterministic browser results from versioned Orion Works fixtures;
- `portfolio/shared/knowledge-index.js` provides the native permission-filtered inverted index;
- `portfolio/shared/operations-store.js` provides versioned IndexedDB persistence and recovery for Operations Hub;
- the four published demos use this runtime and make no Lab API or AI-provider requests;
- Node and FastAPI Lab routes remain dormant compatibility code, while contact email and aggregate analytics remain server-backed;
- static-only Playwright coverage runs with both Lab services unavailable.

No PDF.js, browser SQLite/WASM, live AI SDK, database, or additional runtime dependency was introduced. Production has not been uploaded or modified; release activation still requires a separate explicit approval after all local gates pass.

The complete local rehearsal passed 17 frontend tests, 49 Node tests with one expected Windows skip, 7 Python tests and 84 static-only Chromium cases. It produced a 3.76 MiB `dist/` and a verified 3.17 MiB local archive, passed the secret/private-file gates and completed the packaged compatibility smoke. The rehearsal artifact is intentionally marked dirty and is not authorized for upload; the final clean artifact will be generated from the committed release SHA.
