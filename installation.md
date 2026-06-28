# cosmosXmachina Installation Guide

This project is a static single-page website with a required Node.js SMTP endpoint for direct Gmail mail delivery from the contact form. The endpoint reads its configuration from the project `.env` file.

## Dependencies

- Git, for cloning and version control.
- A modern browser.
- Internet access, because `index.html` loads Three.js from the pinned CDN URL already in the file.
- Node.js LTS, recommended Node 20 or newer. The contact endpoint was validated with Node `v24.18.0`.
- npm, installed with Node. The project does not currently require npm packages.
- Optional Python 3, only if you want to preview the static files with `python -m http.server`.
- A Gmail account with 2-Step Verification enabled and a Gmail app password for SMTP sending.
- A host for the Node endpoint. GitHub Pages can serve `index.html`, but it cannot run `api/contact.js`; without a deployed endpoint and its `.env` file, the form can only use the `mailto:` backup.

## Fresh Machine Setup

1. Install Node.js LTS.

   On Windows with winget:

   ```powershell
   winget install --id OpenJS.NodeJS.LTS -e --source winget
   ```

2. Clone the repository and enter the project folder.

   ```powershell
   git clone <repo-url>
   cd cosmosXmachina.website.github.io
   ```

3. Check the runtime.

   ```powershell
   node --version
   npm --version
   ```

4. Create the `.env` file from the template.

   ```powershell
   Copy-Item .env.example .env
   ```

   Fill `.env` with the exact keys used by `api/contact.js`:

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

   Never commit `.env` or the Gmail app password.

## Local Preview

For a static frontend preview:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:4173/index.html
```

If Python is not installed, use any static file server. Opening `index.html` directly can work for visual inspection, but a local server is better for browser module behavior and contact-form testing.

## Local Contact Endpoint

After `.env` is filled, start the endpoint from the repository root:

```powershell
node api/contact.js
```

This starts the endpoint at:

```text
http://127.0.0.1:8787
```

For full browser form testing with a separate local endpoint, set the `cosmos-contact-endpoint` meta tag in `index.html` to the endpoint URL:

```html
<meta name="cosmos-contact-endpoint" content="http://127.0.0.1:8787">
```

For production, set it back to `/api/contact` when the endpoint is served from the same origin, or to the full deployed endpoint URL when it is hosted separately.

## Production Deployment

The default production deployment uses one Linux server with Node.js, the project files under `/var/www/cosmosXmachina.website.github.io`, and the committed `cosmos-contact.service` file installed as a `systemd` service. This keeps the Gmail SMTP endpoint running after server restarts and restarts it if it crashes.

The public internet should see only the registered domain on HTTP/HTTPS. The Node endpoint should stay private on the same machine, listening on `127.0.0.1:8787`, and the web server should proxy only `/api/contact` to it. The browser still calls `https://your-domain.example/api/contact`, but Node itself is not directly exposed.

Recommended production shape:

```text
Internet
  -> https://your-domain.example
  -> Nginx/Caddy serves index.html and assets
  -> Nginx/Caddy proxies /api/contact to http://127.0.0.1:8787
  -> Node SMTP endpoint sends through Gmail
```

Do not open the Node port publicly in the firewall. `ALLOWED_ORIGIN` should still be set to the exact public origin, but remember that browser JavaScript is public: the endpoint cannot be made accessible only to "the website" in a strict secret sense. The practical protection is same-origin proxying, localhost-only Node binding, the hidden spam trap, and web-server rate limiting if needed.

1. Copy or clone the project to the production path:

   ```bash
   sudo mkdir -p /var/www
   sudo git clone <repo-url> /var/www/cosmosXmachina.website.github.io
   cd /var/www/cosmosXmachina.website.github.io
   ```

   If the project already exists on the server, update it instead:

   ```bash
   cd /var/www/cosmosXmachina.website.github.io
   sudo git pull
   ```

2. Create the production `.env` file from the template:

   ```bash
   sudo cp .env.example .env
   sudo nano .env
   ```

   Fill `.env` with the production values:

   ```text
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=davide.deon@gmail.com
   SMTP_PASS=your_gmail_app_password_without_spaces
   MAIL_FROM=davide.deon@gmail.com
   MAIL_TO=davide.deon@gmail.com
   ALLOWED_ORIGIN=https://your-public-site.example
   PORT=8787
   ```

   Set `ALLOWED_ORIGIN` to the exact public website origin. Never commit the production `.env` file.

3. Set file ownership so the service user can read the project:

   ```bash
   sudo chown -R www-data:www-data /var/www/cosmosXmachina.website.github.io
   sudo chmod 600 /var/www/cosmosXmachina.website.github.io/.env
   ```

4. Install the included `systemd` service file:

   ```bash
   sudo cp /var/www/cosmosXmachina.website.github.io/cosmos-contact.service /etc/systemd/system/cosmos-contact.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now cosmos-contact
   ```

5. Check the service:

   ```bash
   sudo systemctl status cosmos-contact
   sudo journalctl -u cosmos-contact -f
   ```

6. Configure the web server to serve the static site and proxy `/api/contact` to the Node endpoint running on `127.0.0.1:8787`.

   Example Nginx location block:

   ```nginx
   location /api/contact {
       proxy_pass http://127.0.0.1:8787;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

   Optional Nginx rate limiting can be added if spam becomes a problem:

   ```nginx
   limit_req_zone $binary_remote_addr zone=contact:10m rate=5r/m;

   location /api/contact {
       limit_req zone=contact burst=3 nodelay;
       proxy_pass http://127.0.0.1:8787;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

7. In production, keep the endpoint meta tag in `index.html` as same-origin:

   ```html
   <meta name="cosmos-contact-endpoint" content="/api/contact">
   ```

8. Test the contact form from the live site.

If `/api/contact` is unavailable, the website intentionally falls back to a prepared `mailto:` message so visitors can still contact `davide.deon@gmail.com`.

## Validation Commands

Run these checks after changes:

```powershell
node --check api/contact.js
node -e "require('./api/contact.js'); console.log('contact module loaded')"
```

No build step is currently required.
