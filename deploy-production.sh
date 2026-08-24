#!/usr/bin/env bash
# cosmosXmachina Apache-native production bootstrap and recovery entry point.
#
# SERVER OPERATOR / CODEX PROCEDURE
# 1. Do not run this from the public Apache document root. Keep the repository
#    copy private and keep the real .env at its existing path under /opt.
# 2. Copy production/deploy.conf.example to a root-owned deployment file, edit
#    COSMOS_ENV_FILE, both Apache vhost paths, INCOMING_DIR and STATUS_DIR for
#    this machine, then upload a locally built release archive/checksum/.ready marker.
# 3. Run: sudo bash deploy-production.sh --config /opt/cosmosxmachina/deploy.conf
# 4. The script installs only missing runtime prerequisites, creates the small
#    shared Python environment, reuses the configured systemd service names,
#    activates a verified release, merges only a managed block into the existing
#    Apache/Certbot vhost, runs apache2ctl configtest, and installs the cron.
# 5. Do not report success until "Apache production bootstrap completed" is
#    printed. Never run the retired Nginx deployment procedure.
# 6. Future routine releases require SFTP only: upload archive, .sha256, then
#    .ready last. Cron verifies, activates, health-checks and rolls back.
#
# Full Node/Python/browser tests and frontend compilation happen on the local
# machine in npm run release:build. Production never installs npm packages,
# Playwright, Chromium, Vite, test frameworks, Git, Nginx or AI SDKs.
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
CONFIG="/opt/cosmosxmachina/deploy.conf"
if [[ "${1:-}" == "--config" && -n "${2:-}" ]]; then CONFIG="$2"; fi
log() { printf '\n[cosmosXmachina] %s\n' "$*"; }
fail() { printf '\n[cosmosXmachina] ERROR: %s\n' "$*" >&2; exit 1; }

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then exec sudo bash "$0" --config "$CONFIG"; fi
[[ "$(uname -s)" == "Linux" ]] || fail "Linux is required."
[[ -r "$CONFIG" ]] || fail "Create and edit the root-owned deployment config first: $CONFIG"
[[ "$(stat -c %u "$CONFIG")" == "0" ]] || fail "Deployment config must be owned by root."
config_mode=$((8#$(stat -c %a "$CONFIG")))
(( (config_mode & 0022) == 0 )) || fail "Deployment config must not be writable by group or others."
# shellcheck disable=SC1090
source "$CONFIG"

required=(COSMOS_ROOT COSMOS_ENV_FILE APACHE_SITE_FILE APACHE_HTTP_SITE_FILE INCOMING_DIR STATUS_DIR DOMAIN WWW_DOMAIN NODE_SERVICE PYTHON_SERVICE SERVICE_USER SERVICE_GROUP UPLOAD_USER UPLOAD_GROUP KEEP_RELEASES MIN_FREE_MIB ALLOW_LOW_MEMORY INSTALL_MISSING_PACKAGES)
for name in "${required[@]}"; do [[ -n "${!name:-}" ]] || fail "Missing $name in $CONFIG"; done
for path in "$COSMOS_ROOT" "$COSMOS_ENV_FILE" "$APACHE_SITE_FILE" "$APACHE_HTTP_SITE_FILE" "$INCOMING_DIR" "$STATUS_DIR"; do
  [[ "$path" == /* && "$path" != "/" && "$path" =~ ^/[A-Za-z0-9._/-]+$ ]] || fail "Unsafe path in deployment config: $path"
done
for value in "$DOMAIN" "$WWW_DOMAIN"; do [[ "$value" =~ ^[A-Za-z0-9.-]+$ ]] || fail "Invalid domain: $value"; done
for service in "$NODE_SERVICE" "$PYTHON_SERVICE"; do [[ "$service" =~ ^[A-Za-z0-9_.@-]+\.service$ ]] || fail "Invalid systemd unit name: $service"; done
for account in "$SERVICE_USER" "$SERVICE_GROUP" "$UPLOAD_USER" "$UPLOAD_GROUP"; do [[ "$account" =~ ^[A-Za-z0-9_-]+$ ]] || fail "Invalid account name"; done
[[ "$KEEP_RELEASES" =~ ^[0-9]+$ && "$KEEP_RELEASES" -ge 2 && "$KEEP_RELEASES" -le 5 ]] || fail "KEEP_RELEASES must be between 2 and 5."
[[ "$MIN_FREE_MIB" =~ ^[0-9]+$ && "$MIN_FREE_MIB" -ge 100 && "$MIN_FREE_MIB" -le 10240 ]] || fail "MIN_FREE_MIB must be between 100 and 10240."
[[ "$ALLOW_LOW_MEMORY" =~ ^[01]$ && "$INSTALL_MISSING_PACKAGES" =~ ^[01]$ ]] || fail "Boolean deployment settings must be 0 or 1."
[[ -f "$SCRIPT_ROOT/cosmos-x-machina.apache.conf" && -f "$SCRIPT_ROOT/production/activate-release.sh" ]] || fail "Run the tracked repository copy of this script."
[[ -f "$COSMOS_ENV_FILE" ]] || fail "The existing production environment file was not found: $COSMOS_ENV_FILE"
[[ -f "$APACHE_SITE_FILE" ]] || fail "The existing Apache vhost was not found: $APACHE_SITE_FILE"
[[ -f "$APACHE_HTTP_SITE_FILE" ]] || fail "The existing Apache HTTP vhost was not found: $APACHE_HTTP_SITE_FILE"
id "$SERVICE_USER" >/dev/null 2>&1 || fail "Service user does not exist: $SERVICE_USER"
id "$UPLOAD_USER" >/dev/null 2>&1 || fail "SFTP upload user does not exist: $UPLOAD_USER"
getent group "$SERVICE_GROUP" >/dev/null || fail "Service group does not exist: $SERVICE_GROUP"
getent group "$UPLOAD_GROUP" >/dev/null || fail "Upload group does not exist: $UPLOAD_GROUP"
command -v apache2ctl >/dev/null || fail "Apache is not installed."
command -v systemctl >/dev/null || fail "systemd is required."

node_supported() {
  command -v node >/dev/null 2>&1 && node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=5)?0:1)'
}

install_node() {
  log "Installing the supported Node.js 22 runtime (no npm packages)"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  chmod a+r /etc/apt/keyrings/nodesource.gpg
  printf 'deb [arch=%s signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main\n' "$(dpkg --print-architecture)" > /etc/apt/sources.list.d/nodesource.list
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  node_supported || fail "Node 22.5 or newer could not be installed."
}

if [[ "$INSTALL_MISSING_PACKAGES" == "1" ]]; then
  log "Installing only compact production prerequisites"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gzip tar util-linux python3 python3-pip python3-venv
fi
node_supported || { [[ "$INSTALL_MISSING_PACKAGES" == "1" ]] && install_node || fail "Install Node 22.5 or newer."; }
python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)' || fail "Python 3.11 or newer is required."
for command in curl flock logger sha256sum tar; do command -v "$command" >/dev/null || fail "Missing command: $command"; done
NODE_BIN="$(readlink -f "$(command -v node)")"
runuser -u "$SERVICE_USER" -- test -r "$COSMOS_ENV_FILE" || fail "Service user $SERVICE_USER cannot read the preserved environment file. Adjust its owner/group, not its contents."
env_mode=$((8#$(stat -c %a "$COSMOS_ENV_FILE")))
(( (env_mode & 0022) == 0 )) || fail "The production environment file must not be writable by group or others."

install -d -o root -g root -m 0755 "$COSMOS_ROOT" "$COSMOS_ROOT/bin" "$COSMOS_ROOT/releases"
install -d -o root -g "$SERVICE_GROUP" -m 0750 "$COSMOS_ROOT/shared"
install -d -o "$UPLOAD_USER" -g "$UPLOAD_GROUP" -m 0750 "$INCOMING_DIR" "$STATUS_DIR"
install -d -o "$SERVICE_USER" -g "$SERVICE_GROUP" -m 0750 /var/lib/cosmos-analytics
free_kib=$(df -Pk "$COSMOS_ROOT" | awk 'NR==2 {print $4}')
((free_kib >= MIN_FREE_MIB * 1024)) || fail "At least ${MIN_FREE_MIB} MiB must be free."
memory_kib=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
if ((memory_kib < 512 * 1024)) && [[ "$ALLOW_LOW_MEMORY" != "1" ]]; then fail "Less than 512 MiB RAM is unsupported."; fi
if ((memory_kib < 768 * 1024)); then log "WARNING: RAM is below 768 MiB; resource ceilings will be important."; fi

log "Installing the shared runtime-only Python environment"
python3 -m venv "$COSMOS_ROOT/shared/venv"
"$COSMOS_ROOT/shared/venv/bin/python" -m pip install --disable-pip-version-check --no-cache-dir -r "$SCRIPT_ROOT/python_service/requirements-production.txt"
"$COSMOS_ROOT/shared/venv/bin/python" -m pip check
install -o root -g "$SERVICE_GROUP" -m 0640 "$SCRIPT_ROOT/python_service/requirements-production.txt" "$COSMOS_ROOT/shared/requirements-production.txt"
sha256sum "$SCRIPT_ROOT/python_service/requirements-production.txt" | awk '{print $1}' > "$COSMOS_ROOT/shared/requirements-production.sha256"
chmod 0640 "$COSMOS_ROOT/shared/requirements-production.sha256"

install -o root -g root -m 0755 "$SCRIPT_ROOT/production/activate-release.sh" "$COSMOS_ROOT/bin/activate-release.sh"
install -o root -g root -m 0644 "$SCRIPT_ROOT/production/verify-release.mjs" "$COSMOS_ROOT/bin/verify-release.mjs"

render_unit() {
  local source="$1" target="$2" temporary backup
  temporary="$(mktemp)"
  sed -e "s|@COSMOS_ROOT@|$COSMOS_ROOT|g" \
      -e "s|@COSMOS_ENV_FILE@|$COSMOS_ENV_FILE|g" \
      -e "s|@NODE_BIN@|$NODE_BIN|g" \
      -e "s|@SERVICE_USER@|$SERVICE_USER|g" \
      -e "s|@SERVICE_GROUP@|$SERVICE_GROUP|g" "$source" > "$temporary"
  backup="$COSMOS_ROOT/shared/$(basename "$target").before-apache-native"
  [[ ! -f "$target" || -e "$backup" ]] || cp -a "$target" "$backup"
  install -o root -g root -m 0644 "$temporary" "$target"
  rm -f -- "$temporary"
}

log "Reusing the configured systemd service names with low-resource units"
render_unit "$SCRIPT_ROOT/cosmos-contact.service" "/etc/systemd/system/$NODE_SERVICE"
render_unit "$SCRIPT_ROOT/cosmos-lab-python.service" "/etc/systemd/system/$PYTHON_SERVICE"
systemctl daemon-reload
systemctl enable "$PYTHON_SERVICE" "$NODE_SERVICE"

if [[ ! -L "$COSMOS_ROOT/current" ]]; then
  compgen -G "$INCOMING_DIR/cosmos-release-*.ready" >/dev/null || fail "Upload a verified release and its .ready marker before first bootstrap."
fi
if compgen -G "$INCOMING_DIR/cosmos-release-*.ready" >/dev/null; then
  "$COSMOS_ROOT/bin/activate-release.sh" --config "$CONFIG"
else
  systemctl restart "$PYTHON_SERVICE" "$NODE_SERVICE"
  NODE_HEALTH_URL=http://127.0.0.1:8787 PYTHON_HEALTH_URL=http://127.0.0.1:8790 node "$COSMOS_ROOT/current/runtime/smoke-release.mjs"
fi

log "Merging managed delivery and redirect blocks into the existing Apache/Certbot vhosts"
a2enmod proxy proxy_http headers expires deflate setenvif rewrite ssl >/dev/null
apache_backup="$(mktemp)"
http_backup="$(mktemp)"
cp -a "$APACHE_SITE_FILE" "$apache_backup"
cp -a "$APACHE_HTTP_SITE_FILE" "$http_backup"

configure_apache() {
  local target="$1" mode="$2" candidate
  candidate="$(mktemp)"
  if ! node "$SCRIPT_ROOT/scripts/configure-apache-site.mjs" \
    --template "$SCRIPT_ROOT/cosmos-x-machina.apache.conf" \
    --existing "$target" \
    --output "$candidate" \
    --app-root "$COSMOS_ROOT" \
    --domain "$DOMAIN" \
    --www-domain "$WWW_DOMAIN" \
    --mode "$mode"; then
    rm -f -- "$candidate"
    return 1
  fi
  install -o root -g root -m 0644 "$candidate" "$target"
  rm -f -- "$candidate"
}

apache_merge_ok=1
if [[ "$APACHE_HTTP_SITE_FILE" == "$APACHE_SITE_FILE" ]]; then
  configure_apache "$APACHE_SITE_FILE" auto || apache_merge_ok=0
else
  configure_apache "$APACHE_SITE_FILE" delivery || apache_merge_ok=0
  ((apache_merge_ok)) && configure_apache "$APACHE_HTTP_SITE_FILE" http || apache_merge_ok=0
fi
if (( ! apache_merge_ok )) || ! apache2ctl configtest; then
  cp -a "$apache_backup" "$APACHE_SITE_FILE"
  cp -a "$http_backup" "$APACHE_HTTP_SITE_FILE"
  apache2ctl configtest || true
  rm -f -- "$apache_backup" "$http_backup"
  fail "Apache rejected the managed configuration; the original vhost was restored."
fi
rm -f -- "$apache_backup" "$http_backup"
systemctl reload apache2

log "Installing marker-driven cron activation"
cat > /etc/cron.d/cosmosxmachina-release <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
* * * * * root $COSMOS_ROOT/bin/activate-release.sh --config $CONFIG >/dev/null 2>&1
EOF
chmod 0644 /etc/cron.d/cosmosxmachina-release

systemctl is-active --quiet apache2 cron "$PYTHON_SERVICE" "$NODE_SERVICE" || fail "A required production service is inactive."
public_status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 -H "Host: $DOMAIN" http://127.0.0.1/)"
[[ "$public_status" =~ ^(200|301|302|307|308)$ ]] || fail "Apache public route returned HTTP $public_status"
if [[ "$INSTALL_MISSING_PACKAGES" == "1" ]]; then apt-get clean; fi

log "Apache production bootstrap completed"
printf '%s\n' \
  "Static root: $COSMOS_ROOT/current/dist" \
  "Node gateway: 127.0.0.1:8787 via $NODE_SERVICE" \
  "Python pipeline: 127.0.0.1:8790 via $PYTHON_SERVICE" \
  "Environment: preserved at $COSMOS_ENV_FILE" \
  "Incoming SFTP releases: $INCOMING_DIR" \
  "Deployment status: $STATUS_DIR/active.json" \
  "AI behavior: fixture-only; external calls disabled" \
  "Public server: existing Apache/Certbot configuration"
