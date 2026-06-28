# cosmosXmachina Website

Static bilingual website for **cosmosXmachina**, built for GitHub Pages.

## Current Files

- `index.html`: current static production page without Three.js.
- `index3d.html`: current preferred 3D version with the approved Three.js symbol layer.
- `assets/`: generated section backgrounds and the `cxm-logo.svg` header mark.
- `AGENTS.md`: short operating guide for future agents.
- `cosmos_interface.md`: detailed architecture and implementation notes.
- `installation.md`: dependencies, fresh-machine setup and run/deploy checklist.

## GitHub Pages Publishing

GitHub Pages serves `index.html` as the root homepage. If the 3D version should be the main public website, manually copy or rename `index3d.html` to `index.html` before publishing. If both files stay as they are, visitors will see the non-3D version at `/` and the 3D version only at `/index3d.html`.

Recommended procedure:

1. Preview locally from the repository root:

   ```bash
   python -m http.server 4173 --bind 127.0.0.1
   ```

2. Open `http://127.0.0.1:4173/index3d.html` and confirm the 3D version is the one to publish.
3. If yes, copy or rename `index3d.html` to `index.html`.
4. Commit and push the repository to GitHub.
5. In GitHub, open **Settings > Pages**.
6. Set **Source** to **Deploy from a branch**.
7. Select the publishing branch, usually `main`, and folder `/root`.
8. Save. GitHub will publish the site after the Pages build completes.

## Static Hosting Notes

- Keep asset paths relative, such as `assets/cxm-logo.svg`.
- File names are case-sensitive on GitHub Pages.
- The 3D version loads Three.js from the pinned CDN URL documented in `cosmos_interface.md`.
- No build step or package install is required.
- For a custom domain, add it in **Settings > Pages** and create the DNS records GitHub requests.

## Contact Form SMTP Endpoint

`index.html` posts the project intake form to `/api/contact`. The endpoint is `api/contact.js`, a no-dependency Node handler that sends mail through Gmail SMTP.

GitHub Pages does not run Node API routes. The Gmail SMTP mail system requires `api/contact.js` to run on a Node/serverless host, or the site must be served from a platform that supports `/api/contact`. If the endpoint is missing or unavailable, the form only falls back to a prepared `mailto:` email as a backup path; that fallback is not the SMTP mail system.

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
