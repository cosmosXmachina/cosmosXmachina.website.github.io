# Codex Implementation Plan — Browser-Only Creation Lab Migration

**Status:** Implemented and fully rehearsed locally; clean commit-scoped release verification, commit and push remain pending. Production deployment is not authorized by this status.

## Implemented outcome

- The four published demos execute through a shared deterministic browser runtime and make zero `/api/lab/*` calls.
- Demo 01 uses approved synthetic document fixtures and browser validation; no general-purpose PDF parser was added.
- Demo 02 persists its versioned synthetic state in IndexedDB with reset and corruption recovery.
- Demo 03 uses a compact native inverted index with permission filtering, citations and abstention.
- Demo 06 keeps Worker-based calculations and derives narratives locally from computed metrics.
- Node/FastAPI Lab routes remain dormant compatibility code; contact email and aggregate analytics remain server-backed.
- Browser tests run against the static Vite site with Node and Python Lab services intentionally unavailable.
- No PDF.js, SQLite/WASM, new frontend framework, live AI SDK or new production dependency was introduced.

The 24 August 2026 rehearsal passed 17 Vitest checks, 49 Node checks with one expected Windows skip, 7 pytest checks, the complete 84-case static-only Playwright matrix, the public build, release verification, secret scans and packaged Node/FastAPI smoke. `dist/` measured 3.76 MiB and the local rehearsal archive measured 3.17 MiB. No SFTP connection, production upload, activation marker or server mutation occurred.

## Mission

Redesign and implement the current cosmosXmachina Creation Lab so that all four active public demos run entirely in the visitor's browser while the live website remains on the existing production machine.

This is a migration of the **Creation Lab execution architecture**, not a server migration.

The final result must be deployable through the repository's existing non-privileged SFTP release mechanism. Do not require the server administrator/friend to perform any action.

Do not deploy to production until Vash gives one explicit final approval after the complete release candidate has been built and validated.

---

## 1. Inspect before changing

Treat the repository as authoritative.

Read at minimum:

- `AGENTS.md`;
- `creation_lab_plan.md`;
- `installation.md`;
- `cosmos_interface.md` if present;
- `README.md`;
- root `package.json` and workspace configuration;
- release/build scripts;
- production verifier/manifest logic;
- upload helper;
- frontend source for homepage, portfolio and demos 1, 2, 3 and 6;
- Node gateway code;
- Python/FastAPI code;
- frontend, Node, Python and Playwright tests;
- contact endpoint;
- analytics code;
- production health-check and activation scripts.

Inspect Git history where useful before deleting or simplifying code whose purpose is unclear.

Before implementation, produce a concise architecture inventory identifying:

1. current browser components that call `/api/lab/*`;
2. Node functions used only by Lab behavior;
3. Node functions also required by contact/analytics/other production behavior;
4. Python functions used only by Lab behavior;
5. release scripts that assume Node/Python remain present;
6. tests that encode the old Lab backend contract;
7. code that can safely remain untouched;
8. the minimum set of files that must change.

Use this inventory to choose the smallest safe migration.

---

## 2. Hard constraints

### Hosting

- Keep `cosmos-x-machina.it` on the current production machine.
- No GitHub Pages.
- No new VPS, serverless backend, cloud function or external backend.
- No DNS changes.
- No new production host.

### Existing infrastructure

Do not remove, disable or reconfigure working production systems merely because the Lab will stop using them.

Preserve unless a narrow repository-level compatibility change is proven necessary:

- Apache;
- Certbot/TLS;
- current vhost topology;
- production `.env`;
- Node systemd service;
- Python systemd service;
- cron release processor;
- SFTP subsystem;
- incoming/status directories;
- release symlink model;
- contact/Gmail SMTP functionality;
- aggregate analytics;
- health checks;
- rollback mechanism.

Do not require:

- sudo/root;
- privileged shell work;
- systemd changes;
- Apache/bootstrap changes;
- production package installation;
- friend/admin intervention.

Use only the authorization and routine release path already available.

### Production safety

- No production mutation during design/implementation.
- No production upload before final approval.
- No `.ready` marker before final approval.
- No destructive cleanup of production infrastructure.
- Existing live production remains untouched until the approved release is activated normally.

### Runtime

The four active demos must not depend on request-time Lab backend execution.

They must not call:

- `/api/lab/session`;
- `/api/lab/:demo/:action`;
- `/api/lab/:demo/reset`;
- any external AI provider.

Do not break unrelated API behavior used elsewhere on the site.

### Product truthfulness

- Keep synthetic Orion Works data.
- Keep explicit self-directed-demo disclosure.
- Do not present browser-side permission filtering as real server-side security.
- Do not invent client outcomes.

---

## 3. Target architecture

```text
browser
  -> existing Apache
       -> existing dist/ static assets
       -> existing non-Lab APIs remain available where already used

Creation Lab:
  browser runtime only
    -> fixtures
    -> validation
    -> state machines
    -> deterministic provider
    -> persistence
    -> retrieval
    -> traces
    -> warnings
    -> failure simulation
```

Retain the provider-neutral contract where practical:

```ts
execute({ task, schema, context, input })
  -> { output, evidence, usage, trace, warnings }
```

Retain/adapt the normalized result envelope where useful:

```ts
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

The goal is to preserve the architecture concepts while replacing HTTP/server execution with browser-native execution.

---

## 4. Phase A — Design a small shared browser runtime

Create or consolidate a non-visual runtime for shared behavior.

Candidate responsibilities:

- versioned Orion Works fixtures;
- deterministic fixture provider;
- input/schema validation;
- synthetic session state and expiry;
- action quota;
- idempotency/replay cache;
- deterministic IDs;
- deterministic clock abstraction for tests;
- transactional state mutation;
- reset;
- trace collection;
- warning normalization;
- safe text/HTML handling;
- redaction;
- test-only deterministic seed;
- persistence abstraction.

Do not create a shared visual component/design system. Each demo must keep its independent visual identity.

Prefer existing dependencies. Add a dependency only when it materially improves robustness and remains compatible with bundle/release budgets.

---

## 5. Phase B — Demo 1: AI Document & Email Operations

Previous server-backed intent:

- React;
- TypeScript;
- approved bundled synthetic document fixtures;
- deterministic FastAPI/Pydantic classification/extraction.

Replace request-time backend processing with a deterministic TypeScript/browser pipeline.

Required behavior:

1. load intended synthetic/sample documents;
2. parse locally with the existing browser-capable path;
3. classify deterministically;
4. extract structured fields;
5. validate the output schema;
6. expose evidence/source context;
7. display trace steps;
8. expose warnings;
9. preserve human review/edit/approve flow;
10. support deterministic failure fixtures;
11. support reset;
12. make zero `/api/lab` calls;
13. make zero real AI calls.

Keep these concerns distinct in code:

- provider output;
- validation;
- workflow transition logic;
- UI rendering.

If useful Pydantic constraints exist, translate their semantics faithfully into browser validation.

---

## 6. Phase C — Demo 2: Orion Operations Hub

Previous server-backed intent:

- React/TanStack;
- Node/Fastify;
- SQLite;
- operational state.

Replace server-side demo state with browser state.

Preferred persistence:

1. IndexedDB for browser-local durable state where appropriate;
2. memory for transactional working state;
3. `sessionStorage` for existing short-lived cross-page transfer.

Required capabilities:

- create/update supported synthetic records;
- valid state transitions;
- invalid-transition rejection;
- deterministic IDs;
- idempotent action replay;
- failure rollback;
- quota/session simulation where visible;
- reset to known fixtures;
- persistence across refresh where appropriate;
- no server/cross-visitor persistence;
- zero `/api/lab` calls.

Make transactional semantics explicit/testable:

```text
clone current state
-> validate transition
-> apply to working copy
-> validate invariants
-> commit
```

On failure, previous state remains unchanged.

---

## 7. Phase D — Demo 3: Secure Knowledge Assistant

Current intent:

- React;
- deterministic retrieval;
- SQLite FTS5;
- role/permission filtering;
- citations;
- evaluation.

Move retrieval entirely into the browser.

First inspect corpus size and current code. Choose the smallest robust option.

Preferred default:

- bundled synthetic corpus;
- deterministic normalization/tokenization;
- lightweight TypeScript inverted index;
- deterministic ranking;
- role-aware filtering before answer assembly;
- citations/evidence.

Use browser SQLite/WASM only if existing repository dependencies or measurements show it is clearly justified without harming bundle/performance limits.

Required behavior:

- deterministic queries;
- source citations;
- visible evidence;
- role simulation;
- permission-filtered result sets;
- refusal/no-result states;
- injection/adversarial fixtures;
- evaluation fixtures;
- reset;
- zero `/api/lab` calls;
- zero real AI calls.

### Security wording

Update case-study copy to distinguish:

**Demo:** role-aware filtering runs in the browser against synthetic data.

**Production:** authorization and protected-data filtering must be enforced in a trusted server-side boundary before protected data reaches an untrusted client.

Do not imply that shipped/minified JavaScript is a security boundary.

---

## 8. Phase E — Demo 6: KPI & Reporting Studio

This demo is already intended to use React, ECharts, Web Workers and deterministic browser processing.

Use it as the reference for the zero-backend direction.

Inspect for:

- accidental `/api/lab` dependencies;
- unnecessary server coupling;
- shared runtime inconsistencies;
- reset/session-summary behavior;
- test gaps.

Avoid unnecessary rewrites.

---

## 9. Phase F — Decouple active demos from the Lab API

After migration:

1. search source/build graph for `/api/lab` references;
2. remove runtime Lab API usage from active demo code;
3. keep unrelated `/api/*` code intact;
4. do not delete backend code merely because demos stop using it;
5. ensure demos do not wait for backend health;
6. ensure failures are local/recoverable rather than "API offline" states.

If stale Lab backend routes remain because removal could affect production/release machinery, leave them dormant and document that active demos no longer use them.

Prefer dormant harmless code over risky infrastructure surgery.

---

## 10. Phase G — Tests

Update tests to prove the new architecture.

### Unit/frontend

Test:

- fixture determinism;
- schema validation;
- session expiry;
- quota;
- idempotency replay;
- rollback;
- reset;
- persistence serialization;
- input bounds;
- hostile text handling;
- retrieval ranking;
- role filtering;
- citations;
- deterministic evaluation;
- KPI computations.

### Node/Python

Do not casually delete existing tests.

If Node/Python remain part of production release/health topology, keep their useful tests.

Only alter tests whose sole assertion is that active browser demos must call those services.

### Playwright

For each active demo in Italian and English:

- direct route load;
- main happy path;
- at least one failure/recovery path;
- reset;
- synthetic-demo disclosure;
- responsive behavior;
- keyboard/focus requirements already specified.

### Network assertions

Interacting with all active demos must produce:

- zero `/api/lab/*` requests;
- zero OpenAI requests;
- zero Anthropic requests;
- zero Gemini/Google AI requests;
- zero xAI/Grok requests;
- zero OpenRouter requests;
- zero other unapproved remote execution calls.

Do not block legitimate same-origin static assets or existing non-Lab functionality.

### Regression

Verify:

- homepage;
- Portfolio index;
- all four direct demo routes;
- language precedence;
- contact-form behavior in the repository's intended test mode;
- demo-to-contact `sessionStorage` handoff;
- analytics not broken;
- private-file exclusion;
- sitemap/canonical behavior if already tested.

---

## 11. Phase H — Performance and release gates

After migration:

- measure each demo bundle;
- measure total `dist/`;
- avoid large WASM/database payloads unless justified;
- preserve independent demo CSS/build targets;
- preserve homepage isolation from demo framework cost;
- keep optimized assets;
- keep the archive under repository-enforced limits.

If migration materially increases bundle size, optimize before acceptance.

---

## 12. Phase I — Update documentation

### `creation_lab_plan.md`

Update:

- Synthetic AI Architecture;
- Shared Interfaces;
- Runtime rules;
- Build and Deployment;
- Verification;
- active demo stack descriptions.

Describe V1 provider execution as browser-side.

Describe sessions/quota/idempotency as deterministic browser simulations for the public demo.

Keep deferred demos deferred.

### `installation.md`

Do not pretend Node/Python no longer exist.

Document that:

- Apache still serves the Creation Lab;
- active Lab demos execute in the browser;
- active Lab demos no longer depend on `/api/lab/*`;
- existing Node/Python services remain installed/active for existing production responsibilities and compatibility;
- routine deployment remains SFTP-only;
- no new privileged bootstrap is required.

Preserve contact/analytics/deployment documentation.

### Other docs

Review `cosmos_interface.md`, `README.md` and other architecture documents and change only what would otherwise be materially false.

---

## 13. Phase J — Build the local release candidate

When implementation/documentation is complete:

1. run repository formatting/linting;
2. run frontend tests;
3. run retained Node tests;
4. run retained Python tests;
5. run Playwright/e2e;
6. run normal build;
7. run secret/private-file scans;
8. run bundle-size gates;
9. run:

```bash
npm run release:build
```

10. satisfy clean-release rules;
11. prepare the normal release archive/checksum/ready artifacts locally.

Do not upload them.

---

## 14. Mandatory final approval gate

At this point, **STOP**.

Report to Vash:

- implementation summary;
- architecture changes;
- files changed;
- tests and exact results;
- network assertion result;
- bundle/release size;
- release identifier/commit;
- archive name;
- known limitations;
- dormant old Lab backend code intentionally retained;
- confirmation that contact/analytics/current infrastructure were preserved;
- exact deployment steps to be executed;
- rollback path.

Ask for one explicit final production approval.

Before that approval:

- no archive upload;
- no checksum upload;
- no `.ready` upload;
- no production mutation.

---

## 15. Phase K — Deploy only after approval

After explicit approval, use the existing authorized routine release mechanism documented in `installation.md`.

Expected command shape:

```powershell
.\scripts\upload-production-release.ps1 `
  -RemoteIncoming incoming/cosmosxmachina `
  -KeyPath .\cosmos_key
```

Use the repository's actual current parameters/paths if they differ.

Do not invent or change server configuration.

The existing helper should send:

1. archive;
2. checksum;
3. `.ready` marker last.

Then read the existing production status through the available SFTP/status mechanism and confirm the expected release became active.

---

## 16. Post-deploy smoke verification

After activation verify live:

- homepage;
- `/portfolio/`;
- Demo 1;
- Demo 2;
- Demo 3;
- Demo 6;
- Italian/English switching;
- main workflow of every demo;
- failure/recovery where practical;
- reset;
- demo-to-contact transfer;
- contact functionality;
- no visible backend-offline errors;
- zero `/api/lab/*` requests from demo interaction;
- zero external AI requests;
- no obvious console errors;
- mobile-sized rendering;
- production status health.

Use an existing safer automated smoke mechanism if the repository already provides one.

Do not alter Apache/systemd to repair a failed release. Use the existing rollback design.

---

## 17. Rollback

Do not invent a new rollback method.

If activation or smoke testing fails:

1. preserve diagnostics;
2. confirm/use existing rollback behavior;
3. verify previous release health;
4. report failure/evidence;
5. fix locally;
6. require a new explicit approval before another production release.

---

## 18. Acceptance checklist

- [ ] No administrator/friend intervention required.
- [ ] No GitHub Pages or external backend introduced.
- [ ] Demo 1 fully operational in browser.
- [ ] Demo 2 fully operational in browser.
- [ ] Demo 3 fully operational in browser.
- [ ] Demo 6 fully operational in browser.
- [ ] Zero `/api/lab/*` runtime requests from active demos.
- [ ] Zero external AI runtime requests.
- [ ] Demos remain deterministic and substantive.
- [ ] Synthetic/demo disclosure preserved.
- [ ] Secure Knowledge Assistant does not misrepresent browser filtering as a real security boundary.
- [ ] Existing contact behavior preserved.
- [ ] Existing analytics behavior preserved.
- [ ] Existing Node service not removed merely because demos no longer need it.
- [ ] Existing Python service not removed merely because demos no longer need it.
- [ ] Existing Apache/systemd/Certbot/SFTP/cron setup not re-bootstrapped.
- [ ] Bilingual behavior passes.
- [ ] Accessibility/responsive requirements pass.
- [ ] Private-file/secret release gates pass.
- [ ] Bundle/release-size gates pass.
- [ ] `npm run release:build` passes.
- [ ] Complete local release candidate prepared.
- [ ] Production untouched until Vash gives final approval.
- [ ] After approval, existing authorized SFTP flow used.
- [ ] New release confirmed active.
- [ ] Live smoke tests pass.
- [ ] Existing rollback capability remains intact.

---

## 19. Engineering preference

When choosing between broad cleanup and narrowly sufficient migration, choose the narrowly sufficient migration.

The production machine and deployment system already work. This change exists because the VPS is too constrained for the Creation Lab to depend on server-side demo execution.

Optimize for:

1. zero Lab backend runtime dependency;
2. minimum production risk;
3. strong portfolio demonstration value;
4. deterministic browser behavior;
5. no privileged server work;
6. preservation of existing infrastructure;
7. one final approval before production.

Do not turn this task into an infrastructure rewrite.
