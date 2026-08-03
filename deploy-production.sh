#!/usr/bin/env bash
# cosmosXmachina production bootstrap for Ubuntu/Debian.
#
# Run from the uploaded repository root:
#   sudo bash deploy-production.sh
#
# Operator/Codex contract:
# - Preserve an existing project-root .env. On a first install, either let this
#   script create it or create it from .env.example and set SMTP_PASS first.
# - This script installs OS, Node and Python dependencies; forces fixture-only
#   AI behavior; runs frontend, Node, Python and four-viewport Playwright tests;
#   builds and scans an isolated release; activates dist/; installs/enables the
#   Node and Python systemd services; configures Nginx, SEO files and private
#   aggregate visit statistics; and verifies health.
# - Do not report success unless "Production installation completed" appears.
# - If it fails, fix the reported line and rerun this idempotent script. Inspect:
#     journalctl -u cosmos-contact.service -u cosmos-lab-python.service -n 100 --no-pager
#     nginx -t
# - Existing Certbot/TLS configuration is preserved when its web root and API
#   proxy are valid. On a first deployment, configure DNS and run the Certbot
#   command printed at completion. Never expose loopback ports 8787 or 8790.
set -Eeuo pipefail
IFS=$'\n\t'

APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
DOMAIN="${DOMAIN:-cosmos-x-machina.it}"
WWW_DOMAIN="${WWW_DOMAIN:-www.cosmos-x-machina.it}"
SERVICE_USER="${SERVICE_USER:-www-data}"
SITE_NAME="cosmos-x-machina"
NEXT_DIST="$APP_ROOT/.dist.next"
PREVIOUS_DIST="$APP_ROOT/.dist.previous"
TMP_NGINX=""

log() { printf '\n[cosmosXmachina] %s\n' "$*"; }
fail() { printf '\n[cosmosXmachina] ERROR: %s\n' "$*" >&2; exit 1; }
cleanup() { [[ -z "$TMP_NGINX" ]] || rm -f -- "$TMP_NGINX"; }
trap cleanup EXIT
trap 'printf "\n[cosmosXmachina] Failed at line %s. Existing .env was preserved.\n" "$LINENO" >&2' ERR

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  exec sudo --preserve-env=DOMAIN,WWW_DOMAIN,SERVICE_USER bash "$0" "$@"
fi
[[ "$(uname -s)" == "Linux" ]] || fail "This production installer supports Linux only."
[[ "$APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "Use a repository path without spaces or shell metacharacters."
[[ "$APP_ROOT" != "/" && -f "$APP_ROOT/package-lock.json" && -f "$APP_ROOT/.env.example" ]] || fail "Run the repository copy of this script."
[[ -r /etc/os-release ]] || fail "Cannot identify the operating system."
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-} ${ID_LIKE:-}" =~ (debian|ubuntu) ]] || fail "Only Ubuntu/Debian-family servers are supported."
id "$SERVICE_USER" >/dev/null 2>&1 || fail "Service account '$SERVICE_USER' does not exist."

node_is_supported() {
  command -v node >/dev/null 2>&1 && node -e '
    const [major, minor] = process.versions.node.split(".").map(Number);
    process.exit(major > 22 || (major === 22 && minor >= 5) ? 0 : 1);
  '
}

install_node() {
  log "Installing Node.js 22 from the NodeSource Debian repository"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  chmod a+r /etc/apt/keyrings/nodesource.gpg
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main\n' \
    "$(dpkg --print-architecture)" > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  node_is_supported || fail "Node.js 22.5 or newer was not installed successfully."
}

set_env() {
  local key="$1" value="$2" escaped
  escaped="${value//\\/\\\\}"
  escaped="${escaped//&/\\&}"
  escaped="${escaped//|/\\|}"
  if grep -q "^${key}=" "$APP_ROOT/.env"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$APP_ROOT/.env"
  else
    printf '%s=%s\n' "$key" "$value" >> "$APP_ROOT/.env"
  fi
}

wait_for() {
  local url="$1" name="$2"
  for _ in {1..40}; do
    curl -fsS --max-time 2 "$url" >/dev/null 2>&1 && return 0
    sleep 0.5
  done
  journalctl -u cosmos-contact.service -u cosmos-lab-python.service -n 40 --no-pager >&2 || true
  fail "$name did not become healthy at $url"
}

public_get() {
  local path="$1"
  if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
    curl -fsS --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN$path"
  else
    curl -fsS -H "Host: $DOMAIN" "http://127.0.0.1$path"
  fi
}

log "Installing operating-system dependencies"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl git gnupg iproute2 nginx openssl python3 python3-pip python3-venv certbot python3-certbot-nginx
node_is_supported || install_node
log "Using $(node --version), npm $(npm --version), and $(python3 --version 2>&1)"

log "Preparing the protected runtime configuration"
if [[ ! -f "$APP_ROOT/.env" ]]; then
  install -m 0640 "$APP_ROOT/.env.example" "$APP_ROOT/.env"
  log "Created .env from the tracked template; existing deployments keep their file unchanged."
fi
set_env ALLOWED_ORIGIN "https://$DOMAIN,https://$WWW_DOMAIN"
set_env PUBLIC_SITE_URL "https://$DOMAIN"
set_env PORT "8787"
set_env PYTHON_LAB_URL "http://127.0.0.1:8790"
set_env PYTHON_LAB_PORT "8790"
set_env LAB_MODE "fixture"
set_env AI_MODE "fixture"
set_env AI_LIVE_ENABLED "false"
set_env VISIT_ANALYTICS_ENABLED "true"
set_env VISIT_ANALYTICS_HOST "127.0.0.1"
set_env VISIT_ANALYTICS_PORT "5514"
set_env VISIT_ANALYTICS_FILE "/var/lib/cosmos-analytics/visits-daily.jsonl"
set_env VISIT_ANALYTICS_TIMEZONE "Europe/Rome"
set_env VISIT_ANALYTICS_RETENTION_DAYS "400"
if grep -Eq '^LAB_SESSION_SECRET=(|replace_)' "$APP_ROOT/.env"; then
  set_env LAB_SESSION_SECRET "$(openssl rand -hex 32)"
fi
chown root:"$SERVICE_USER" "$APP_ROOT/.env"
chmod 0640 "$APP_ROOT/.env"
for key in "$APP_ROOT/cosmos_key" "$APP_ROOT/vash_key"; do
  [[ ! -e "$key" ]] || chmod 0600 "$key"
done

log "Installing locked Node and Python dependencies"
cd "$APP_ROOT"
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r python_service/requirements.txt
.venv/bin/python -m pip check
npm audit --audit-level=high
npm test
node node_modules/playwright/cli.js install --with-deps chromium
E2E_SITE_PORT=44173 E2E_NODE_PORT=48787 E2E_PYTHON_PORT=48790 E2E_WORKERS=2 \
  node node_modules/playwright/cli.js test

log "Building a checked release away from the live web root"
rm -rf -- "$NEXT_DIST"
DIST_DIR=".dist.next" npm run build
[[ -f "$NEXT_DIST/index.html" && -f "$NEXT_DIST/privacy.html" && -f "$NEXT_DIST/robots.txt" && -f "$NEXT_DIST/sitemap.xml" && -f "$NEXT_DIST/portfolio/index.html" ]] || fail "The release build is incomplete."
rm -rf -- "$PREVIOUS_DIST"
if [[ -d "$APP_ROOT/dist" ]]; then mv "$APP_ROOT/dist" "$PREVIOUS_DIST"; fi
if ! mv "$NEXT_DIST" "$APP_ROOT/dist"; then
  [[ ! -d "$PREVIOUS_DIST" ]] || mv "$PREVIOUS_DIST" "$APP_ROOT/dist"
  fail "Could not activate the new dist directory."
fi
npm prune --omit=dev
npm audit --omit=dev --audit-level=high

log "Installing persistent private services"
NODE_BIN="$(command -v node)"
install -d -o "$SERVICE_USER" -g "$SERVICE_USER" -m 0750 /var/lib/cosmos-analytics
sed -e "s|/var/www/cosmosXmachina.website.github.io|$APP_ROOT|g" -e "s|/usr/bin/node|$NODE_BIN|g" \
  "$APP_ROOT/cosmos-contact.service" > /etc/systemd/system/cosmos-contact.service
sed "s|/var/www/cosmosXmachina.website.github.io|$APP_ROOT|g" \
  "$APP_ROOT/cosmos-lab-python.service" > /etc/systemd/system/cosmos-lab-python.service
chgrp "$SERVICE_USER" "$APP_ROOT"
chmod 0750 "$APP_ROOT"
systemctl daemon-reload
systemctl enable cosmos-lab-python.service cosmos-contact.service
systemctl restart cosmos-lab-python.service cosmos-contact.service

log "Installing or validating the Nginx site"
TMP_NGINX="$(mktemp)"
NGINX_SITE="/etc/nginx/sites-available/$SITE_NAME"
NGINX_ARGS=(--template "$APP_ROOT/cosmos-x-machina.nginx" --output "$TMP_NGINX" --app-root "$APP_ROOT" --domain "$DOMAIN" --www-domain "$WWW_DOMAIN")
if [[ -f "$NGINX_SITE" ]]; then
  NGINX_ARGS+=(--existing "$NGINX_SITE")
fi
if [[ -f "$NGINX_SITE" ]] && grep -Eq 'listen .*443|ssl_certificate' "$NGINX_SITE"; then
  grep -Fq "$APP_ROOT/dist" "$NGINX_SITE" || fail "Existing TLS Nginx site points to a different web root."
  grep -Fq '127.0.0.1:8787' "$NGINX_SITE" || fail "Existing TLS Nginx site lacks the required API proxy."
  log "Preserving TLS certificates while refreshing the managed site rules."
fi
node "$APP_ROOT/scripts/configure-nginx-site.mjs" "${NGINX_ARGS[@]}"
install -m 0644 "$TMP_NGINX" "$NGINX_SITE"
ln -sfn "$NGINX_SITE" "/etc/nginx/sites-enabled/$SITE_NAME"
nginx -t
systemctl enable nginx
systemctl reload nginx

log "Verifying private services and the public route"
wait_for http://127.0.0.1:8790/health "Python pipeline"
wait_for http://127.0.0.1:8787/api/lab/health "Node gateway"
LAB_HEALTH="$(curl -fsS http://127.0.0.1:8787/api/lab/health)"
python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["ok"] and d["mode"]=="fixture" and d["externalAI"] is False' <<<"$LAB_HEALTH" \
  || fail "The lab health response is not fixture-only."
public_get / >/dev/null
public_get /privacy.html >/dev/null
public_get /portfolio/ >/dev/null
ROBOTS_BODY="$(public_get /robots.txt)"
SITEMAP_BODY="$(public_get /sitemap.xml)"
grep -Fq 'sitemap.xml' <<<"$ROBOTS_BODY"
grep -Fq 'hreflang="en"' <<<"$SITEMAP_BODY"
ss -lun | grep -Fq '127.0.0.1:5514'
systemctl is-enabled --quiet nginx cosmos-lab-python.service cosmos-contact.service
systemctl is-active --quiet nginx cosmos-lab-python.service cosmos-contact.service

log "Production installation completed"
printf '%s\n' \
  "Public files: $APP_ROOT/dist" \
  "Node gateway: active on 127.0.0.1:8787" \
  "Python pipeline: active on 127.0.0.1:8790" \
  "Visit statistics: daily aggregates only in /var/lib/cosmos-analytics/visits-daily.jsonl" \
  "AI behavior: fixture-only; external calls disabled" \
  "Services: enabled at boot and configured with Restart=always"
if grep -Eq '^SMTP_PASS=(|replace_)' "$APP_ROOT/.env"; then
  printf '\nWARNING: SMTP_PASS still needs the Gmail app password for direct form delivery.\n' >&2
fi
if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
  printf '\nAfter DNS resolves, enable HTTPS with:\n  sudo certbot --nginx -d %s -d %s --redirect\n' "$DOMAIN" "$WWW_DOMAIN"
fi
printf '\nInspect services and visits with:\n  journalctl -u cosmos-contact.service -u cosmos-lab-python.service -f\n  cd %s && sudo -u %s npm run report:visits -- --days 7\n' "$APP_ROOT" "$SERVICE_USER"
