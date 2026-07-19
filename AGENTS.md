# Repository Operating Guide

Read creation_lab_plan.md before changing the portfolio. It contains the approved scope and locked decisions.

## Product Boundaries

- index.html remains the canonical bilingual homepage.
- Preserve its Three.js layer, contact endpoint, hover behavior, and language precedence.
- The public Portfolio is the cosmosXmachina Creation Lab under portfolio/.
- Orion Works is fictional and all demonstration data is synthetic.
- Never imply a real client, measured client outcome, testimonial, or unsupported personal claim.
- Every published demo must be complete, usable, bilingual, and explicit about its synthetic status.
- Individual demos choose their own professional visual identity. Do not introduce shared visual components, design tokens, card systems, or layouts.
- Shared code is limited to fixtures, schemas, localization, accessibility helpers, API contracts, provider contracts, and contact handoff.

## Runtime Boundaries

- Version 1 makes zero external AI-provider calls and uses no AI key.
- FixtureAIProvider must satisfy the provider-neutral asynchronous contract documented in creation_lab_plan.md.
- Validation, schemas, permissions, and workflow transitions stay outside providers.
- Anonymous sessions expire after 30 minutes.
- Do not persist or log visitor content.
- Keep arbitrary uploads, arbitrary URL fetching, scraping, and automatic proposal sending disabled.
- Reject unknown actions, oversized input, hostile HTML, and invalid transitions.

## Build and Deployment

- npm run build creates dist/, the only production web root.
- Never serve or copy the repository root into Nginx.
- Nginx proxies /api/* to the private Node gateway at 127.0.0.1:8787.
- Node routes deterministic pipeline work to Python at 127.0.0.1:8790.
- Both services run under systemd with Restart=always.
- .env is the only application runtime configuration source.
- Production needs Node, Python, and Nginx only.
- Java/Maven belongs to development and CI evidence only.

## Privacy

Never commit, publish, or place in dist/:

- .env or credentials
- vash_key or vash_key.pub
- CV and personal-profile source files
- private planning files
- node_modules, .venv, caches, logs, or repository metadata

The .gitignore patterns and scripts/build.mjs allowlist are security controls. Do not weaken them.

## Language

Use this precedence on every public page:

1. ?lang=it or ?lang=en
2. localStorage key cosmos-lang
3. browser language
4. Italian fallback

A language choice is saved. Demo CTAs use sessionStorage key cosmos-lab-handoff with a 15-minute expiry and always require user review in the contact form.

## Verification

Scale checks to the change:

- Vitest for browser logic and provider contracts
- node:test for Node workflows, sessions, and deterministic replay
- pytest for Python pipelines
- JUnit for architecture-fixture
- Playwright for bilingual workflows, keyboard use, responsive layouts, and external-AI network assertions

Keep framework bundles out of the homepage. Verify approximately 360, 768, 1024, and 1440 pixel widths. Preserve visible focus, reduced motion, semantic landmarks, and table alternatives for charts.

## Documentation

Update these files when architecture or deployment changes:

- creation_lab_plan.md for approved scope or locked-decision changes
- README.md for repository overview and commands
- installation.md for fresh-machine and production procedures
- cosmos_interface.md for interfaces, visual boundaries, and runtime architecture

Do not return documentation to the old single-file, no-build, GitHub Pages-only model.
