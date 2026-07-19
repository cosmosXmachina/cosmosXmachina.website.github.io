# cosmosXmachina Interface and Architecture

The complete approved direction is in creation_lab_plan.md. This document records the implemented interface and system boundaries.

## Public Information Architecture

Routes:

- / is the existing cosmosXmachina homepage.
- /portfolio/ is the Creation Lab index.
- /portfolio/<demo-slug>/ is a complete demonstration.
- /api/contact is the Gmail SMTP contact route.
- /api/lab/* is the same-origin demonstration API.

The homepage includes Portfolio in navigation and previews the four strongest commercial demonstrations. Demo bundles are not loaded by the homepage.

Every portfolio page states that Orion Works is fictional, the data is synthetic, and the work is a self-directed demonstration rather than a client result.

## Language Contract

All public pages use:

1. an explicit ?lang=it or ?lang=en query
2. localStorage key cosmos-lang
3. browser preference
4. Italian fallback

Explicit choices are saved. Links carry the active language when practical. Italian and English workflows must remain functionally equivalent.

## Homepage Contract

index.html remains the canonical homepage.

Preserve:

- the approved Three.js geometry, object placement, idle sizing, hover growth, and directional hover spin
- the pinned Three.js module and reduced-motion behavior
- the current section imagery and cosmosXmachina branding
- the same-origin /api/contact endpoint
- Gmail SMTP plus mailto fallback
- the current language precedence

The new portfolio preview uses the homepage's existing visual grammar because it belongs to the homepage. It does not import React or any demo CSS.

A demo CTA stores an editable summary under cosmos-lab-handoff in sessionStorage. The summary expires after 15 minutes. The homepage loads it into the contact form and tells the visitor to review it. It never submits automatically.

## Creation Lab Index

The index has a distinct Creation Lab editorial identity and publishes complete demonstrations only.

It supports:

- ten ranked systems
- commercial-impact and technical-depth filters
- Italian and English copy
- synthetic-data disclosure
- direct links into usable interfaces

## Independent Demo Identities

Visual components, CSS tokens, layouts, and card systems are not shared between demos.

Implemented identities:

1. Document Operations: ivory and graphite split-view workstation.
2. Operations Hub: dense green SME operations console.
3. Knowledge Assistant: editorial research and citation interface.
4. Catalog Intelligence: image-led coral merchant console.
5. Lead-to-Appointment: Veneto hospitality experience and staff CRM.
6. KPI Studio: bright analytical workspace with ECharts.
7. Integration Control: dark event observability console.
8. Architecture Rescue: code diff and ADR case file.
9. Workflow Audit: restrained consultancy canvas and SVG process map.
10. Opportunity Scout: compact Chrome side-panel simulator.

Shared frontend modules are limited to:

- portfolio/shared/catalog.js for synthetic Orion fixtures and demo metadata
- portfolio/shared/i18n.js for language behavior
- portfolio/shared/disclosure.js for synthetic labels
- portfolio/shared/api.js for same-origin API access and deterministic preview fallback
- portfolio/shared/fixture-ai.js for provider contract fixtures
- portfolio/shared/handoff.js for expiring contact summaries

## Provider Contract

All AI-like behavior in version 1 is synthetic and deterministic.

~~~text
execute({ task, schema, context, input })
  -> { output, evidence, usage, trace, warnings }
~~~

Responsibilities outside the provider:

- request and extraction schemas
- normalization and validation
- permissions
- workflow state transitions
- authorization and quotas
- business actions

Fixture providers exist in browser, Node, and Python. A future provider must pass the same contract tests and cannot require UI or workflow changes.

Every AI-like result shows Synthetic demonstration. Version 1 has no AI credentials and network tests reject external AI-provider traffic.

## Public API

~~~text
POST /api/lab/session
POST /api/lab/:demo/:action
POST /api/lab/:demo/reset
GET  /api/lab/health
~~~

Standard success shape:

~~~text
{ ok, mode, demo, action, session, result, trace, warnings, quota }
~~~

Session rules:

- HMAC-signed anonymous token
- 30-minute expiry
- in-memory state only
- 25 action quota
- no visitor-content logging or persistence

Request rules:

- 64 KiB gateway body limit
- 12 KiB normalized input limit
- allowlisted demos and actions
- explicit state transitions
- hostile HTML rejection
- no arbitrary upload or URL
- no scraping
- no automatic proposal sending

## Service Topology

~~~text
Nginx public :80/:443
  -> dist/ for static pages and assets
  -> /api/* to Node 127.0.0.1:8787
       -> SMTP over TLS to Gmail
       -> signed lab sessions and Node workflows
       -> Python 127.0.0.1:8790 for deterministic pipelines
~~~

The Node gateway uses Fastify and binds only to loopback. It preserves the existing api/contact.js SMTP handler through the unified route.

Python uses FastAPI/Pydantic and binds only to loopback. python_service/server.py reads PYTHON_LAB_PORT from the project-root .env.

If the private Python process is temporarily unavailable, eligible Node routes return a deterministic Node fixture with a warning. This is an explicit degraded mode, not a live AI fallback.

## Build Boundary

npm run build:

1. deletes and recreates dist/
2. copies index.html
3. copies assets/
4. builds only portfolio HTML entries and imported bundles with Vite
5. copies the packaged Manifest V3 extension source

Nginx serves dist/ only.

The build does not copy:

- .env
- repository metadata
- documentation
- CV/profile/planning sources
- private keys
- Node or Python source
- architecture-fixture
- tests
- node_modules or .venv

## Data and Assets

Orion Works fixtures are synthetic and shared for continuity. They do not represent a registered client.

Public generated assets:

- assets/portfolio/orion-products.png supports Catalog Intelligence.
- assets/portfolio/orion-vineyard.png supports Lead-to-Appointment.

Primary product and venue imagery must remain inspectable, responsive, and relevant to the actual demonstration.

## Accessibility and Performance

Required across all published systems:

- semantic landmarks and headings
- keyboard-operable controls
- visible focus
- responsive layout around 360, 768, 1024, and 1440 pixels
- prefers-reduced-motion support where motion exists
- live regions for asynchronous results
- an accessible table equivalent for every chart

ECharts is isolated to KPI Studio. React and demo CSS stay out of index.html. Each Vite HTML input is an independent build target with CSS code splitting.

## Verification Map

- tests/frontend: browser provider contract and zero-fetch behavior
- tests/node: provider replay, signed sessions, expiry, tamper, and quota
- python_service/tests: provider contract and secure abstention
- tests/e2e: ten published entries, synthetic disclosure, deterministic document workflow, and external-AI network assertion
- architecture-fixture: executable JUnit pricing-policy evidence
- .github/workflows/creation-lab-checks.yml: web, Python, browser, and Java CI

## Deployment Files

- cosmos-contact.service runs the unified Node gateway.
- cosmos-lab-python.service runs the private Python server.
- cosmos-x-machina.nginx serves dist/ and proxies /api/.
- installation.md is the canonical fresh-machine and production procedure.
