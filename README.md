# cosmosXmachina Website

Static bilingual website for **cosmosXmachina**, built for GitHub Pages.

## Current Files

- `index.html`: current static production page without Three.js.
- `index3d.html`: current preferred 3D version with the approved Three.js symbol layer.
- `assets/`: generated section backgrounds and the `cxm-logo.svg` header mark.
- `AGENTS.md`: short operating guide for future agents.
- `cosmos_interface.md`: detailed architecture and implementation notes.

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
