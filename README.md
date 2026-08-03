# cosmosXmachina Website

Bilingual 3D website and **cosmosXmachina Creation Lab**. The remote `index.html` remains the canonical homepage; the final section links to four independently designed portfolio demonstrations. Production uses a static Vite build plus required private Node and Python services.

## Current Files

- `index.html`: canonical production homepage with the approved Three.js symbol layer.
- `assets/design-modes.css`: shared styling for five optional design directions.
- `index-hermetic-observatory.html`, `index-prismatic-glass-atelier.html`, `index-arcane-editorial-codex.html`, `index-digital-cathedral.html`, `index-transmutation-system-map.html`: named preview entry points that redirect to the canonical page with a `design` parameter.
- `index2D.html`: older non-3D fallback/reference page.
- `index_temp.html`: scratch/experiment page; ignore it unless intentionally testing something.
- `assets/`: editable generated background sources, optimized runtime WebP files, verified demo previews and the shared `cxm-logo.svg` header/favicon mark.
- `portfolio/`: Creation Lab index and active demos 01, 02, 03 and 06.
- `api/server.mjs`: required private Node gateway for SMTP, lab sessions and workflow routing.
- `api/visit-analytics.mjs`: private cookie-free aggregate visit counter; no visitor identifier is written.
- `python_service/`: private deterministic document and retrieval pipelines.
- `robots.txt` and `sitemap.xml`: crawler policy and bilingual public-route discovery.
- `package.json` and `vite.config.js`: the build and test workspace.
- `AGENTS.md`: short operating guide for future agents.
- `cosmos_interface.md`: detailed architecture and implementation notes.
- `installation.md`: dependencies, fresh-machine setup and run/deploy checklist.

## Local Preview

Install the Node and Python dependencies, build `dist/`, and run the three local processes described in `installation.md`:

```bash
npm install
npm run optimize:images
npm run build
npm run preview
```

The complete local topology also runs `api/server.mjs` on `127.0.0.1:8787` and `python_service/server.py` on `127.0.0.1:8790`.

## Static Hosting Notes

- Keep asset paths relative, such as `assets/cxm-logo.svg`.
- File names are case-sensitive on GitHub Pages.
- The 3D version loads Three.js from the pinned CDN URL documented in `cosmos_interface.md`.
- GitHub Pages can host only a static preview. It cannot provide Gmail SMTP or the private lab services.
- The default production deployment builds and serves `dist/` through Nginx on the registered domain.
- Public pages expose canonical, Italian/English/automatic-language alternates, localized social metadata and truthful structured data. Design previews remain `noindex`.
- Homepage demo cards and `Enter Creation Lab` open their destination in a new selected tab; the homepage remains open in its original tab.
- Never publish the repository root, `.env`, private profiles, plans or keys.
- For a custom domain, add it in **Settings > Pages** and create the DNS records GitHub requests.

## Contact Form SMTP Endpoint

`index.html` posts the project intake form to `/api/contact`. The required production endpoint is exposed by `api/server.mjs`, which reuses the SMTP handler in `api/contact.js` and also serves the Creation Lab API.

Nginx proxies `/api/*` to the private Node service on the same server. If the endpoint is missing or unavailable, the form only falls back to a prepared `mailto:` email; that fallback is not the SMTP mail system.

Create `.env` from `.env.example` and fill these keys on the machine or host that runs `api/contact.js`:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=davide.deon@gmail.com
SMTP_PASS=your_gmail_app_password_without_spaces
MAIL_FROM=davide.deon@gmail.com
MAIL_TO=davide.deon@gmail.com
ALLOWED_ORIGIN=http://127.0.0.1:4173,http://localhost:4173
PORT=8787
```

Never commit the Gmail app password. Use `.env.example` as the template and keep real `.env` files local or deployed only on the endpoint host.

## Production And Visit Statistics

On Ubuntu/Debian, run `sudo bash deploy-production.sh` from the repository root. It preserves `.env` and existing Certbot TLS, tests the complete local topology, builds and scans `dist/`, installs the private services, refreshes Nginx and verifies the release before reporting success.

Production uses no browser or third-party analytics. Nginx sends successful document events over loopback to the Node process; addresses exist only in the current in-memory hourly bucket. The disk file contains one identifier-free aggregate record per day and retains at most 400 days. From the repository root:

```bash
sudo -u www-data npm run report:visits -- --days 7
```

After first deployment, verify the domain in Google Search Console and Bing Webmaster Tools and submit `https://cosmos-x-machina.it/sitemap.xml`. See `installation.md` for the exact production and search-discovery procedure.
