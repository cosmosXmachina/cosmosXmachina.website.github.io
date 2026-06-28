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
- `index.html` is the static production version.
- `index3d.html` is the approved experimental Three.js version and must remain separate from `index.html`.
- The base approved stack is HTML, CSS, vanilla JavaScript and static image assets.
- `index3d.html` may load Three.js as a pinned CDN ES module.
- Approved contact backend: `api/contact.js`, a no-dependency Node SMTP endpoint for the project intake form. It sends through Gmail SMTP using the project `.env` file only. Never put Gmail app passwords or SMTP secrets in `index.html` or any committed file.
- GitHub Pages alone cannot execute `api/contact.js`; deploy the endpoint on a Node/serverless host or serve the site from a platform that supports `/api/contact`. Keep the `mailto:` fallback in `index.html`.
- Do not add frameworks, package managers, external CSS/JS libraries beyond the approved Three.js import in `index3d.html`, analytics or additional form backends without user approval.
- If a new technology is approved, update both this file and `cosmos_interface.md`.
- The About/Profile section has been removed and must not be reintroduced unless requested.
- The FAQ must not contain portfolio/demo questions or references.
- Real contact links are now approved: `davide.deon@gmail.com`, Italian LinkedIn `https://www.linkedin.com/in/vash-vacuum/`, English LinkedIn `https://www.linkedin.com/in/vash-vacuum/?locale=en_US`.

## Visual Direction

The site uses a mystical future-technology aesthetic: alchemy, manifestation, sacred geometry, ascended universe, AI systems and digital transcendence, kept professional and readable.

Current main palette:

- dark blue: `#0b1026`
- dark purple: `#190a31`
- dark violet: `#25104f`
- supporting glow colors: darker indigo/violet/purple/blue and cyan

Do not return to yellow/gold accents. Purple text accents should stay relatively dark, not pastel. Each major section has its own generated background image, with CSS sacred-geometry overlays to create movement and section-to-section transition while scrolling; overlays should not hide the generated images too much.

The `index3d.html` text treatment uses dark-blue outline/shadow support so headings and key copy feel lifted from the animated background layers while staying readable. Its header uses `assets/cxm-logo.svg`, a small sacred-geometry `cXm` mark. Keep the logo vector-editable unless the user asks for a raster image.

The 3D version should use solid procedural sacred-geometry structures layered between section background images and text. It renders exactly four structures per active section with one reusable Three.js canvas, places them in negative-space areas around text/cards, and must avoid visible circular rings, orbital halos, circular platforms or outward ray-burst elements in the 3D objects. Keep object counts restrained, respect reduced-motion preferences and avoid heavy post-processing.

`index3d.html` motion/effects rules:

- Use solid nested geometry only: merkaba, prism tower, nested sigil and portal diamond variants built from Three.js primitives.
- Give nested layers varied approved blue, dark purple, dark violet, indigo, violet and cyan colors.
- Use always-moving multicolor wave bands and soft glow as the base state.
- On hover, use raycasting to increase glow and speed up metallic rainbow interference, without adding ray-burst geometry.
- Rotate objects with randomized changing axes/directions every few seconds; do not return to a single fixed vertical spin.

## Maintenance Rules

- Keep code lean, readable and static.
- Keep bilingual Italian/English content complete and aligned.
- Italian remains the priority market language.
- Do not invent claims, testimonials, client results, demos or case studies.
- Preserve accessibility basics: semantic sections, readable contrast, focus states, mobile-first layout and reduced-motion support.
- When changing visual style, start with CSS variables and section background assignments in `index.html` and mirror intentional changes into `index3d.html` when appropriate.
- When changing content, update the bilingual `copy` object in both page variants when appropriate.
