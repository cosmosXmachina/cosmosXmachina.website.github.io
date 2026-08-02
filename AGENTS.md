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
- The homepage stack remains HTML, CSS, vanilla JavaScript, static image assets and the approved Three.js layer. Portfolio pages use React/Vite, while private deterministic pipelines use Node and FastAPI.
- `index.html` may load Three.js as a pinned CDN ES module for the approved 3D layer.
- Approved contact backend: `api/server.mjs`, which mounts the existing `api/contact.js` SMTP handler and the lab routes. It reads the project `.env` file only. Never put Gmail app passwords or SMTP secrets in browser code or committed files.
- Production requires the Node gateway and private Python service under systemd, with Nginx serving only `dist/` and proxying `/api/*` to loopback.
- Public AI behavior is fixture-only. Dormant OpenAI, Google, Anthropic, xAI and OpenRouter adapters are contract-tested with mocked transports; live calls require both `AI_MODE=live` and `AI_LIVE_ENABLED=true` and remain prohibited until the user explicitly approves activation.
- Browser fixtures are development-only (`npm run dev:fixtures`). Production builds must expose service failures and must never silently substitute browser fixtures.
- Do not add further frameworks, analytics, AI providers or form backends without user approval.
- If a new technology is approved, update both this file and `cosmos_interface.md`.
- The About/Profile section has been removed and must not be reintroduced unless requested.
- The FAQ must not contain portfolio/demo questions or references.
- Real contact links are now approved: `davide.deon@gmail.com`, Italian LinkedIn `https://www.linkedin.com/in/vash-vacuum/`, English LinkedIn `https://www.linkedin.com/in/vash-vacuum/?locale=en_US`.
- Language selection priority is URL `?lang=it|en`, then saved `localStorage` value `cosmos-lang`, then browser/system language, then Italian fallback. Header language buttons must remove only the `lang` URL parameter and then save/render the clicked language.

## Visual Direction

The site uses a mystical future-technology aesthetic: alchemy, manifestation, sacred geometry, ascended universe, AI systems and digital transcendence, kept professional and readable.

Current main palette:

- dark blue: `#0b1026`
- dark purple: `#190a31`
- dark violet: `#25104f`
- supporting glow colors: darker indigo/violet/purple/blue and cyan

Do not return to yellow/gold accents. Purple text accents should stay relatively dark, not pastel. Major sections alternate between dark generated backgrounds and luminous pearl/ice-blue sacred-geometry backgrounds; overlays should not hide the images too much and no visible divider may interrupt the transition between sections.

The `index.html` text treatment uses dark-blue outline/shadow support so headings and key copy feel lifted from the animated background layers while staying readable. Light-section titles use a high-contrast deep navy treatment with subtle violet support. Its header and SVG favicon use `assets/cxm-logo.svg`, a small sacred-geometry `cXm` mark. Keep the logo vector-editable unless the user asks for a raster image.

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
- Do not invent claims, testimonials or client results. Every Creation Lab page must identify itself as a self-directed demonstration using synthetic Orion Works data.
- Preserve accessibility basics: semantic sections, readable contrast, focus states, mobile-first layout and reduced-motion support.
- When changing visual style, start with CSS variables and section background assignments in `index.html`.
- When changing content, update the bilingual `copy` object in `index.html`; only mirror to `index2D.html` if the user explicitly wants the fallback version maintained.
- During an active Codex goal, report goal tokens used, remaining budget and elapsed time at major checkpoints. Treat account-level weekly usage as user-reported because it is not programmatically available, and surface any blocking tool or approval state immediately.
