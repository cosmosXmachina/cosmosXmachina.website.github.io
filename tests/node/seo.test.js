import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicPages = [
  ["index.html", "https://cosmos-x-machina.it/"],
  ["privacy.html", "https://cosmos-x-machina.it/privacy.html"],
  ["portfolio/index.html", "https://cosmos-x-machina.it/portfolio/"],
  ["portfolio/document-operations/index.html", "https://cosmos-x-machina.it/portfolio/document-operations/"],
  ["portfolio/operations-hub/index.html", "https://cosmos-x-machina.it/portfolio/operations-hub/"],
  ["portfolio/knowledge-assistant/index.html", "https://cosmos-x-machina.it/portfolio/knowledge-assistant/"],
  ["portfolio/kpi-studio/index.html", "https://cosmos-x-machina.it/portfolio/kpi-studio/"]
];

test("every public page has complete indexable metadata and valid structured data", async () => {
  for (const [file, canonical] of publicPages) {
    const html = await readFile(file, "utf8");
    assert.match(html, /<meta[^>]*name="robots"[^>]*content="index,follow/);
    assert.ok(html.includes(`<link${file === "index.html" || file === "privacy.html" ? " id=\"canonicalUrl\"" : ""} rel="canonical" href="${canonical}">`));
    for (const language of ["it", "en", "x-default"]) assert.ok(html.includes(`hreflang="${language}"`));
    assert.match(html, /<meta name="description" content="[^\"]{40,}/);
    assert.match(html, /property="og:title"/);
    assert.match(html, /name="twitter:card" content="summary_large_image"/);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(match[1]), `${file} has invalid JSON-LD`);
    }
  }
});

test("robots and sitemap expose only the canonical public route set", async () => {
  const [robots, sitemap] = await Promise.all([readFile("robots.txt", "utf8"), readFile("sitemap.xml", "utf8")]);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Sitemap: https:\/\/cosmos-x-machina\.it\/sitemap\.xml/);
  assert.equal((sitemap.match(/<url>/g) || []).length, publicPages.length * 3);
  for (const [, canonical] of publicPages) assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
  assert.doesNotMatch(sitemap, /index_temp|index2D|design=/);
});
