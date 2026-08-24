import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production bootstrap is Apache-native and keeps build tools off the server", async () => {
  const bootstrap = await readFile("deploy-production.sh", "utf8");
  const apache = await readFile("cosmos-x-machina.apache.conf", "utf8");
  assert.doesNotMatch(bootstrap, /apt-get install[^\n]*(?:nginx|playwright|chromium|vite|vitest)/i);
  assert.doesNotMatch(bootstrap, /npm (?:ci|install|test|run build)/);
  assert.match(await readFile("scripts/build-production-release.mjs", "utf8"), /--untracked-files=all/);
  assert.match(bootstrap, /apache2ctl configtest/);
  assert.match(bootstrap, /runuser -u "\$SERVICE_USER" -- test -r "\$COSMOS_ENV_FILE"/);
  assert.match(apache, /DocumentRoot "@COSMOS_ROOT@\/current\/dist"/);
  assert.match(apache, /ProxyRequests Off/);
  assert.match(apache, /CustomLog "\/dev\/null"/);
  assert.match(apache, /RewriteRule \^ - \[F,L\]/);
  assert.match(apache, /<Directory "@COSMOS_ROOT@">\s+Require all denied/s);
});

test("legacy public-root policy exposes only the built site surface", async () => {
  const policy = await readFile("production/public-root.htaccess", "utf8");
  assert.match(policy, /privacy\\\.html\|robots\\\.txt\|sitemap\\\.xml/);
  assert.match(policy, /portfolio.*document-operations.*operations-hub.*knowledge-assistant.*kpi-studio/);
  assert.match(policy, /RewriteRule \^ - \[F,L\]/);
  assert.doesNotMatch(policy, /AGENTS|oroboros|acension/);
});

test("service templates enforce loopback-era resource ceilings and external env loading", async () => {
  const node = await readFile("cosmos-contact.service", "utf8");
  const python = await readFile("cosmos-lab-python.service", "utf8");
  assert.match(node, /MemoryMax=192M/);
  assert.match(node, /AI_MODE=fixture/);
  assert.match(node, /COSMOS_ENV_FILE=@COSMOS_ENV_FILE@/);
  assert.match(node, /Environment=PORT=8787/);
  assert.match(node, /Environment=PYTHON_LAB_URL=http:\/\/127\.0\.0\.1:8790/);
  assert.match(node, /Environment=VISIT_ANALYTICS_ENABLED=true/);
  assert.match(node, /Environment=VISIT_ANALYTICS_HOST=127\.0\.0\.1/);
  assert.match(node, /Environment=VISIT_ANALYTICS_MAX_HOURLY_VISITORS=5000/);
  assert.match(python, /MemoryMax=128M/);
  assert.match(python, /shared\/venv\/bin\/python/);
  assert.match(python, /Environment=PYTHON_LAB_PORT=8790/);
});
