# cosmos_interface.md

## Purpose

This file documents the architecture, technologies, visual system and implementation decisions for the cosmosXmachina website. It is the main technical interface document for future agents or developers. `AGENTS.md` is the concise operating rule sheet; this file explains how the website is built and how to evolve it.

## Current Build

- Main file: `index.html`
- Legacy/reference 2D file: `index2D.html`
- Scratch/experiment file: `index_temp.html`, ignored unless explicitly needed
- Asset folder: `assets/`
- README: `README.md` documents GitHub Pages publishing
- Installation guide: `installation.md` documents dependencies, fresh-machine setup and contact endpoint deployment
- Hosting target: GitHub Pages static hosting
- Architecture: single-page website based on `cosmos_business.md` Section 18.5, variant 1
- Languages: Italian and English, switched client-side
- Current base tech stack: HTML, CSS, vanilla JavaScript, static image assets
- Additional approved technology for `index.html`: Three.js loaded as a pinned CDN ES module
- Approved contact backend: `api/contact.js`, a no-dependency Node SMTP endpoint that sends the project intake form through Gmail SMTP using the project `.env` file
- No build step, framework, package manager or analytics is currently approved

Any new technology beyond the static stack, the approved `index.html` Three.js layer and the approved contact endpoint must be approved by the user first, then documented in both `AGENTS.md` and this file.

## Public Brand And Contacts

Public brand: `cosmosXmachina`

Real contacts currently wired into the site:

- Email: `davide.deon@gmail.com`
- Italian LinkedIn: `https://www.linkedin.com/in/vash-vacuum/`
- English LinkedIn: `https://www.linkedin.com/in/vash-vacuum/?locale=en_US`

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
10. Footer

The About/Profile section was intentionally removed. There is no demo, portfolio or case-study section, and the FAQ no longer references portfolio/demo content.

## File Variants

`index.html` is the canonical production homepage and includes the approved Three.js solid sacred-geometry layer. GitHub Pages serves this file at the site root.

`index2D.html` is the older non-3D fallback/reference page. Do not treat it as the main implementation unless the user asks to restore or maintain the 2D version.

`index_temp.html` is scratch/experiment space and can be ignored unless the user explicitly asks about it.

The 3D version imports Three.js as a pinned ES module:

```js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js";
```

The 3D layer:

- uses one transparent `<canvas class="alchemy-3d">`
- renders four solid procedural structures per major section
- places symbols between generated section background images and text
- uses section-specific negative-space placement profiles so structures fill open areas and avoid sitting under dense text, cards or the contact form where possible
- uses different structure pairings per section
- moves the same renderer/canvas into the currently active section instead of creating many WebGL contexts
- contains no visible circular 3D rings, orbital halos or circular platforms; edge outlines must follow the solid geometry itself
- uses varied colors per nested layer from the approved blue, dark purple, dark violet, indigo, violet and cyan family
- uses always-moving multicolor wave bands and additive soft glow as the base visual state
- reacts to pointer hover through raycasting, stronger glow, faster wave motion and metallic rainbow interference across faceted surfaces
- rotates with randomized changing axes and directions every 2.5-5 seconds instead of a single fixed vertical spin
- disables itself for `prefers-reduced-motion: reduce`

Current Three.js section sets:

- Hero: portal diamond, merkaba, nested sigil and prism tower
- Problems: nested sigil, prism tower, portal diamond and merkaba
- Services: merkaba, portal diamond, nested sigil and prism tower
- Entry offers: prism tower, nested sigil, merkaba and portal diamond
- Process: portal diamond, prism tower, nested sigil and merkaba
- Stack: nested sigil, merkaba, portal diamond and prism tower
- FAQ: portal diamond, nested sigil, prism tower and merkaba
- Contact: prism tower, merkaba, portal diamond and nested sigil

Current procedural builders:

- `createMerkaba()`: dual tetrahedrons, inner octahedrons, small diamond and a thin angular crystal core
- `createPrismTower()`: faceted hex prism, top crystal cap, inner shard and tiered angular base
- `createNestedSigil()`: stacked octahedron, icosahedron, tetrahedron and vertical angular core
- `createPortalDiamond()`: tall faceted octahedron/diamond with inner cone/tetrahedron layers and side shards

Keep the 3D implementation compact. Avoid post-processing passes, GLTF assets, texture loading, physics engines or many WebGL renderers unless the user explicitly approves a heavier 3D direction.

## Content Architecture

All visible bilingual content lives in the `copy` object inside the inline script in `index.html`.

The `render(lang)` function:

- sets `document.documentElement.lang`
- updates the page title
- replaces all `[data-i18n]` text
- renders runes, problem cards, services, entry offers, process cards, stack groups, FAQ and trust notes
- switches the LinkedIn URL and label by language
- updates form select options and placeholders
- stores the chosen language in `localStorage` under `cosmos-lang`

Initial language selection is resolved before `render()` with this priority:

1. valid URL parameter `?lang=it` or `?lang=en`
2. saved `localStorage` value `cosmos-lang`
3. browser/system language from `navigator.languages` or `navigator.language`
4. Italian fallback

The header language buttons still call `render(lang)`, but first remove only the `lang` URL parameter with `history.replaceState`, preserving other query parameters and the hash. Manual button choice therefore overrides URL language and becomes the new saved preference.

The form submit handler:

- prevents default submission
- reads the active language
- serializes the project intake fields
- ignores spam-trap submissions with the hidden `company` field
- posts the intake fields to `CONTACT_ENDPOINT` as JSON
- shows bilingual sending/success/fallback status text
- opens a `mailto:` URL with encoded subject and body if the SMTP endpoint is unavailable

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

The site deliberately avoids yellow/gold accents. Headings use gradient text based on the violet, purple and blue family, with darker purple accents rather than pastel purple. Cards use translucent dark panels with blur and light borders.

The 3D variant adds a dark-blue heading stroke, layered text shadows and light drop shadows around text clusters so copy appears suspended above the background and 3D layers. The heading gradient now includes a controlled dark-blue band alongside white, blue, purple and violet.

Header branding in `index.html` uses `assets/cxm-logo.svg`, a compact vector sacred-geometry mark with the `cXm` initials. Keep it as SVG for crisp display and easy future edits.

## Background Asset System

Each major section has its own generated raster background image. These are blended with CSS gradients and sacred-geometry overlays through `::before` and `::after` pseudo-elements. The overlays should preserve readability while letting the image remain visibly present.

Current assets:

- `assets/cosmos-hero.png` for the hero
- `assets/section-problems.png` for problems
- `assets/section-services.png` for services
- `assets/section-entry.png` for entry offers
- `assets/section-process.png` for process
- `assets/section-stack.png` for technologies
- `assets/section-faq.png` for FAQ
- `assets/section-contact.png` for contact

Section assignments are declared in CSS:

```css
.hero { --bg-img: url("assets/cosmos-hero.png"); }
#problems { --bg-img: url("assets/section-problems.png"); }
#services { --bg-img: url("assets/section-services.png"); }
#entry { --bg-img: url("assets/section-entry.png"); }
#process { --bg-img: url("assets/section-process.png"); }
#stack { --bg-img: url("assets/section-stack.png"); }
#faq { --bg-img: url("assets/section-faq.png"); }
#contact { --bg-img: url("assets/section-contact.png"); }
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

- The frontend remains static. Gmail SMTP delivery requires the `api/contact.js` Node endpoint; pure GitHub Pages hosting can only use the `mailto:` backup unless the endpoint is deployed elsewhere.
- Background images are large PNG files. If performance becomes an issue, convert them to optimized WebP/AVIF while keeping fallbacks or updating references.
- No analytics are loaded; the only approved external frontend script is the pinned Three.js ES module.

## Future Evolution

Potential future changes that require user approval before implementation:

- adding native WebGL beyond Three.js, post-processing, model loaders, physics or heavier 3D tooling
- Analytics or conversion tracking
- Additional backend form handling, CRM writes or third-party form services beyond `api/contact.js`
- Dedicated service pages
- Blog/articles
- Case studies, demos or portfolio content
- A build system such as Astro, Next.js or Vite

If the site grows beyond one page, keep `index.html` as the homepage narrative and move repeated content into data files or a static-site framework only after approval.
