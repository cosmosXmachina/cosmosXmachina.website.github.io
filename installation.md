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

## Deployment Checklist

1. Serve `index.html` and `assets/` from GitHub Pages or another static host.
2. Deploy `api/contact.js` to a Node/serverless host for Gmail SMTP delivery.
3. Put a `.env` file beside the deployed project files on that host:

   ```text
   SMTP_HOST
   SMTP_PORT
   SMTP_USER
   SMTP_PASS
   MAIL_FROM
   MAIL_TO
   ALLOWED_ORIGIN
   PORT
   ```

4. Set `ALLOWED_ORIGIN` in `.env` to the exact public website origin, for example `https://example.com`.
5. If the endpoint is not on the same origin as the website, update the `cosmos-contact-endpoint` meta tag in `index.html` to the full API URL.
6. Test the contact form from the live site.
7. Confirm the Gmail app password is stored only in `.env` files that are not committed.

If `/api/contact` is unavailable, the website intentionally falls back to a prepared `mailto:` message so visitors can still contact `davide.deon@gmail.com`.

## Validation Commands

Run these checks after changes:

```powershell
node --check api/contact.js
node -e "require('./api/contact.js'); console.log('contact module loaded')"
```

No build step is currently required.
