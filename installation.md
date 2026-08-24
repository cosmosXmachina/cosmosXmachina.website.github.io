# cosmosXmachina Installation And Apache Operations

This is the canonical setup and deployment guide. Production is Apache-native. Do not install Nginx and do not run an older deployment script that builds the application on the server.

The four active Creation Lab demos execute entirely in the browser and do not call `/api/lab/*`. The preserved Node/Python topology remains in releases for contact, aggregate analytics and backward-compatible health/rollback behavior; this migration requires no privileged production reconfiguration.

## Operator Quick Start

### One-Time Privileged Bootstrap

A server administrator or an agent with root shell access performs this once:

1. Keep the repository copy used for bootstrap outside every Apache document root.
2. Keep the real production `.env` at its existing private `/opt/...` path. Do not replace or copy it into a release.
3. Copy `production/deploy.conf.example` to `/opt/cosmosxmachina/deploy.conf` and enter the real Apache vhost files, environment path, SFTP directories, service unit names and accounts.
4. Make the configuration root-owned and not writable by group or others:

   ```bash
   sudo chown root:root /opt/cosmosxmachina/deploy.conf
   sudo chmod 600 /opt/cosmosxmachina/deploy.conf
   ```

5. Create the configured incoming/status directories if SFTP must receive the first release before bootstrap, then grant the existing upload account access:

   ```bash
   sudo install -d -o vash -g vash -m 750 /opt/cosmosxmachina/incoming /opt/cosmosxmachina/status
   ```

6. Upload one locally built archive, its `.sha256`, and its `.ready` marker to `INCOMING_DIR`, in that order.
7. Run the tracked bootstrap from its private repository copy:

   ```bash
   sudo bash deploy-production.sh --config /opt/cosmosxmachina/deploy.conf
   ```

8. Do not report completion until the script prints `Apache production bootstrap completed`. It must also leave `apache2`, the configured Node unit and the configured Python unit active.

The bootstrap preserves the existing `.env` and Certbot directives. It installs only compact runtime prerequisites, creates one shared Python virtual environment, installs low-resource systemd units, activates the verified release, merges managed blocks into the existing Apache vhosts, runs `apache2ctl configtest`, and installs the release cron.

### Routine Releases Without Shell Access

After bootstrap, routine deployment needs SFTP only:

1. Commit the intended tracked files so the worktree is clean.
2. On the development machine run:

   ```bash
   npm ci
   npm run release:build
   ```

3. Upload with the included PowerShell helper, using the SFTP-visible incoming path configured by the administrator:

   ```powershell
   .\scripts\upload-production-release.ps1 `
     -RemoteIncoming incoming/cosmosxmachina `
     -KeyPath .\cosmos_key
   ```

4. The helper sends the archive, checksum, and `.ready` marker last. Cron normally processes the marker within one minute.
5. Read `STATUS_DIR/active.json` through SFTP. A successful record has `state: "active"` and names the new release.

Never upload a dirty release. `npm run release:build` rejects tracked changes, and the uploader rejects local test release identifiers containing `-dirty-`.

## Production Topology

```text
browser
  -> Apache :80/:443
       -> /, assets, privacy, Creation Lab and demos from /opt/cosmosxmachina/current/dist
       -> active Creation Lab workflows run in the browser
       -> /api/contact -> Node gateway 127.0.0.1:8787
Apache document event -> UDP 127.0.0.1:5514 -> Node in-memory hourly dedupe
                                              -> daily aggregate JSONL only
preserved compatibility -> Node /api/lab routes -> Python 127.0.0.1:8790
```

Required services:

| Service | Responsibility |
|---|---|
| `apache2.service` | Sole public server, TLS, compression, caching, headers, strict route allowlist, static `dist/`, and `/api/*` reverse proxy. |
| Configured Node systemd unit | Gmail contact delivery and aggregate analytics; retained Lab routes support compatibility smoke tests but are not called by public demos. |
| Configured Python systemd unit | Retained deterministic pipeline compatibility service; public demos do not call it. |
| Existing cron service | Finds `.ready` markers, verifies and activates releases, health-checks them, and rolls back failures. |
| Existing SFTP subsystem | Receives release files and exposes status; it does not serve visitors. |
| Existing Certbot timer | Renews the current Apache TLS certificates. |
| Gmail SMTP | External contact-mail dependency, not a machine service. |

Three.js, React, ECharts, the browser Lab runtime, retrieval index and IndexedDB state execute on the visitor's device and create no request-time Lab compute load on production.

## Production Prerequisites And Cost

The bootstrap expects Debian/Ubuntu, Apache 2.4, systemd, cron and SFTP. It enables Apache modules `proxy`, `proxy_http`, `headers`, `expires`, `deflate`, `setenvif`, `rewrite` and `ssl`.

One-time runtime requirements:

| Component | Production requirement | Approximate impact |
|---|---|---|
| Apache | Existing Apache 2.4 and existing Certbot integration | Already installed; managed config only |
| Node.js | Node 22.5 or newer; no npm or `node_modules` needed at runtime | About 50-120 MB if installation/upgrade is required |
| Python | Python 3.11+, `venv`, pip | Base runtime normally already present |
| Python packages | FastAPI, Pydantic and Uvicorn from `requirements-production.txt` | About 30-50 MB |
| OS tools | `bash`, `tar`, `gzip`, `sha256sum`, `curl`, `flock`, `logger`, CA certificates | Normally already installed |

Do not install Git, Docker, Redis, a database, Nginx, Playwright, Chromium, Vite, Vitest, pytest, frontend dependencies or AI SDKs on production.

Measured and expected footprint:

- Current compiled frontend: about 3.74 MiB.
- Complete compressed release: expected around 4.5-5 MiB and capped at 8 MiB.
- Two retained releases: normally below 10 MiB compressed-equivalent payload.
- Shared Python runtime plus staging/status: expected project footprint around 50-80 MiB.
- Total when Node must also be installed: approximately 110-200 MiB.
- Required free disk: at least 250 MiB; 300 MiB or more is recommended.
- Node gateway: approximately 40-80 MB RAM, with `MemoryMax=192M` and a 128 MB V8 heap.
- Python service: approximately 40-80 MB RAM, with `MemoryMax=128M`.
- Typical incremental RAM: approximately 80-160 MB; idle CPU is near zero.
- Recommended baseline: one CPU core and 1 GB RAM.
- Activation warns below 768 MB RAM and refuses below 512 MB unless `ALLOW_LOW_MEMORY=1` is deliberately approved.

No server-side rendering, ML inference, background model job or live AI call runs in production. Public demo interactions do not reach either private service. The retained units pin ports `8787` and `8790`, force `AI_MODE=fixture` and `AI_LIVE_ENABLED=false`, and enable only the approved loopback aggregate analytics listener. These operational values override stale entries in the preserved `.env`; SMTP credentials and allowed origins still come from that external file.

## Deployment Configuration

Start from `production/deploy.conf.example`. Important fields:

- `COSMOS_ROOT`: private release root, normally `/opt/cosmosxmachina`.
- `COSMOS_ENV_FILE`: unchanged real secrets/config file outside releases.
- `APACHE_SITE_FILE`: HTTPS vhost file, or the combined HTTP/HTTPS vhost file.
- `APACHE_HTTP_SITE_FILE`: HTTP vhost file; set it equal to `APACHE_SITE_FILE` when both vhosts share one file.
- `INCOMING_DIR`: SFTP-writable release inbox.
- `STATUS_DIR`: SFTP-readable activation status.
- `NODE_SERVICE` and `PYTHON_SERVICE`: existing systemd unit names to reuse.
- `SERVICE_USER`/`SERVICE_GROUP`: private runtime identity; it must be able to read `COSMOS_ENV_FILE`.
- `UPLOAD_USER`/`UPLOAD_GROUP`: existing SFTP identity.
- `KEEP_RELEASES=2`: active plus previous rollback release.
- `MIN_FREE_MIB=250`: release activation disk floor.
- `INSTALL_MISSING_PACKAGES=1`: allow the one-time bootstrap to install compact runtime prerequisites.

The bootstrap refuses a deployment config that is not root-owned or is group/world writable. It also refuses a production `.env` that the service account cannot read or that group/others can write. A normal secrets mode is `640` with an appropriate private service group, or `600` when the service runs as its owner.

Minimum runtime values expected in the preserved `.env` are documented in `.env.example`. Production should include a strong `LAB_SESSION_SECRET`, the Gmail SMTP settings, the public `ALLOWED_ORIGIN`, and visit-counter settings when analytics is enabled.

## What A Release Contains

`scripts/build-production-release.mjs` runs the complete local gates, builds `dist/`, bundles the Node gateway, copies only runtime Python modules, writes a SHA-256 file manifest, scans for secrets/live-AI configuration, and creates:

```text
release-output/
  cosmos-release-<commit>.tar.gz
  cosmos-release-<commit>.tar.gz.sha256
  cosmos-release-<commit>.ready
```

The archive allowlist permits only:

- compiled `dist/` public files;
- bundled Node gateway plus `contact.js` and its package type marker;
- six Python runtime modules and production requirements;
- the private cross-service smoke script;
- `manifest.json`.

Plans, Markdown, source tests, CVs, SSH keys, `.env`, scratch pages, unbuilt source and repository metadata cannot enter a release. The verifier rejects extra files, symlinks, special files, modified checksums, changed runtime requirements, dirty builds, live-AI mode and secret-like content.

## Activation And Rollback

`production/activate-release.sh` is installed as a root-owned cron target and runs under `flock`:

1. Ignore incomplete uploads with no `.ready` marker.
2. Parse a small regular marker and verify archive/checksum names and SHA-256.
3. Check the archive size, free disk and RAM floor.
4. Reject unsafe archive paths, extract into a staging directory, normalize modes and run the exact manifest verifier.
5. Reject changed Python requirements until bootstrap explicitly updates the shared environment.
6. Atomically point `current` at the verified version.
7. Restart Python or Node only when its component hash changed or the service is inactive.
8. Check both private health routes and run one complete fixture workflow through Node and Python.
9. Restore the previous `current` symlink and services if any health check fails.
10. Keep only the active and previous releases, delete stale staging data, and write a compact status JSON.

Uploading the same release again is idempotent and still revalidates the on-disk release and health topology. A corrupt archive, low disk, changed requirements or failed service produces a failed status and does not replace the working release.

## Apache Security And Public Files

Apache serves `/opt/cosmosxmachina/current/dist`, never the repository. The managed vhost:

- denies the application root, then grants only `current/dist`;
- disables directory indexes and HTTP TRACE;
- allows only the homepage, privacy, crawler files, runtime assets, Creation Lab, four demos, `/api/*`, and ACME challenge paths;
- returns `403` for plans, source, keys, `.env`, scratch pages and unexpected legacy aliases;
- redirects HTTP and `www` traffic to the HTTPS apex while preserving paths;
- keeps backend ports bound to loopback;
- discards ordinary IP-bearing Apache access logs;
- applies security headers, compression, ETags and restrained asset caching.

`production/public-root.htaccess` is only an interim guard for the legacy SFTP document root. It has already been designed as the same strict public allowlist. Once Apache points at `current/dist`, the legacy repository root must remain outside the vhost and the interim file is no longer part of delivery.

Recommended filesystem ownership:

```text
/opt/cosmosxmachina/                 root:root       0755
/opt/cosmosxmachina/.env             root:<service>  0640 (or private owner 0600)
/opt/cosmosxmachina/deploy.conf      root:root       0600
/opt/cosmosxmachina/releases/        root:root       0755
/opt/cosmosxmachina/shared/          root:<service>  0750
INCOMING_DIR and STATUS_DIR          <upload>        0750
/var/lib/cosmos-analytics/           <service>       0750
```

## Local Development And Tests

Development machine prerequisites are Node 22.5+, npm, Python 3.11+, and Playwright Chromium. These are not production requirements.

```bash
npm ci
python -m venv .venv
```

Activate the environment, then:

```bash
python -m pip install -r python_service/requirements.txt
npx playwright install chromium
npm test
npm run test:e2e
npm run build
```

To preview all four browser-only demos after `npm run build`, only the static server is needed:

```bash
npm run preview
```

To run the full compatibility topology with Vite, Node and Python for contact, analytics and private-route checks:

```bash
npm run serve:local
```

Open `http://127.0.0.1:4173/`. Stop with `Ctrl+C`.

`npm run release:build` is the authoritative release gate. It chooses unused loopback ports, then runs frontend tests, all Node tests, Python tests, the current static-only 84-case Playwright matrix, the production build, `/api/lab` bundle rejection, archive verification and secret scanning. The packaged compatibility runtime is still smoke-tested. On Windows, the final atomic POSIX activation simulation is skipped and is run by the Ubuntu CI job.

## Production Verification And Diagnosis

Root-capable server operators can check:

```bash
sudo apache2ctl configtest
sudo systemctl status apache2 <node-unit> <python-unit>
curl -fsS http://127.0.0.1:8787/api/lab/health
curl -fsS http://127.0.0.1:8790/health
curl -I https://cosmos-x-machina.it/
curl -I https://cosmos-x-machina.it/portfolio/
curl -I https://cosmos-x-machina.it/acension.txt
```

The first five should succeed; the private file probe should return `403`. Backend ports must not be reachable externally.

For diagnostics:

```bash
sudo journalctl -u <node-unit> -u <python-unit> --since today
sudo tail -n 1 /opt/cosmosxmachina/status/active.json
```

The contact endpoint shares the Node gateway. If Lab health works but mail does not, verify the preserved SMTP values and Gmail app password without printing secrets. Do not replace the `.env` with `.env.example`.

Visit analytics is enabled by the production Node unit and writes only daily aggregate records to `/var/lib/cosmos-analytics/visits-daily.jsonl`. The development report command can read a copied file:

```bash
npm run report:visits -- --file /path/to/visits-daily.jsonl --days 7
```

No IP address, user agent, query string, request body or visitor history is persisted.

## Search Console And Bing Submission

After the HTTPS release is active:

1. Add `https://cosmos-x-machina.it/` to Google Search Console. DNS verification is preferred because it remains valid independently of a page release; use the TXT value Google provides at the DNS host.
2. Submit `https://cosmos-x-machina.it/sitemap.xml` in the Sitemaps view and inspect the homepage plus Creation Lab URL once.
3. Add the same site in Bing Webmaster Tools, or import the verified Search Console property when Bing offers that path.
4. Submit the same sitemap in Bing and leave `robots.txt` publicly reachable.
5. Do not create a second indexed property for design-preview URLs. The `.com` address is an English-profile redirect; canonical Creation Lab and demo URLs remain on `.it`.

Search submission does not guarantee ranking or immediate indexing. Keep canonical, alternate-language, structured-data, robots and sitemap tests green in every release.
