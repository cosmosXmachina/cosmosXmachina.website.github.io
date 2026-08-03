import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mergeNginxSite, renderNginxTemplate } from "../../scripts/configure-nginx-site.mjs";

test("Nginx merge preserves TLS while replacing disk access logs with managed delivery rules", async () => {
  const template = await readFile("cosmos-x-machina.nginx", "utf8");
  const settings = { appRoot: "/srv/cosmos", domain: "example.test", wwwDomain: "www.example.test" };
  const rendered = renderNginxTemplate(template, settings);
  const existing = `server {
    listen 443 ssl;
    server_name example.test www.example.test;
    root /srv/cosmos/dist;
    access_log /var/log/nginx/example.access.log;
    ssl_certificate /etc/letsencrypt/live/example.test/fullchain.pem;
    location /api/ { proxy_pass http://127.0.0.1:8787; }
}
server {
    listen 80;
    server_name example.test www.example.test;
    return 301 https://$host$request_uri;
}`;

  const merged = mergeNginxSite(existing, rendered, settings);
  assert.match(merged, /ssl_certificate \/etc\/letsencrypt\/live\/example\.test\/fullchain\.pem/);
  assert.match(merged, /log_format cosmos_visit/);
  assert.match(merged, /access_log syslog:server=127\.0\.0\.1:5514/);
  assert.match(merged, /if \(\$host = www\.example\.test\) \{ return 301 https:\/\/example\.test\$request_uri; \}/);
  assert.match(merged, /gzip on;/);
  assert.match(merged, /location \/api\/ \{\s+access_log off;/);
  assert.doesNotMatch(merged, /example\.access\.log/);
  assert.equal((merged.match(/log_format cosmos_visit/g) || []).length, 1);
  assert.equal((merged.match(/access_log syslog:/g) || []).length, 1);

  const repeated = mergeNginxSite(merged, rendered, settings);
  assert.equal((repeated.match(/log_format cosmos_visit/g) || []).length, 1);
  assert.equal((repeated.match(/access_log syslog:/g) || []).length, 1);
  assert.doesNotMatch(repeated, /example\.access\.log/);
});
