# cosmosXmachina Website

Bilingual 3D website and **cosmosXmachina Creation Lab**. The remote `index.html` remains the canonical homepage; the final section links to four independently designed, deterministic browser demonstrations. Production uses a static Vite build, with private Node/Python services preserved for contact, analytics and compatibility.

## Current Files

- `index.html`: canonical production homepage with the approved Three.js symbol layer.
- `assets/design-modes.css`: shared styling for five optional design directions.
- `index-hermetic-observatory.html`, `index-prismatic-glass-atelier.html`, `index-arcane-editorial-codex.html`, `index-digital-cathedral.html`, `index-transmutation-system-map.html`: named preview entry points that redirect to the canonical page with a `design` parameter.
- `index2D.html`: older non-3D fallback/reference page.
- `index_temp.html`: scratch/experiment page; ignore it unless intentionally testing something.
- `assets/`: editable generated background sources, optimized runtime WebP files, verified demo previews and the shared `cxm-logo.svg` header/favicon mark.
- `portfolio/`: Creation Lab index and active demos 01, 02, 03 and 06.
- `api/server.mjs`: private Node gateway for SMTP, aggregate analytics and dormant Lab compatibility routes.
- `api/visit-analytics.mjs`: private cookie-free aggregate visit counter; no visitor identifier is written.
- `python_service/`: retained private deterministic pipeline compatibility service; public demos do not call it.
- `robots.txt` and `sitemap.xml`: crawler policy and bilingual public-route discovery.
- `package.json` and `vite.config.js`: the build and test workspace.
- `AGENTS.md`: short operating guide for future agents.
- `cosmos_interface.md`: detailed architecture and implementation notes.
- `installation.md`: local setup plus the canonical Apache/SFTP production procedure.

## Local Preview

Install dependencies and build `dist/` as described in `installation.md`:

```bash
npm ci
npm run optimize:images
npm run build
npm run preview
```

`npm run preview` is sufficient for all four demos. `npm run serve:local` additionally runs Node on `127.0.0.1:8787` and Python on `127.0.0.1:8790` when testing contact, analytics or dormant compatibility routes.

## Static Hosting Notes

- Keep asset paths relative, such as `assets/cxm-logo.svg`.
- File names are case-sensitive on GitHub Pages.
- The 3D version loads Three.js from the pinned CDN URL documented in `cosmos_interface.md`.
- A static host can run every Creation Lab demo, but it cannot provide Gmail SMTP or aggregate server-side analytics.
- Production uses Apache to serve only a prebuilt, verified `dist/` release and proxy `/api/*` to private loopback services.
- Public pages expose canonical, Italian/English/automatic-language alternates, localized social metadata and truthful structured data. Design previews remain `noindex`.
- Homepage demo cards and `Enter Creation Lab` open their destination in a new selected tab; the homepage remains open in its original tab.
- Never publish the repository root, `.env`, private profiles, plans or keys.
- For a custom domain, add it in **Settings > Pages** and create the DNS records GitHub requests.

## Contact Form SMTP Endpoint

`index.html` posts the project intake form to `/api/contact`. The required production endpoint is exposed by `api/server.mjs`, which reuses the SMTP handler in `api/contact.js`. Creation Lab workflows do not use this endpoint or any `/api/lab/*` route.

Apache proxies `/api/*` to the private Node service on the same server. If the endpoint is missing or unavailable, the form only falls back to a prepared `mailto:` email; that fallback is not the SMTP mail system.

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

## Apache Production Releases And Visit Statistics

Build and test on the development machine with `npm run release:build`. A one-time privileged `deploy-production.sh` bootstrap reuses the real external `.env`, Apache/Certbot vhosts and existing systemd unit names. After that, routine releases upload the archive, checksum and final `.ready` marker through SFTP; cron verifies, atomically activates, health-checks and rolls back without SSH. See `installation.md` before operating production.

Never publish the repository root. Apache serves only `/opt/cosmosxmachina/current/dist`, enforces a strict route allowlist and keeps ports `8787` and `8790` private. Production does not install npm dependencies, browsers, test tools, Nginx, Docker or AI SDKs.

Production uses no browser or third-party analytics. Apache sends successful top-level document events over loopback to the Node process; addresses exist only in the bounded in-memory hourly bucket. The disk file contains one identifier-free aggregate record per day and retains at most 400 days. To inspect a locally copied report file:

```bash
npm run report:visits -- --file /path/to/visits-daily.jsonl --days 7
```

After first deployment, verify the domain in Google Search Console and Bing Webmaster Tools and submit `https://cosmos-x-machina.it/sitemap.xml`. See `installation.md` for the exact production and search-discovery procedure.
