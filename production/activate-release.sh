#!/usr/bin/env bash
# Root-owned cron target for prebuilt cosmosXmachina releases. It never installs
# dependencies or executes files from an archive before verification.
set -Eeuo pipefail
IFS=$'\n\t'

CONFIG="/opt/cosmosxmachina/deploy.conf"
if [[ "${1:-}" == "--config" && -n "${2:-}" ]]; then CONFIG="$2"; fi
TEST_ROOT="${COSMOS_ACTIVATION_TEST_ROOT:-}"
if [[ -n "$TEST_ROOT" ]]; then
  [[ "$TEST_ROOT" == /* && "$CONFIG" == "$TEST_ROOT"/* ]] || { printf 'Invalid activation test root.\n' >&2; exit 1; }
else
  [[ ${EUID:-$(id -u)} -eq 0 ]] || { printf 'activate-release must run as root.\n' >&2; exit 1; }
fi
[[ -r "$CONFIG" ]] || { printf 'Unreadable deployment config: %s\n' "$CONFIG" >&2; exit 1; }
if [[ -z "$TEST_ROOT" ]]; then
  [[ "$(stat -c %u "$CONFIG")" == "0" ]] || { printf 'Deployment config is not root-owned.\n' >&2; exit 1; }
  config_mode=$((8#$(stat -c %a "$CONFIG")))
  (( (config_mode & 0022) == 0 )) || { printf 'Deployment config is writable by group or others.\n' >&2; exit 1; }
fi
# shellcheck disable=SC1090
source "$CONFIG"

required=(COSMOS_ROOT INCOMING_DIR STATUS_DIR NODE_SERVICE PYTHON_SERVICE SERVICE_USER SERVICE_GROUP UPLOAD_USER UPLOAD_GROUP KEEP_RELEASES MIN_FREE_MIB ALLOW_LOW_MEMORY)
for name in "${required[@]}"; do [[ -n "${!name:-}" ]] || { printf 'Missing %s in %s\n' "$name" "$CONFIG" >&2; exit 1; }; done
for path in "$COSMOS_ROOT" "$INCOMING_DIR" "$STATUS_DIR"; do
  [[ "$path" == /* && "$path" != "/" && "$path" =~ ^/[A-Za-z0-9._/-]+$ ]] || { printf 'Unsafe deployment path: %s\n' "$path" >&2; exit 1; }
done
for service in "$NODE_SERVICE" "$PYTHON_SERVICE"; do [[ "$service" =~ ^[A-Za-z0-9_.@-]+\.service$ ]] || exit 1; done
[[ "$KEEP_RELEASES" =~ ^[0-9]+$ && "$KEEP_RELEASES" -ge 2 && "$KEEP_RELEASES" -le 5 ]] || exit 1
[[ "$MIN_FREE_MIB" =~ ^[0-9]+$ && "$MIN_FREE_MIB" -ge 100 && "$MIN_FREE_MIB" -le 10240 ]] || exit 1
[[ "$ALLOW_LOW_MEMORY" =~ ^[01]$ ]] || exit 1

NODE_BIN="${NODE_BIN:-$(command -v node)}"
VERIFIER="$COSMOS_ROOT/bin/verify-release.mjs"
RELEASES="$COSMOS_ROOT/releases"
CURRENT="$COSMOS_ROOT/current"
LOCK="$COSMOS_ROOT/activate.lock"
[[ "$NODE_BIN" == /* && -x "$NODE_BIN" && -r "$VERIFIER" ]] || { printf 'Deployment runtime or verifier is unavailable.\n' >&2; exit 1; }
exec 9>"$LOCK"
flock -n 9 || exit 0

mkdir -p "$INCOMING_DIR" "$STATUS_DIR" "$RELEASES"
shopt -s nullglob
markers=("$INCOMING_DIR"/cosmos-release-*.ready)
((${#markers[@]})) || exit 0
marker="${markers[0]}"
archive=""
checksum=""
release_id="unknown"
stage=""

write_status() {
  local state="$1" message="$2" target="$STATUS_DIR/release-${release_id}.json" temporary="$STATUS_DIR/.status-$$.json" active=""
  if [[ -L "$CURRENT" ]]; then active="$(basename "$(readlink -f "$CURRENT")")"; fi
  "$NODE_BIN" -e '
    const fs = require("node:fs");
    const [file,state,releaseId,message,active] = process.argv.slice(1);
    fs.writeFileSync(file, JSON.stringify({schemaVersion:1,state,releaseId,message,activeRelease:active||null,updatedAt:new Date().toISOString()})+"\n", {mode:0o640});
  ' "$temporary" "$state" "$release_id" "$message" "$active"
  mv -f -- "$temporary" "$target"
  cp -f -- "$target" "$STATUS_DIR/active.json"
  chown "$UPLOAD_USER:$UPLOAD_GROUP" "$target" "$STATUS_DIR/active.json" 2>/dev/null || true
}

discard_incoming() {
  [[ -z "$archive" || "$archive" != "$INCOMING_DIR"/* ]] || rm -f -- "$archive"
  [[ -z "$checksum" || "$checksum" != "$INCOMING_DIR"/* ]] || rm -f -- "$checksum"
  [[ "$marker" != "$INCOMING_DIR"/* ]] || rm -f -- "$marker"
}

reject() {
  local message="$1"
  write_status failed "$message" || true
  [[ -z "$stage" || "$stage" != "$RELEASES"/.staging-* ]] || rm -rf -- "$stage"
  discard_incoming
  printf '[cosmosXmachina] Release %s rejected: %s\n' "$release_id" "$message" >&2
  exit 1
}

[[ -f "$marker" && ! -L "$marker" && $(stat -c %s "$marker") -le 4096 ]] || reject "Ready marker is not a small regular file"
marker_output="$("$NODE_BIN" -e '
  const fs=require("node:fs"); const value=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
  if(value.schemaVersion!==1||!/^[a-z0-9][a-z0-9.-]{6,94}[a-z0-9]$/i.test(value.releaseId||"")||!/^[a-f0-9]{64}$/.test(value.sha256||"")||value.archive!==`cosmos-release-${value.releaseId}.tar.gz`) process.exit(2);
  console.log(value.releaseId); console.log(value.archive); console.log(value.sha256);
' "$marker")" || reject "Invalid ready marker"
mapfile -t marker_values <<< "$marker_output"
release_id="${marker_values[0]}"
archive="$INCOMING_DIR/${marker_values[1]}"
expected_hash="${marker_values[2]}"
checksum="$archive.sha256"
[[ -f "$archive" && ! -L "$archive" && -f "$checksum" && ! -L "$checksum" ]] || reject "Archive or checksum is missing or unsafe"
[[ "$(sha256sum "$archive" | awk '{print $1}')" == "$expected_hash" ]] || reject "Archive checksum does not match the ready marker"
IFS=' ' read -r checksum_hash checksum_name < "$checksum" || reject "Unreadable checksum file"
[[ "$checksum_hash" == "$expected_hash" && "$checksum_name" == "$(basename "$archive")" ]] || reject "Checksum file is invalid"
[[ $(stat -c %s "$archive") -le $((8 * 1024 * 1024)) ]] || reject "Archive exceeds 8 MiB"

free_kib=$(df -Pk "$COSMOS_ROOT" | awk 'NR==2 {print $4}')
((free_kib >= MIN_FREE_MIB * 1024)) || reject "Less than ${MIN_FREE_MIB} MiB is free"
memory_kib=$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)
if ((memory_kib < 512 * 1024)) && [[ "$ALLOW_LOW_MEMORY" != "1" ]]; then reject "Server has less than 512 MiB RAM"; fi
if ((memory_kib < 768 * 1024)); then printf '[cosmosXmachina] Warning: total RAM is below 768 MiB.\n' >&2; fi

stage="$RELEASES/.staging-${release_id}-$$"
final="$RELEASES/$release_id"
rm -rf -- "$stage"
mkdir -p "$stage"
listing="$(tar -tzf "$archive")" || reject "Archive cannot be listed"
while IFS= read -r entry; do
  clean="${entry#./}"
  [[ "$clean" != /* && "$clean" != ".." && "$clean" != ../* && "$clean" != *"/../"* ]] || reject "Archive contains an unsafe path"
done <<< "$listing"
tar --no-same-owner --no-same-permissions -xzf "$archive" -C "$stage" || reject "Archive extraction failed"
find "$stage" -type d -exec chmod 0755 {} +
find "$stage" -type f -exec chmod 0644 {} +
[[ -r "$COSMOS_ROOT/shared/requirements-production.sha256" ]] || reject "Bootstrap requirement fingerprint is missing"
expected_requirements="$(cat "$COSMOS_ROOT/shared/requirements-production.sha256")"
"$NODE_BIN" "$VERIFIER" "$stage" --release "$release_id" --requirements "$expected_requirements" >/dev/null || reject "Manifest verification failed or bootstrap is required"

if [[ ! -d "$final" ]]; then
  mv -- "$stage" "$final"
  stage=""
else
  "$NODE_BIN" "$VERIFIER" "$final" --release "$release_id" --requirements "$expected_requirements" >/dev/null || reject "Existing release directory failed reverification"
  rm -rf -- "$stage"
  stage=""
fi
previous="$(readlink -f "$CURRENT" 2>/dev/null || true)"
[[ -z "$previous" || "$previous" == "$RELEASES"/* ]] || reject "Current release points outside the protected release directory"

component() {
  [[ -f "$1/manifest.json" ]] || return 0
  "$NODE_BIN" -e 'const m=require(process.argv[1]); console.log(m.components[process.argv[2]]||"")' "$1/manifest.json" "$2"
}
old_node="$(component "$previous" node)"
old_python="$(component "$previous" python)"
new_node="$(component "$final" node)"
new_python="$(component "$final" python)"

next="$COSMOS_ROOT/.current-${release_id}-$$"
ln -s "$final" "$next"
mv -Tf -- "$next" "$CURRENT"

wait_for() {
  local url="$1"
  for _ in {1..30}; do curl -fsS --max-time 2 "$url" >/dev/null 2>&1 && return 0; sleep 0.5; done
  return 1
}

activate_services() {
  if [[ -z "$previous" || "$old_python" != "$new_python" ]] || ! systemctl is-active --quiet "$PYTHON_SERVICE"; then
    systemctl restart "$PYTHON_SERVICE" || return 1
  fi
  wait_for http://127.0.0.1:8790/health || return 1
  if [[ -z "$previous" || "$old_node" != "$new_node" ]] || ! systemctl is-active --quiet "$NODE_SERVICE"; then
    systemctl restart "$NODE_SERVICE" || return 1
  fi
  wait_for http://127.0.0.1:8787/api/lab/health || return 1
  "$NODE_BIN" "$CURRENT/runtime/smoke-release.mjs" >/dev/null || return 1
}

if ! activate_services; then
  if [[ -n "$previous" ]]; then
    rollback="$COSMOS_ROOT/.rollback-$$"
    ln -s "$previous" "$rollback"
    mv -Tf -- "$rollback" "$CURRENT"
    systemctl restart "$PYTHON_SERVICE" "$NODE_SERVICE" || true
  else
    rm -f -- "$CURRENT"
    systemctl stop "$PYTHON_SERVICE" "$NODE_SERVICE" || true
  fi
  write_status failed "Health verification failed; previous release restored"
  discard_incoming
  exit 1
fi

write_status active "Release activated and locally verified"
discard_incoming

mapfile -t releases < <(find "$RELEASES" -mindepth 1 -maxdepth 1 -type d ! -name '.*' -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
active_directory="$(readlink -f "$CURRENT")"
rollback_kept=0
for directory in "${releases[@]}"; do
  [[ "$directory" == "$active_directory" ]] && continue
  if ((rollback_kept < KEEP_RELEASES - 1)); then ((rollback_kept+=1)); continue; fi
  [[ "$directory" == "$RELEASES"/* ]] && rm -rf -- "$directory"
done
find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -name '.staging-*' -mtime +1 -exec rm -rf -- {} +
mapfile -t statuses < <(find "$STATUS_DIR" -maxdepth 1 -type f -name 'release-*.json' -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)
for ((index=10; index<${#statuses[@]}; index++)); do rm -f -- "${statuses[index]}"; done
printf '[cosmosXmachina] Activated release %s.\n' "$release_id"
