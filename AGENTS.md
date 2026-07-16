# cosmosXmachina Website Agent Guide

## Project Vision

cosmosXmachina is the public service website for a bilingual software engineer and digital automation consultant based in Treviso, Italy. It should convert visitors into conversations, audits, prototypes and project requests for custom software, AI automation, internal tools, dashboards, APIs, e-commerce systems, websites, maintenance and digital products.

The public brand is **cosmosXmachina**. `cosmos_business.md` remains the strategic source document, not the customer-facing brand name.

## Source Of Truth

Use these files in order:

1. `cosmos_interface.md` for the current website architecture, visual system, assets, contact wiring and implementation decisions.
2. `cosmos_business.md` Section 17 for public services, profile copy and technology groups.
3. `cosmos_business.md` Section 18 for website strategy and architecture direction.
4. Current user instructions for new changes.

## Current Website Rules

- The site is a single-page GitHub Pages website in `index.html`.
- `index.html` is the production 3D version and the canonical homepage.
- `assets/design-modes.css` contains five approved visual preview modes selected by `?design=<slug>`; the named `index-*.html` files are thin redirect entry points and must not duplicate the site implementation.
- `index2D.html` is the older non-3D fallback/reference version.
- `index_temp.html` is scratch/experiment space and can be ignored unless the user explicitly asks about it.
- The base approved stack is HTML, CSS, vanilla JavaScript and static image assets.
- `index.html` may load Three.js as a pinned CDN ES module for the approved 3D layer.
- Approved contact backend: `api/contact.js`, a no-dependency Node SMTP endpoint for the project intake form. It sends through Gmail SMTP using the project `.env` file only. Never put Gmail app passwords or SMTP secrets in `index.html` or any committed file.
- GitHub Pages alone cannot execute `api/contact.js`; deploy the endpoint on a Node/serverless host or serve the site from a platform that supports `/api/contact`. Keep the `mailto:` fallback in `index.html`.
- Do not add frameworks, package managers, external CSS/JS libraries beyond the approved Three.js import in `index.html`, analytics or additional form backends without user approval.
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

## Maintenance Rules

- Keep code lean, readable and static.
- Keep bilingual Italian/English content complete and aligned.
- Italian remains the priority market language.
- Do not invent claims, testimonials, client results, demos or case studies.
- Preserve accessibility basics: semantic sections, readable contrast, focus states, mobile-first layout and reduced-motion support.
- When changing visual style, start with CSS variables and section background assignments in `index.html`.
- When changing content, update the bilingual `copy` object in `index.html`; only mirror to `index2D.html` if the user explicitly wants the fallback version maintained.
