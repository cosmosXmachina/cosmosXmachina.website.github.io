# Installation and Deployment

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
~~~

Production ALLOWED_ORIGIN:

~~~text
ALLOWED_ORIGIN=https://cosmos-x-machina.it,https://www.cosmos-x-machina.it
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

Nginx serves only dist/ and is the sole public route to /api/*. It does not proxy the repository, .env, profiles, plans, or keys.

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

### 7. Production Verification

~~~bash
curl -I https://cosmos-x-machina.it/
curl -I https://cosmos-x-machina.it/portfolio/
curl https://cosmos-x-machina.it/api/lab/health
journalctl -u cosmos-contact.service -n 50 --no-pager
journalctl -u cosmos-lab-python.service -n 50 --no-pager
~~~

Use the live contact form for the final SMTP check. Visitor content is not intentionally logged; do not add request-body logging.

## Updating Production

~~~bash
cd /var/www/cosmosXmachina.website.github.io
git pull --ff-only
npm ci
.venv/bin/python -m pip install -r python_service/requirements.txt
npm run build
sudo systemctl restart cosmos-lab-python.service cosmos-contact.service
sudo nginx -t
sudo systemctl reload nginx
~~~

Verify the homepage, Portfolio index, one Node workflow, one Python workflow, and contact delivery after every deployment.

## Security Checklist

- .env exists only on the runtime machine and is mode 640 or stricter.
- vash_key, vash_key.pub, CVs, profiles, and planning sources are not committed or copied into dist/.
- Only Nginx listens publicly.
- Node listens on 127.0.0.1:8787.
- Python listens on 127.0.0.1:8790.
- The repository root is never an Nginx root.
- Gmail SMTP uses an app password, not the main account password.
- Version 1 has no AI key and no external AI traffic.
- Arbitrary uploads, URL fetching, scraping, and automatic proposal sending remain disabled.
