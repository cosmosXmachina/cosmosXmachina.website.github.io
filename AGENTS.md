# cosmosXmachina Website Agent Guide

## Project Vision

cosmosXmachina is the public service website and Creation Lab for a bilingual software engineer and digital automation consultant based in Treviso, Italy. It should convert visitors into conversations, audits, prototypes and project requests through the remote-approved homepage and inspectable synthetic systems.

The public brand is **cosmosXmachina**. `cosmos_business.md` remains the strategic source document, not the customer-facing brand name.

## Source Of Truth

Use these files in order:

1. `cosmos_interface.md` for the current website architecture, visual system, assets, contact wiring and implementation decisions.
2. `creation_lab_plan.md` for the portfolio architecture, active scope and deferred roadmap.
3. `cosmos_business.md` Section 17 for public services, profile copy and technology groups.
4. `cosmos_business.md` Section 18 for website strategy and architecture direction.
5. Current user instructions for new changes.

## Current Website Rules

- `index.html` is the production 3D version and canonical homepage inherited from `origin/main`.
- Portfolio is the ninth and final homepage section, after Contact, so the existing eight-background sequence remains unchanged.
- The Portfolio index publishes only demos 01, 02, 03 and 06. Deferred demos must not appear in Vite inputs, API allowlists or public cards.
- Homepage demo cards and the `Enter Creation Lab` action open a newly selected browser tab with `target="_blank" rel="noopener"`; the header Portfolio link remains an in-page anchor.
- `assets/design-modes.css` contains five approved visual preview modes selected by `?design=<slug>`; the named `index-*.html` files are thin redirect entry points and must not duplicate the site implementation.
- `index2D.html` is the older non-3D fallback/reference version.
- `index_temp.html` is scratch/experiment space and can be ignored unless the user explicitly asks about it.
- The homepage stack remains HTML, CSS, vanilla JavaScript, static image assets and the approved Three.js layer. Portfolio pages use React/Vite and the four public demos execute deterministic workflows entirely in the browser.
- `index.html` may load Three.js as a pinned CDN ES module for the approved 3D layer.
- Approved contact backend: `api/server.mjs`, which mounts the existing `api/contact.js` SMTP handler, aggregate analytics and dormant Lab compatibility routes. Production reads the external file selected by `COSMOS_ENV_FILE`; never put Gmail app passwords or SMTP secrets in releases, browser code or committed files.
- Production requires Apache plus the Node gateway and private Python service under systemd. Apache alone is public, serves only `/opt/cosmosxmachina/current/dist`, enforces the public route allowlist and proxies `/api/*` to loopback. Systemd pins private ports, fixture AI, memory limits and the approved loopback analytics listener; the preserved `.env` supplies secrets and allowed origins but cannot weaken those settings.
- Full tests, Playwright and builds run locally through `npm run release:build`. Production receives only its verified archive through SFTP. A root-owned cron activates the final `.ready` marker atomically, health-checks both services and rolls back failures. `deploy-production.sh` is the one-time Apache bootstrap/manual recovery entry point, not a routine build script; the retired Nginx procedure must never be used.
- Production must keep the real `/opt/.../.env`, existing Apache/Certbot vhosts and configured systemd unit names. Do not install npm dependencies, browsers, Git, Docker, Nginx or AI SDKs there. Keep at least 250 MiB free and do not approve the Node/Python topology below 512 MB RAM without reconsidering it.
- Public Creation Lab behavior is fixture-only and browser-executed. Active demos must make zero `/api/lab/*` or external-AI requests. Dormant Node/Python Lab routes and OpenAI, Google, Anthropic, xAI and OpenRouter adapters remain contract-tested compatibility code; live calls remain prohibited.
- `portfolio/shared/browser-runtime.js` owns bounded validation, synthetic 30-minute sessions, 25-action quotas, replay, rollback and reset. Operations Hub alone persists versioned synthetic state in IndexedDB; other demo state stays in memory or existing short-lived `sessionStorage` handoffs.
- Secure Knowledge Assistant uses a native browser inverted index. Its role filtering is an inspectable architectural demonstration, never a claim of real client-side authorization.
- Do not add further frameworks, third-party/browser analytics, AI providers or form backends without user approval.
- If a new technology is approved, update both this file and `cosmos_interface.md`.
- The About/Profile section has been removed and must not be reintroduced unless requested.
- The FAQ must not contain portfolio/demo questions or references.
- Real contact links are now approved: `davide.deon@gmail.com`, Italian LinkedIn `https://www.linkedin.com/in/vash-vacuum/`, English LinkedIn `https://www.linkedin.com/in/vash-vacuum/?locale=en_US`.
- Professional identity uses Italian VAT number `05637720268`, displayed as `P. IVA 05637720268` in Italian and `Italian VAT no. 05637720268` in English.
- Language selection priority is URL `?lang=it|en`, then saved `localStorage` value `cosmos-lang`, then browser/system language, then Italian fallback. Header language buttons must remove only the `lang` URL parameter and then save/render the clicked language.
- `privacy.html` is the bilingual privacy and local-technology notice. Link it from the homepage footer, Creation Lab footer and immediately beside the contact-form submission; the form acknowledgement is not consent.
- `robots.txt`, `sitemap.xml`, canonical links, `it`/`en`/`x-default` alternates, localized search/social metadata and truthful JSON-LD are release requirements. Existing public pages may be optimized, but do not invent service pages, articles, case studies, reviews or claims.
- Design-mode query URLs and named visual preview entries must remain `noindex,follow`; `index.html` is their canonical. Public language variants use self-canonical `?lang=it|en` URLs and the parameter-free URL is `x-default`.
- The release sets no cookies and loads no browser or third-party analytics, advertising, profiling, fingerprinting or tracking pixels. The approved first-party visit counter receives Apache document events over loopback, holds addresses only in a bounded RAM bucket for the fixed hour, and writes daily aggregate numbers only. Never persist or hash IP addresses, user agents, query strings, request bodies or per-visitor histories. Keep retention at 400 days unless the user approves a change.
- No consent banner is needed for the current functional storage and strictly aggregate server-side measurement. Any future client-side, third-party, marketing or cross-site tracker requires explicit approval and corresponding notice/consent changes before it loads.

## Visual Direction

The site uses a mystical future-technology aesthetic: alchemy, manifestation, sacred geometry, ascended universe, AI systems and digital transcendence, kept professional and readable.

Current main palette:

- dark blue: `#0b1026`
- dark purple: `#190a31`
- dark violet: `#25104f`
- supporting glow colors: darker indigo/violet/purple/blue and cyan

Do not return to yellow/gold accents. Purple text accents should stay relatively dark, not pastel. Major sections alternate between dark generated backgrounds and luminous pearl/ice-blue sacred-geometry backgrounds; overlays should not hide the images too much and no visible divider may interrupt the transition between sections.

The `index.html` dark-title treatment uses a `2px` near-black outline, restrained internal shadow and subtle blue/cyan downward drop shadows so gradient headings feel lifted while staying readable. Light-section titles retain their high-contrast deep-navy treatment and reuse only the blue/cyan depth filter. Its header and SVG favicon use `assets/cxm-logo.svg`, a small sacred-geometry `cXm` mark. Keep the logo vector-editable unless the user asks for a raster image.

The 3D version should use solid procedural sacred-geometry structures layered between section background images and text. It renders exactly two structures per active section with one reusable Three.js canvas. Place them in responsive side rails outside the central `.wrap`; when side rails are too narrow, move them into reserved top/bottom section padding and scale them to remain inside the page without crossing the content zone. Avoid visible circular rings, orbital halos, circular platforms or outward ray-burst elements. Keep object counts restrained, respect reduced-motion preferences and avoid heavy post-processing.

`index.html` 3D motion/effects rules:

- Use the ten approved low-poly artifact families built from Three.js primitives: Fire Tetra Crown, Earth Cubic Vault, Air Octa Engine, Water Icosa Bloom, Aether Dodeca Core, Azoth Merkaba, Philosopher Gate, Hermetic Prism, Celestial Sigil and Prima Materia.
- The concept sheet is a visual reference only; runtime objects remain procedural and use the shared shader, not raster textures or external models.
- Give nested layers varied approved blue, dark purple, dark violet, indigo, violet and cyan colors.
- Use always-moving multicolor wave bands and soft glow as the base state.
- On hover, use raycasting to increase glow and speed up metallic rainbow interference, without adding ray-burst geometry.
- Rotate objects with randomized changing axes/directions every few seconds; do not return to a single fixed vertical spin.
- Cards, accordions, contact panels and major text clusters should gain a restrained glow/shine response plus a visible but controlled panel-background color shift on hover while preserving readability and layout stability.
- Runtime section backgrounds use optimized WebP assets. Keep source PNGs editable, regenerate with `npm run optimize:images`, and preserve the build's distribution, secret and asset budgets.

## Maintenance Rules

- Keep code lean, readable and static.
- Keep bilingual Italian/English content complete and aligned.
- Italian remains the priority market language.
- Do not invent claims, testimonials or client results. Every Creation Lab page must identify itself as a professional demonstration using synthetic Orion Works data.
- Public copy must credit Davide Deon/Vash as designer and builder and must never imply that the website or demos were AI-coded. Synthetic-data and simulated-provider disclosures describe runtime behavior, not authorship, and must remain accurate.
- Preserve accessibility basics: semantic sections, readable contrast, focus states, mobile-first layout and reduced-motion support.
- When changing visual style, start with CSS variables and section background assignments in `index.html`.
- When changing content, update the bilingual `copy` object in `index.html`; only mirror to `index2D.html` if the user explicitly wants the fallback version maintained.
- During an active Codex goal, report goal tokens used, remaining budget and elapsed time at major checkpoints. Treat account-level weekly usage as user-reported because it is not programmatically available, and surface any blocking tool or approval state immediately.
