import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { build } from "vite";

const root = resolve(".");
const dist = resolve(root, "dist");
const assetsSource = resolve(root, "assets");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, "index.html"), resolve(dist, "index.html"));
await cp(assetsSource, resolve(dist, "assets"), {
  recursive: true,
  filter(source) {
    const pathParts = relative(assetsSource, source).split(sep);
    return !pathParts.includes("concepts") && !source.toLowerCase().endsWith(".png");
  }
});
await build({ configFile: resolve(root, "vite.config.js") });

const assetsDirectory = resolve(dist, "assets");
const assets = await readdir(assetsDirectory);
const budgets = [
  { pattern: /^kpiStudio-.*\.js$/, bytes: 550 * 1024 },
  { pattern: /^i18n-.*\.js$/, bytes: 230 * 1024 },
  {
    pattern: /^(documentOperations|operationsHub|knowledgeAssistant)-.*\.js$/,
    bytes: 100 * 1024
  }
];

for (const file of assets) {
  const budget = budgets.find((item) => item.pattern.test(file));
  if (!budget) continue;
  const size = (await stat(resolve(assetsDirectory, file))).size;
  if (size > budget.bytes) {
    throw new Error(file + " exceeds its performance budget: " + size + " > " + budget.bytes);
  }
}

const forbiddenPublicFiles = (await filesBelow(dist)).filter((file) => {
  const name = file.split(/[\\/]/).at(-1).toLowerCase();
  return /^(\.env|vash_key)/.test(name) || /\.(md|txt|doc|docx|pem|key)$/.test(name);
});
if (forbiddenPublicFiles.length) {
  throw new Error("Forbidden files entered dist/: " + forbiddenPublicFiles.join(", "));
}

const publicFiles = await filesBelow(dist);
const publicBytes = (await Promise.all(publicFiles.map(async (file) => (await stat(file)).size)))
  .reduce((total, size) => total + size, 0);
if (publicBytes > 8 * 1024 * 1024) {
  throw new Error(`dist/ exceeds its 8 MiB release budget: ${publicBytes} bytes`);
}

const forbiddenContent = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com|api\.x\.ai|openrouter\.ai\/api)\b/i,
  /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,})\b/
];
for (const file of publicFiles.filter((path) => /\.(?:css|html|js|json|map|svg|txt)$/i.test(path))) {
  const contents = await readFile(file, "utf8");
  if (forbiddenContent.some((pattern) => pattern.test(contents))) {
    throw new Error(`Forbidden secret or provider-network content entered dist/: ${relative(dist, file)}`);
  }
}

for (const file of publicFiles.filter((path) => /assets[\\/]portfolio[\\/].+\.jpg$/i.test(path))) {
  const size = (await stat(file)).size;
  if (size > 250 * 1024) throw new Error(`${relative(dist, file)} exceeds the 250 KiB preview budget`);
}

console.log(`Built the public site in dist/ (${(publicBytes / 1024 / 1024).toFixed(2)} MiB).`);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  }));
  return nested.flat();
}
