# cosmosXmachina Creation Lab

Status: approved implementation specification.

This document is the canonical project plan for the public portfolio. Operational setup is documented in installation.md, architecture details in cosmos_interface.md, and repository rules in AGENTS.md.

## Direction

Create a public Portfolio section framed as the cosmosXmachina Creation Lab, where Vash turns ambiguous operational problems into inspectable systems.

Use Orion Works, a clearly fictional bilingual Veneto SME, across all demonstrations. Shared synthetic entities create continuity, but every demo receives its own professional product identity, typography, palette, layout, assets, and interaction model.

The final direction combines the source plans as follows:

- Keep the GPT plan's fictional-company universe, reasoning-first presentation, and three-demo initial release.
- Keep the Codex plan's deterministic behavior, safety controls, incremental delivery, and restrained production footprint.
- Do not inherit the homepage design or vanilla stack inside the demos.
- Do not create one shared visual system or one large platform-like application.
- Choose the commercial or technical presentation independently for every demo.
- Reuse technology only when it is genuinely the best choice, never for artificial stack variety.

## Public Structure

- Add Portfolio to the current homepage navigation.
- Add a homepage preview featuring the four strongest commercial demonstrations.
- Publish /portfolio/ and /portfolio/<demo-slug>/.
- Preserve ?lang=it|en, saved-language, browser-language, and Italian-fallback behavior.
- Give the Portfolio index the Creation Lab theme; individual demos do not inherit it.
- Open every demo directly into a usable interface.
- Expose the problem, workflow, architecture, decisions, failure modes, tests, and relevant service on every demo.
- State clearly that each system is a self-directed demonstration using synthetic data and is not a real-client result.
- Transfer an expiring, user-reviewable demo summary to the existing contact form through sessionStorage.

## Synthetic AI Architecture

Version 1 makes no real AI calls and requires no AI API key.

Provider-neutral asynchronous contract:

~~~text
execute({ task, schema, context, input })
  -> { output, evidence, usage, trace, warnings }
~~~

Implementation rules:

- FixtureAIProvider uses versioned synthetic responses and deterministic rules.
- Classification, extraction schemas, validation, permissions, and workflow transitions stay outside the provider.
- Dormant OpenAI, Google Gemini, Anthropic Claude, xAI Grok and OpenRouter adapters implement the same provider-neutral contract and are tested only through mocked transports.
- Fixture mode is the release behavior. Live mode requires the explicit `AI_LIVE_ENABLED=true` safety switch plus credentials and remains prohibited until separately approved.
- Provider output is schema-validated and bounded; transport errors, timeouts, retries and trace redaction are normalized at the server boundary.
- Synthetic demonstration appears prominently wherever an AI-like result is shown.
- Browser and network tests prove that version 1 makes zero requests to external AI providers.

## Roadmap and Active Scope

The roadmap retains the original ten concepts, but the active public release intentionally contains only ranks **1, 2, 3, and 6**. The other six concepts are deferred: they are not included in the Vite build, Portfolio index, API allowlist, tests, or production deployment. Their earlier implementation remains recoverable from Git history if the user approves a later release.

| Rank | Demo | Presentation priority | Independent design and stack |
| ---: | --- | --- | --- |
| 1 | AI Document & Email Operations | Client-led with technical evidence | Ivory/graphite split-view workstation; React, TypeScript, PDF.js; deterministic FastAPI/Pydantic pipeline |
| 2 | Orion Operations Hub | Client-led full-stack proof | Dense, quiet SME workspace; React, TanStack utilities; Node/Fastify and SQLite |
| 3 | Secure Knowledge Assistant | Senior AI/architecture depth | Editorial research interface; React; deterministic retrieval with SQLite FTS5, permissions, citations, and evaluation |
| 4 | E-commerce Catalog Intelligence | Client-led vertical product | Image-rich merchant console; React; FastAPI transformations and simulated Shopify/WooCommerce adapters |
| 5 | Lead-to-Appointment System | Client-led local-business proof | Distinct Veneto hospitality site plus staff CRM; Astro with React islands; Node and SQLite |
| 6 | KPI & Reporting Studio | Client-led data proof | Bright analytical workspace; React, ECharts, and Web Workers; browser-side deterministic processing |
| 7 | Integration Reliability Control Room | Senior backend depth | Dark observability console; React; Node event pipeline, idempotency, retries, dead letters, and replay |
| 8 | Architecture Rescue Lab | Senior architecture depth | Code-diff and ADR case study; Astro/MDX; executable Spring Boot/JUnit fixture built in CI |
| 9 | Workflow Audit & ROI Architect | Client conversion | Restrained consultancy canvas; React, SVG process maps, and transparent browser-side formulas |
| 10 | Browser Opportunity Scout | Product-engineering depth | Compact Chrome side panel and web simulator; Manifest V3, React, and deterministic sample analysis |

The AI Model Gateway is not a separate demo. Provider routing, evaluation, cost modelling, and fallback behavior appear as technical evidence inside demos 1, 3, and 4.

The Market Radar concept is absorbed into Browser Opportunity Scout through explainable opportunity scoring and proposal preparation.

## Shared Interfaces

Share only Orion Works fixtures, schemas, localization, accessibility helpers, and API contracts.

Do not share visual components, design tokens, card systems, or demo layouts.

Public API:

~~~text
POST /api/lab/session
POST /api/lab/:demo/:action
POST /api/lab/:demo/reset
GET  /api/lab/health
~~~

Standard response:

~~~text
{ ok, mode, demo, action, session, result, trace, warnings, quota }
~~~

Runtime rules:

- Anonymous role-bound sessions are HMAC-signed, bounded to 2,000 active records, expire after 30 minutes and allow 25 successful actions.
- State-changing requests require idempotency keys. Failed operations roll back state and do not consume quota; duplicate requests replay their original result.
- Visitor content is not persisted or written to logs.
- Unknown demos/actions, oversized requests, hostile HTML, and invalid state transitions are rejected.
- Arbitrary uploads, arbitrary URL fetching, scraping, and automatic proposal sending are excluded from version 1.
- Browser fixtures are available only in the explicit development fixture mode. Production-mode API failures remain visible and recoverable in the interface.

## Build and Deployment

- Use one npm workspace and lockfile, with each demo as an independent build target and CSS bundle.
- Build the homepage, Portfolio index, and demos into one dist/ directory.
- Canonical section backgrounds are generated from retained PNG sources into optimized WebP files with `npm run optimize:images`; the public build excludes superseded PNGs.
- Nginx serves only dist/ and proxies /api/* to the private Node gateway.
- The Node service handles SMTP, anonymous sessions, Node-based workflows, and routing to the private Python service.
- The FastAPI service handles deterministic document and retrieval pipelines.
- Both services run under systemd and bind only to loopback.
- Production requires Node, Python, and Nginx only.
- Production does not require Docker, PostgreSQL, Redis, Java, or an AI provider.
- .env is the only runtime configuration source. Version 1 contains no AI credentials.
- Never serve the repository root.
- Exclude .env, CV/profile sources, business plans, private keys, and development files from dist/.
- vash_key and vash_key.pub must never be committed or deployed beneath the web root.

Reference documentation:

- Vite static deployment: https://vite.dev/guide/static-deploy.html
- Nginx reverse proxy: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- FastAPI deployment concepts: https://fastapi.tiangolo.com/deployment/concepts/

## Delivery Order

1. Preserve the remote `index.html` as the authoritative homepage and add Portfolio as its ninth and final section.
2. Publish Document Operations, Operations Hub, Secure Knowledge Assistant, and KPI Studio.
3. Keep ranks 4, 5, 7, 8, 9, and 10 deferred until explicitly approved.

No unfinished demo card is published. The Portfolio index shows completed demonstrations only.

## Verification

- Vitest covers frontend logic and the explicitly enabled development browser fixture provider.
- node:test covers Node workflows, provider behavior, and session expiry.
- pytest covers FastAPI deterministic pipelines and provider behavior.
- Playwright covers published workflows in Italian and English.
- Network assertions prove that version 1 performs no external AI calls.
- Replay tests ensure identical inputs produce reproducible results.
- Security tests cover authorization, prompt-injection fixtures, idempotency, rate limits, hostile HTML, request limits, and session expiry.
- Every interface supports keyboard navigation, visible focus, reduced motion, semantic landmarks, and accessible table alternatives for charts.
- Responsive verification targets approximately 360, 768, 1024, and 1440 pixels.
- Demo framework bundles stay out of the homepage.
- Every demo has an individual performance budget.
- The build rejects private files, secret-like content, external provider endpoints, oversized screenshot previews and a public distribution above 8 MiB.
- AGENTS.md, cosmos_interface.md, README.md, and installation.md describe the workspace, dependencies, build, systemd units, and Nginx configuration.

## Locked Decisions

- Audience emphasis is selected independently for each demo.
- Version 1 is entirely synthetic and has a tested provider boundary for future live adapters.
- Production uses static builds plus private Node and Python services under systemd.
- The existing homepage, Three.js layer, SMTP behavior, language precedence, and production contact endpoint remain intact.
- Personal profiles, planning documents, unsupported internal claims, and private keys remain private.
- Capability is demonstrated through working systems and explicit reasoning, not invented client results.
