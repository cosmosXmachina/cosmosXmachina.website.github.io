# Installation and Deployment

## Production Machine: Start Here

This is the handoff procedure for a person or Codex agent operating inside the uploaded repository on the Ubuntu/Debian production machine.

1. Read `AGENTS.md` and `cosmos_interface.md`, then confirm the shell is in the repository root containing `deploy-production.sh`, `package-lock.json` and `.env.example`.
2. Preserve an existing project-root `.env`; never replace it with the template. On a first installation, either let the script create it or copy `.env.example` to `.env` first and enter the real Gmail app password in `SMTP_PASS`.
3. Run the autonomous installer from the repository root:

   ~~~bash
   sudo bash deploy-production.sh
   ~~~

4. Do not report success until the script reaches `Production installation completed`. Before that message it installs OS, Node and Python dependencies; preserves/configures `.env`; runs all frontend, Node, Python and four-viewport Playwright tests; builds and scans an isolated release; activates `dist/`; installs and enables systemd services; configures Nginx, SEO files and aggregate visit statistics; and verifies the private and public routes.
5. If the script fails, use the reported line plus:

   ~~~bash
   journalctl -u cosmos-contact.service -u cosmos-lab-python.service -n 100 --no-pager
   nginx -t
   ~~~

   Fix the cause and rerun the same idempotent script. It keeps `.env` and uses the tracked Nginx merger to preserve an existing TLS certificate configuration while refreshing managed delivery and visit-count rules.
6. On a first deployment, point DNS to the server and run the Certbot command printed by the script. Ports `8787` and `8790` must remain private; only Nginx should be public.
7. Verify `https://cosmos-x-machina.it/`, `/privacy.html`, `/portfolio/`, all four demos, `/robots.txt`, `/sitemap.xml` and one real contact-form submission. The release remains `AI_MODE=fixture` and `AI_LIVE_ENABLED=false`.

For later code uploads, run `sudo bash deploy-production.sh` again. The script always validates the complete uploaded revision before it restarts the persistent services, and keeps the previous `dist/` in `.dist.previous` for manual rollback diagnosis.

Uploading or pulling repository source alone does **not** activate that revision. Nginx continues serving the existing `dist/`, and the already-running Node/Python processes keep their previously loaded code until the installer builds, swaps and restarts them. Do not manually replace only `dist/`: a new frontend paired with old private services is an unverified mixed release.

This is the supported setup guide for the cosmosXmachina homepage and Creation Lab. The approved product specification is in creation_lab_plan.md.

The active public release contains demos 01, 02, 03 and 06 only. The other roadmap concepts are not built, served or exposed by the API.

The complete production site requires Nginx, Node.js, and Python. The Node endpoint is required: it provides Gmail SMTP delivery, anonymous lab sessions, workflow validation, and access to the private Python pipelines.

.env is the only application runtime configuration source. Do not add alternate environment-file names, systemd EnvironmentFile entries, JSON configuration, or browser-exposed secrets.

## Dependencies

Development and production:

- Git
- Node.js 22.5 or newer
- npm
- Python 3.11 or newer
- Python venv and pip

Production only:

- Nginx
- systemd
- Certbot for HTTPS
- `iproute2` for the private UDP listener verification

Development or CI only:

- Playwright Chromium for browser tests

Not required in production:

- Docker
- PostgreSQL
- Redis
- Java
- an AI-provider account or key

## Runtime Configuration

Create the real file from the tracked template:

~~~powershell
Copy-Item .env.example .env
~~~

Linux:

~~~bash
cp .env.example .env
chmod 600 .env
~~~

Fill every value in .env. For Gmail SMTP, use the generated Google app password without spaces.

Local example:

~~~text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=davide.deon@gmail.com
SMTP_PASS=replace_with_real_app_password
MAIL_FROM=davide.deon@gmail.com
MAIL_TO=davide.deon@gmail.com
ALLOWED_ORIGIN=http://127.0.0.1:4173,http://localhost:4173
PORT=8787
LAB_MODE=fixture
LAB_SESSION_SECRET=replace_with_at_least_24_random_characters
PYTHON_LAB_URL=http://127.0.0.1:8790
PYTHON_LAB_PORT=8790
AI_MODE=fixture
AI_DEFAULT_PROVIDER=openai
AI_ALLOWED_PROVIDERS=openai,google,anthropic,xai,openrouter
AI_REQUEST_TIMEOUT_MS=12000
AI_MAX_OUTPUT_TOKENS=1200
AI_LIVE_ENABLED=false
VISIT_ANALYTICS_ENABLED=false
VISIT_ANALYTICS_HOST=127.0.0.1
VISIT_ANALYTICS_PORT=5514
VISIT_ANALYTICS_FILE=/var/lib/cosmos-analytics/visits-daily.jsonl
VISIT_ANALYTICS_TIMEZONE=Europe/Rome
VISIT_ANALYTICS_RETENTION_DAYS=400
~~~

Production overrides:

~~~text
ALLOWED_ORIGIN=https://cosmos-x-machina.it,https://www.cosmos-x-machina.it
VISIT_ANALYTICS_ENABLED=true
~~~

Generate LAB_SESSION_SECRET on the server:

~~~bash
openssl rand -hex 32
~~~

Version 1 has no AI credential and must keep `AI_MODE=fixture` with `AI_LIVE_ENABLED=false`. The five dormant provider adapters are mock-tested only. Never put an AI key in browser code or dist/.

## Local Setup

From the repository root:

~~~powershell
npm install
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -r python_service\requirements.txt
npm run build
~~~

Run `npm run optimize:images` only when the editable PNG background sources change. It regenerates the canonical WebP assets and social-preview JPEG with the installed Playwright Chromium runtime.

Start these commands in three terminals:

~~~powershell
.\.venv\Scripts\python python_service\server.py
~~~

~~~powershell
npm start
~~~

~~~powershell
npm run preview
~~~

Open:

- http://127.0.0.1:4173/
- http://127.0.0.1:4173/portfolio/
- http://127.0.0.1:8787/api/lab/health

The homepage and demos are served from dist/. The Node and Python services remain private on 127.0.0.1.

The browser demos contain a deterministic fixture fallback only under `npm run dev:fixtures`. Normal development and production builds expose backend failures; the Node gateway and Python process must both run when testing the production topology.

## Local Tests

~~~powershell
npm test
npm run build
npm run test:e2e
~~~

Playwright browsers are installed once with:

~~~powershell
npx playwright install chromium
~~~

## Production Deployment

The default production layout is:

~~~text
Internet
  -> Nginx :80/:443
      -> / and /portfolio from /var/www/cosmosXmachina.website.github.io/dist
      -> /api/* to 127.0.0.1:8787
          -> Node SMTP, sessions, and workflows
          -> private Python pipelines at 127.0.0.1:8790
      -> successful document events over UDP 127.0.0.1:5514
          -> hourly in-memory dedupe, then identifier-free daily JSONL
~~~

Do not expose ports 8787 or 8790 in the firewall. Do not serve the repository root.

### 1. DNS

At the domain registrar for cosmos-x-machina.it:

- Create an A record for @ pointing to the server's public IPv4 address.
- Create a CNAME record for www pointing to cosmos-x-machina.it.
- If the server has stable IPv6, add an AAAA record for @ and configure IPv6 firewall rules.
- Remove conflicting A, AAAA, or forwarding records.
- Wait for DNS propagation and verify with dig or nslookup.

Both cosmos-x-machina.it and www.cosmos-x-machina.it must resolve to the deployment machine before requesting certificates.

### 2. Install System Packages

On Ubuntu/Debian:

~~~bash
sudo apt update
sudo apt install -y git nginx python3 python3-venv python3-pip certbot python3-certbot-nginx
~~~

Install a supported Node.js release and verify it:

~~~bash
node --version
npm --version
~~~

Node must be 22.5 or newer because Operations Hub uses the built-in SQLite module. Install Node 22 from a supported distribution package if the OS repository is older.

### 3. Deploy the Repository

~~~bash
sudo mkdir -p /var/www/cosmosXmachina.website.github.io
sudo chown -R "$USER":www-data /var/www/cosmosXmachina.website.github.io
git clone YOUR_REPOSITORY_URL /var/www/cosmosXmachina.website.github.io
cd /var/www/cosmosXmachina.website.github.io
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r python_service/requirements.txt
cp .env.example .env
chmod 640 .env
~~~

Edit .env with the production values. Do not copy a development app password into a public file or shell history.

Build the only public web root:

~~~bash
npm run build
test -f dist/index.html
test -f dist/portfolio/index.html
~~~

Check that secrets and private sources are absent:

~~~bash
find dist -name '.env*' -o -name 'vash_key*' -o -name '*.md'
~~~

The command should print nothing.

### 4. Install systemd Units

The tracked units are cosmos-contact.service and cosmos-lab-python.service.

Create the protected aggregate-statistics directory before starting the Node unit when installing manually:

~~~bash
sudo install -d -o www-data -g www-data -m 0750 /var/lib/cosmos-analytics
~~~

~~~bash
sudo cp cosmos-contact.service /etc/systemd/system/cosmos-contact.service
sudo cp cosmos-lab-python.service /etc/systemd/system/cosmos-lab-python.service
sudo systemctl daemon-reload
sudo systemctl enable --now cosmos-lab-python.service
sudo systemctl enable --now cosmos-contact.service
sudo systemctl status cosmos-lab-python.service --no-pager
sudo systemctl status cosmos-contact.service --no-pager
~~~

Both services use Restart=always and start automatically after a reboot. They bind only to loopback. The Node and Python applications read the project-root .env directly; the units do not define another configuration source.

Health checks:

~~~bash
curl http://127.0.0.1:8790/health
curl http://127.0.0.1:8787/api/lab/health
~~~

### 5. Install Nginx Configuration

~~~bash
sudo cp cosmos-x-machina.nginx /etc/nginx/sites-available/cosmos-x-machina
sudo ln -s /etc/nginx/sites-available/cosmos-x-machina /etc/nginx/sites-enabled/cosmos-x-machina
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
~~~

Nginx serves only `dist/` and is the sole public route to `/api/*`. It redirects `www` to the apex domain, compresses text, applies conservative asset caching and sends document events only to the private loopback aggregate collector. The vhost does not write an IP-bearing access log and never serves the repository, `.env`, profiles, plans or keys.

The autonomous installer uses `scripts/configure-nginx-site.mjs` instead of blindly overwriting an existing TLS file. On repeat runs it retains Certbot directives, replaces only marked cosmosXmachina delivery blocks and verifies the resulting configuration with `nginx -t`.

### 6. Firewall and HTTPS

Allow only SSH, HTTP, and HTTPS:

~~~bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
~~~

Do not allow 8787 or 8790.

After DNS resolves:

~~~bash
sudo certbot --nginx -d cosmos-x-machina.it -d www.cosmos-x-machina.it --redirect
sudo certbot renew --dry-run
~~~

Certbot adds the HTTPS server and HTTP-to-HTTPS redirect to the installed Nginx configuration.

### 7. Search Engine Discovery

The code ships complete metadata, `robots.txt` and `sitemap.xml`; account verification cannot be automated safely. After the first public deployment:

1. Add `cosmos-x-machina.it` as a Domain property in Google Search Console and verify it with the DNS TXT record Google provides.
2. Submit `https://cosmos-x-machina.it/sitemap.xml` and inspect `/`, `/?lang=it`, `/?lang=en`, `/portfolio/` and one demo URL.
3. Add the domain in Bing Webmaster Tools, either by importing the verified Search Console property or using Bing's DNS verification, then submit the same sitemap.
4. Recheck indexing after major content changes. Do not add verification secrets to public HTML when DNS verification is available.

### 8. Production Verification

~~~bash
curl -I https://cosmos-x-machina.it/
curl -I https://cosmos-x-machina.it/portfolio/
curl https://cosmos-x-machina.it/robots.txt
curl https://cosmos-x-machina.it/sitemap.xml
curl https://cosmos-x-machina.it/api/lab/health
ss -lun | grep 127.0.0.1:5514
journalctl -u cosmos-contact.service -n 50 --no-pager
journalctl -u cosmos-lab-python.service -n 50 --no-pager
sudo -u www-data npm run report:visits -- --days 7
~~~

Run the report command from the repository root. It prints daily records and a seven-day total; the current hour appears only after it closes. Use the live contact form for the final SMTP check. Request bodies, query strings, user agents and visitor identifiers are not logged; do not add them.

## Updating Production

~~~bash
cd /var/www/cosmosXmachina.website.github.io
git pull --ff-only
sudo bash deploy-production.sh
~~~

The script tests before activating, atomically swaps `dist/`, refreshes services and Nginx, and preserves `.env`. Verify the homepage, Portfolio index, one Node workflow, one Python workflow, statistics listener and contact delivery after every deployment.

## Security Checklist

- .env exists only on the runtime machine and is mode 640 or stricter.
- vash_key, vash_key.pub, CVs, profiles, and planning sources are not committed or copied into dist/.
- Only Nginx listens publicly.
- Node listens on 127.0.0.1:8787.
- Python listens on 127.0.0.1:8790.
- The aggregate collector listens only on UDP 127.0.0.1:5514 and `/var/lib/cosmos-analytics` is writable only by the service account.
- Daily visit records contain counts only; IP addresses and hashes must never be written.
- The repository root is never an Nginx root.
- Gmail SMTP uses an app password, not the main account password.
- Version 1 has no AI key and no external AI traffic.
- Arbitrary uploads, URL fetching, scraping, and automatic proposal sending remain disabled.
