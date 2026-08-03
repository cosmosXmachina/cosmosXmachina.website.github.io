# cosmos_interface.md

## Purpose

This file documents the architecture, technologies, visual system and implementation decisions for the cosmosXmachina website. It is the main technical interface document for future agents or developers. `AGENTS.md` is the concise operating rule sheet; this file explains how the website is built and how to evolve it.

## Current Build

- Main file: `index.html`
- Privacy and browser-storage notice: `privacy.html`
- Search discovery files: `robots.txt` and `sitemap.xml`
- Optional visual-mode stylesheet: `assets/design-modes.css`
- Five named visual preview entry files: `index-hermetic-observatory.html`, `index-prismatic-glass-atelier.html`, `index-arcane-editorial-codex.html`, `index-digital-cathedral.html`, `index-transmutation-system-map.html`
- Legacy/reference 2D file: `index2D.html`
- Scratch/experiment file: `index_temp.html`, ignored unless explicitly needed
- Asset folder: `assets/`
- Creation Lab: `portfolio/` with active demos 01, 02, 03 and 06
- Build workspace: `package.json`, `vite.config.js`, `scripts/build.mjs`, `scripts/optimize-images.mjs`
- Private services: `api/server.mjs` and `python_service/server.py`
- Private aggregate visit counter: `api/visit-analytics.mjs`; report command: `npm run report:visits -- --days 7`
- README: `README.md` summarizes local preview, static-host limitations and the Nginx production release
- Installation guide: `installation.md` documents dependencies, fresh-machine setup and contact endpoint deployment
- Autonomous production installer: `deploy-production.sh`; it installs dependencies, runs the complete isolated test topology, builds to `.dist.next`, activates `dist/`, installs systemd/Nginx configuration and verifies health while preserving `.env` and existing TLS
- Hosting target: Nginx serving only `dist/`, with `/api/*` proxied to private loopback services
- Architecture: canonical remote-first homepage plus a multi-page Creation Lab production build
- Languages: Italian and English, switched client-side
- Current base tech stack: HTML, CSS, vanilla JavaScript, React, Vite, Node, FastAPI and static image assets
- Additional approved technology for `index.html`: Three.js loaded as a pinned CDN ES module
- Approved backend: `api/server.mjs`, mounting the Gmail SMTP handler, anonymous lab sessions and deterministic workflow routes using the project `.env` file
- Production build command: `npm run build`; background regeneration command: `npm run optimize:images`; browser/third-party analytics and live external AI remain unapproved

Any new technology beyond the static stack, the approved `index.html` Three.js layer and the approved contact endpoint must be approved by the user first, then documented in both `AGENTS.md` and this file.

## Public Brand And Contacts

Public brand: `cosmosXmachina`

Real contacts currently wired into the site:

- Email: `davide.deon@gmail.com`
- Italian LinkedIn: `https://www.linkedin.com/in/vash-vacuum/`
- English LinkedIn: `https://www.linkedin.com/in/vash-vacuum/?locale=en_US`
- Italian VAT number: `05637720268` (`IT05637720268` in structured data)

The VAT number appears in the homepage Contact section, the legal footer, the Creation Lab footer and the homepage `ProfessionalService` JSON-LD record. Public authorship is Davide Deon/Vash; no customer-facing page may imply that the site or demos were AI-coded. References to synthetic data and simulated providers explain demo behavior only.

The contact form posts JSON to `CONTACT_ENDPOINT`, which defaults to `/api/contact`. The Gmail SMTP mail system requires `api/contact.js` to be running on a Node/serverless host. The endpoint reads the project `.env` file and sends through Gmail SMTP with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`, `ALLOWED_ORIGIN` and `PORT`. Gmail app passwords must never be committed or placed in browser JavaScript.

If the endpoint is unavailable, `index.html` falls back to a `mailto:` URL addressed to `davide.deon@gmail.com`, using the selected language's subject and form labels. This preserves a backup contact path, but real Gmail SMTP delivery requires the Node endpoint to be deployed separately or the site to be served from a host that runs `/api/contact`.

## Current Sections

The page currently contains these sections:

1. Header / navigation
2. Hero
3. Problems I solve
4. Services overview with 10 services
5. Entry offers
6. Process
7. Technologies and platforms
8. FAQ
9. Contact / project intake
10. Portfolio / Creation Lab preview
11. Footer

The About/Profile section remains intentionally removed. Portfolio is deliberately the ninth and final major section after Contact, preserving the remote site's original eight-background order and adding one new dark background at `assets/section-portfolio.webp`.

## File Variants

`index.html` is the canonical production homepage and includes the approved Three.js solid sacred-geometry layer. The production Nginx build serves it at the site root; GitHub Pages can host only the static preview without private Lab or SMTP services.

`index2D.html` is the older non-3D fallback/reference page. Do not treat it as the main implementation unless the user asks to restore or maintain the 2D version.

`index_temp.html` is scratch/experiment space and can be ignored unless the user explicitly asks about it.

The five named visual preview files are intentionally tiny redirectors. They preserve the incoming query string and hash, add their `design` parameter, and load the canonical `index.html`; they do not duplicate content, language logic, forms or Three.js code. The modes are marked `noindex` at the entry-file level and are intended for design comparison.

The 3D version imports Three.js as a pinned ES module:

```js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js";
```

The 3D layer:

- uses one transparent `<canvas class="alchemy-3d">`
- renders two solid procedural structures per major section
- places symbols between generated section background images and text
- derives symbol placement from the live section and `.wrap` bounding boxes: desktop uses the left/right side rails outside content, while narrow layouts use reserved top/bottom padding; scale is clamped to keep each object inside the page and outside the content zone
- uses different structure pairings per section
- moves the same renderer/canvas into the currently active section instead of creating many WebGL contexts
- contains no visible circular 3D rings, orbital halos or circular platforms; edge outlines must follow the solid geometry itself
- uses varied colors per nested layer from the approved blue, dark purple, dark violet, indigo, violet and cyan family
- uses always-moving multicolor wave bands and additive soft glow as the base visual state
- reacts to pointer hover through raycasting, stronger glow, faster wave motion and metallic rainbow interference across faceted surfaces
- rotates with randomized changing axes and directions every 2.5-5 seconds instead of a single fixed vertical spin
- disables itself for `prefers-reduced-motion: reduce`

Current Three.js section pairs:

- Hero: Philosopher Gate and Azoth Merkaba
- Problems: Earth Cubic Vault and Air Octa Engine
- Services: Hermetic Prism and Aether Dodeca Core
- Entry offers: Fire Tetra Crown and Water Icosa Bloom
- Process: Celestial Sigil and Philosopher Gate
- Stack: Aether Dodeca Core and Prima Materia
- FAQ: Water Icosa Bloom and Celestial Sigil
- Contact: Hermetic Prism and Azoth Merkaba
- Portfolio: Prima Materia and Earth Cubic Vault

Current procedural builders:

- `createFireTetraCrown()` and `createEarthCubicVault()`
- `createAirOctaEngine()` and `createWaterIcosaBloom()`
- `createAetherDodecaCore()` and `createAzothMerkaba()`
- `createPhilosopherGate()` and `createHermeticPrism()`
- `createCelestialSigil()` and `createPrimaMateria()`

These ten artifact families translate the approved three-view concept sheet into built-in low-detail Three.js primitives. Nested layers share a compact set of shader materials per artifact, so there are no raster textures, external models or texture downloads at runtime. Only two artifact groups are active at once.

Keep the 3D implementation compact. Avoid post-processing passes, GLTF assets, texture loading, physics engines or many WebGL renderers unless the user explicitly approves a heavier 3D direction.

## Visual Preview Modes

The canonical page reads a valid `design` query parameter before CSS paints and stores it on `<html data-design>`. `assets/design-modes.css` then applies one of five complete visual systems while the HTML, bilingual copy, form behavior and Three.js runtime stay shared:

- `hermetic-observatory`: dark astronomical editorial layout, serif display typography and fine coordinate rules
- `prismatic-glass-atelier`: luminous crystalline backgrounds, deep-blue copy and translucent glass surfaces
- `arcane-editorial-codex`: light editorial system with a desktop navigation rail and folio-like rules
- `digital-cathedral`: monumental centered dark composition with architectural spacing and vertical accents
- `transmutation-system-map`: dense systems-oriented layout with connected modules, coded accents and a split hero

The matching named `index-*.html` entry files add the correct mode and redirect to `index.html`. Any `lang`, other query parameters and section hash are preserved. The header language buttons remove only `lang`, so a selected design remains active. Add future visual modes to the early allowlist in `index.html`, implement them in `assets/design-modes.css`, and create a thin entry redirect; do not fork the site content or JavaScript.

## Content Architecture

Homepage bilingual content lives in the `copy` object inside the inline script in `index.html`; the final Portfolio section uses the adjacent `portfolioCopy` object. Portfolio pages use their own localized data and independent visual systems.

The `render(lang)` function:

- sets `document.documentElement.lang`
- updates the page title
- replaces all `[data-i18n]` text
- renders runes, problem cards, services, entry offers, process cards, stack groups, FAQ, trust notes and the four Portfolio previews
- switches the LinkedIn URL and label by language
- updates form select options and placeholders
- stores the chosen language in `localStorage` under `cosmos-lang`

Initial language selection is resolved before `render()` with this priority:

1. valid URL parameter `?lang=it` or `?lang=en`
2. saved `localStorage` value `cosmos-lang`
3. browser/system language from `navigator.languages` or `navigator.language`
4. Italian fallback

The header language buttons still call `render(lang)`, but first remove only the `lang` URL parameter with `history.replaceState`, preserving other query parameters and the hash. Manual button choice therefore overrides URL language and becomes the new saved preference.

## Search And Metadata Architecture

The existing public routes implement the low-complexity technical SEO layer without creating new sales pages or articles:

- `robots.txt` allows public documents, excludes `/api/`, and declares the sitemap.
- `sitemap.xml` lists the homepage, Creation Lab, four demos and privacy notice with Italian, English and `x-default` alternates.
- Each public page has a canonical URL, `hreflang` links, a localized title and description, Open Graph/Twitter metadata, favicon and indexable robots policy.
- The parameter-free URL is the automatic-language `x-default`; valid `?lang=it` and `?lang=en` variants self-canonicalize after rendering.
- `?design=<slug>` and the five named design entry files remain `noindex,follow` and canonicalize to the homepage so experiments cannot become duplicate search results.
- Homepage JSON-LD truthfully describes the Organization/ProfessionalService, Davide Deon and the WebSite. Lab routes use breadcrumb JSON-LD only; do not invent ratings, prices, clients or outcomes.
- `assets/cosmos-hero-og.jpg` is the primary social image; each demo uses its verified screenshot. The homepage preloads its WebP hero and preconnects only to the pinned Three.js CDN.

Search Console and Bing verification are account/DNS actions, not runtime code. After deployment, submit `https://cosmos-x-machina.it/sitemap.xml` and inspect the root plus both language variants as documented in `installation.md`.

Homepage Portfolio cards and the `Enter Creation Lab` action use `target="_blank" rel="noopener"`, so their destination opens as the selected new tab while the homepage remains available in its original tab. The header Portfolio link intentionally remains `href="#portfolio"` and scrolls within the homepage.

The form submit handler:

- prevents default submission
- reads the active language
- serializes the project intake fields
- ignores spam-trap submissions with the hidden `company` field
- posts the intake fields to `CONTACT_ENDPOINT` as JSON
- shows bilingual sending/success/fallback status text
- opens a `mailto:` URL with encoded subject and body if the SMTP endpoint is unavailable

## Privacy, Cookies, Storage And Visit Counts

`privacy.html` is a bilingual Article 13-style notice linked from the homepage footer, the Creation Lab footer and the acknowledgement beside the contact-form submit button. The acknowledgement confirms that the notice was presented; it is not a consent checkbox because contact requests are handled as user-requested pre-contractual steps rather than marketing consent.

The current release sets no first-party cookies and uses no browser/third-party analytics, advertising, profiling, fingerprinting or tracking pixels. It uses only documented functional storage:

- `cosmos-lang` in `localStorage` persists the requested language until changed or removed
- `cosmos-lab-provider` in `sessionStorage` persists a simulated provider choice for the tab session
- `cosmos-lab-handoff` in `sessionStorage` carries a reviewable demo summary for at most 15 minutes and is removed after use
- the signed anonymous Lab token is held in JavaScript memory, not a cookie, and the server session expires after 30 minutes

The approved first-party counter is outside the browser. Nginx sends successful top-level document events to UDP `127.0.0.1:5514`; `api/visit-analytics.mjs` classifies only the homepage, privacy page, Creation Lab and four demos. It uses the address only as an in-memory key for one fixed clock-hour bucket. The address is never written, hashed, encrypted for later use or included in application logs. Query strings, user agents, request bodies and navigation histories are not collected.

At each closed hour the collector writes or updates one identifier-free JSONL record for that calendar day in `/var/lib/cosmos-analytics/visits-daily.jsonl`. Fields report total visits, visits reaching home, Lab, any demo, Lab plus demo, privacy, and each demo. Records are retained for 400 days; `npm run report:visits -- --days 7` computes the weekly view without creating hourly files. Shared addresses, bots, blocked `Sec-Fetch-Dest` headers and service restarts can cause under/over-counting, so these are directional product statistics rather than identity-grade analytics.

No consent banner is shown while this functional and strictly aggregate state remains true. If browser, third-party, marketing or any other non-technical tracker is approved later, it must remain unloaded by default, receive an equally accessible accept/reject choice without reload, support withdrawal, and be documented here and in `privacy.html` before release.

## Creation Lab Runtime Architecture

The active public demos are Document Operations, Orion Operations Hub, Secure Knowledge Assistant and KPI Studio. Each is an independent Vite entry and visual system. Shared code is limited to API contracts, localization, fixture data, knowledge policy and contact handoff.

Local and production topology:

```text
browser -> Vite/Nginx static dist/
        -> /api/* -> Node Fastify gateway on 127.0.0.1:8787
                     -> deterministic Python service on 127.0.0.1:8790
Nginx document access -> UDP 127.0.0.1:5514 -> in-memory hourly dedupe
                                                -> daily aggregate JSONL
```

The Node gateway mounts SMTP, signed anonymous lab sessions, request validation, authoritative workflow state and the provider-neutral AI gateway. Sessions are role-bound in server memory, HMAC-signed, capped at 2,000 active records, expire after 30 minutes and permit 25 successful actions. Mutations require an idempotency key; execution is serialized per session, failed work rolls back without consuming quota, and a duplicate key replays its original result.

`AI_MODE=fixture` is the only approved release behavior. OpenAI, Google Gemini, Anthropic Claude, xAI Grok and OpenRouter adapters are present behind the same contract and tested with mocked transports. Live execution additionally requires `AI_LIVE_ENABLED=true`; it must not be enabled without explicit user approval. Provider output is schema-validated and bounded, transport errors are normalized, retries are limited, and traces are redacted. No API keys or provider endpoints enter browser bundles.

Browser fixtures are enabled only by Vite development mode plus `fixtures` mode or `VITE_BROWSER_FIXTURES=true`. Use `npm run dev:fixtures` for a static exploratory fallback. Normal development and production builds expose service errors instead of silently masking a missing gateway or Python pipeline.

`scripts/e2e-stack.mjs` launches the real local Vite, Node and Python topology for Playwright. The browser matrix runs at 360, 768, 1024 and 1440 pixels and covers both languages, workflows, authorization, citations, validation, expired-session recovery, new-tab navigation, reduced motion and forbidden external AI traffic.

## Visual System

The visual direction is mystical future technology: alchemy, sacred geometry, digital transcendence, AI interfaces and professional software systems.

Base palette:

- `--dark-blue: #0b1026`
- `--dark-purple: #190a31`
- `--dark-violet: #25104f`

Supporting glow palette:

- `--indigo: #3f4fd8`
- `--violet: #6742d6`
- `--purple: #7a34d8`
- `--blue: #3f86e8`
- `--cyan: #70e4ff`

The site deliberately avoids yellow/gold accents. Dark-section headings use gradient text based on the violet, purple and blue family, with darker purple accents rather than pastel purple. Light-section titles use solid deep navy with restrained violet edge/shadow support for reliable contrast. Dark sections use translucent dark panels; light sections use translucent pearl/ice-blue panels. Cards, accordions, contact panels, form fields and major text clusters use restrained hover glow/shine feedback plus a controlled panel-background color shift.

The 3D version adds a dark-blue heading stroke, layered text shadows and light drop shadows around text clusters so copy appears suspended above the background and 3D layers. Dark backgrounds retain the blue/purple/violet gradient; luminous sections use the high-contrast deep-navy title treatment described above.

Header branding and the `sizes="any"` browser favicon in `index.html` both use `assets/cxm-logo.svg`, a compact vector sacred-geometry mark with the `cXm` initials. The shared SVG keeps the tab icon crisp without adding a duplicate asset; keep it vector-based for easy future edits.

## Background Asset System

Each major section has its own generated raster background image. These are blended with CSS gradients and sacred-geometry overlays through `::before` and `::after` pseudo-elements. Sections alternate dark/light by page position: dark on hero, services, process, FAQ and Portfolio; light on problems, entry offers, stack and contact. The overlays preserve readability while letting the image remain visibly present, and there are no borders between major sections.

Current assets:

- `assets/cosmos-hero.webp` for the hero
- `assets/section-problems-light.webp` for problems
- `assets/section-services.webp` for services
- `assets/section-entry-light.webp` for entry offers
- `assets/section-process.webp` for process
- `assets/section-stack-light.webp` for technologies
- `assets/section-faq.webp` for FAQ
- `assets/section-contact-light.webp` for contact
- `assets/section-portfolio.webp` for Portfolio
- `assets/portfolio/*.jpg` for the four verified demo screenshots
- `assets/concepts/cxm-symbol-concepts-01.png` is the numbered ten-object, three-view source sheet for the current procedural artifact families; it remains a design reference and is not loaded by the website

Section assignments are declared in CSS:

```css
.hero { --bg-img: url("assets/cosmos-hero.webp"); }
#problems { --bg-img: url("assets/section-problems-light.webp"); }
#services { --bg-img: url("assets/section-services.webp"); }
#entry { --bg-img: url("assets/section-entry-light.webp"); }
#process { --bg-img: url("assets/section-process.webp"); }
#stack { --bg-img: url("assets/section-stack-light.webp"); }
#faq { --bg-img: url("assets/section-faq.webp"); }
#contact { --bg-img: url("assets/section-contact-light.webp"); }
#portfolio { --bg-img: url("assets/section-portfolio.webp"); }
```

Desktop uses CSS `background-attachment: fixed` when supported to create a light parallax feeling between sections. Mobile uses normal scrolling for compatibility and performance.

## Layout System

The layout is intentionally small and custom instead of using Bootstrap or another framework.

Core classes:

- `.wrap`: centered max-width container
- `.grid`: base CSS grid
- `.grid-2`, `.grid-3`, `.grid-4`, `.grid-5`: responsive grid variants
- `.section`: major content band with image background
- `.section-head`: heading cluster
- `.card`: standard content card
- `.btn` and `.btn.primary`: action links/buttons
- `.service-card`: accordion details for services
- `.contact-card`: contact and form panels

Responsive behavior:

- Desktop uses multi-column grids.
- Below `980px`, larger grids collapse to two columns and nav stacks.
- Below `680px`, major grids collapse to one column and hero typography is reduced.

## Accessibility And Performance

Current accessibility decisions:

- Semantic `header`, `nav`, `main`, `section`, `footer`
- Real links for email and LinkedIn
- Keyboard-visible focus states
- Native `details/summary` accordions
- `prefers-reduced-motion` support
- Mobile-first responsive behavior

Performance notes:

- The deployed frontend is static output, but the complete product requires the private Node gateway for Gmail SMTP and lab sessions plus FastAPI for deterministic document/retrieval pipelines.
- Editable PNG backgrounds remain source assets; `npm run optimize:images` generates the nine runtime WebP files and compact Open Graph JPEG. The canonical background payload is about 2 MiB, roughly 90% smaller than its PNG sources.
- `scripts/build.mjs` excludes source PNGs and concepts from `dist/`, caps the complete distribution at 8 MiB, enforces per-bundle and screenshot budgets, and rejects private files, secret-like tokens or provider-network endpoints.
- Nginx enables gzip, ETags and seven-day caching for static assets; HTML remains revalidated. The homepage preloads the hero WebP.
- No analytics code is loaded in the browser; the only approved external frontend script is the pinned Three.js ES module.

## Future Evolution

Potential future changes that require user approval before implementation:

- adding native WebGL beyond Three.js, post-processing, model loaders, physics or heavier 3D tooling
- Browser, third-party or conversion tracking beyond the approved aggregate server counter
- Additional backend form handling, CRM writes or third-party form services beyond `api/contact.js`
- Dedicated service pages
- Blog/articles
- Additional public demos beyond 01, 02, 03 and 06
- Additional build systems beyond the approved Vite workspace

Keep `index.html` as the remote-authoritative homepage narrative. Portfolio pages remain independent build targets and must not import their framework bundles into the homepage.
