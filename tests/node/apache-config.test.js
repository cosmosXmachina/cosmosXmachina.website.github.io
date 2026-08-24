import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mergeApacheSite, renderApacheTemplate } from "../../scripts/configure-apache-site.mjs";

test("Apache merge preserves TLS while installing one dist-only delivery block", async () => {
  const template = await readFile("cosmos-x-machina.apache.conf", "utf8");
  const settings = { appRoot: "/opt/cosmosxmachina", domain: "example.test", wwwDomain: "www.example.test" };
  const rendered = renderApacheTemplate(template, settings);
  const existing = `<VirtualHost *:80>
  ServerName example.test
  ServerAlias www.example.test
  Redirect permanent / https://example.test/
</VirtualHost>
<VirtualHost *:443>
  ServerName example.test
  ServerAlias www.example.test
  DocumentRoot /srv/old-public-root
  Alias /assets/ /srv/old-assets/
  Alias /.well-known/acme-challenge/ /srv/acme/
  CustomLog /var/log/apache2/example-access.log combined
  ProxyPass /api/ http://127.0.0.1:8787/api/
  ProxyPassReverse /api/ http://127.0.0.1:8787/api/
  ProxyPass /assets/ http://127.0.0.1:9999/
  RewriteEngine On
  RewriteRule ^/assets /srv/rewrite [L]
  SSLEngine on
  SSLCertificateFile /etc/letsencrypt/live/example.test/fullchain.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/example.test/privkey.pem
</VirtualHost>
`;

  const merged = mergeApacheSite(existing, rendered, settings);
  assert.match(merged, /SSLCertificateFile \/etc\/letsencrypt\/live\/example\.test\/fullchain\.pem/);
  assert.match(merged, /DocumentRoot "\/opt\/cosmosxmachina\/current\/dist"/);
  assert.match(merged, /ProxyRequests Off/);
  assert.match(merged, /ProxyPass "\/api\/" "http:\/\/127\.0\.0\.1:8787\/api\/"/);
  assert.match(merged, /COSMOS_VISIT %a %>s %m/);
  assert.match(merged, /\/usr\/bin\/logger --server 127\.0\.0\.1/);
  assert.match(merged, /Strict-Transport-Security "max-age=31536000; includeSubDomains"/);
  assert.match(merged, /Alias \/\.well-known\/acme-challenge\/ \/srv\/acme\//);
  assert.doesNotMatch(merged, /example-access\.log|\/srv\/old-public-root|\/srv\/old-assets|127\.0\.0\.1:9999|\/srv\/rewrite/);
  assert.equal((merged.match(/BEGIN COSMOS APACHE DELIVERY/g) || []).length, 1);
  assert.equal((merged.match(/BEGIN COSMOS APACHE PRIVATE LOG/g) || []).length, 1);

  const repeated = mergeApacheSite(merged, rendered, settings);
  assert.equal((repeated.match(/BEGIN COSMOS APACHE DELIVERY/g) || []).length, 1);
  assert.equal((repeated.match(/BEGIN COSMOS APACHE PRIVATE LOG/g) || []).length, 1);
  assert.equal((repeated.match(/SSLCertificateFile/g) || []).length, 1);
});

test("separate Apache HTTP and HTTPS files receive distinct managed roles", async () => {
  const template = await readFile("cosmos-x-machina.apache.conf", "utf8");
  const settings = { appRoot: "/opt/cosmosxmachina", domain: "example.test", wwwDomain: "www.example.test" };
  const rendered = renderApacheTemplate(template, settings);
  const http = mergeApacheSite(`<VirtualHost *:80>\nServerName example.test\nServerAlias www.example.test\n</VirtualHost>\n`, rendered, { ...settings, mode: "http" });
  const https = mergeApacheSite(`<VirtualHost *:443>\nServerName example.test\nServerAlias www.example.test\nSSLEngine on\nSSLCertificateFile /tls/fullchain.pem\n</VirtualHost>\n`, rendered, { ...settings, mode: "delivery" });

  assert.match(http, /RewriteRule \^ https:\/\/example\.test%\{REQUEST_URI\}/);
  assert.doesNotMatch(http, /DocumentRoot|ProxyPass/);
  assert.match(https, /DocumentRoot "\/opt\/cosmosxmachina\/current\/dist"/);
  assert.match(https, /SSLCertificateFile \/tls\/fullchain\.pem/);
  assert.doesNotMatch(https, /@DOMAIN@|@WWW_DOMAIN@/);
});
