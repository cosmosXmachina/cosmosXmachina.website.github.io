import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "vite";

const root = resolve(".");
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, "index.html"), resolve(dist, "index.html"));
await cp(resolve(root, "assets"), resolve(dist, "assets"), { recursive: true });
await build({ configFile: resolve(root, "vite.config.js") });
await cp(
  resolve(root, "portfolio", "opportunity-scout", "extension"),
  resolve(dist, "portfolio", "opportunity-scout", "extension"),
  { recursive: true }
);


const assetsDirectory = resolve(dist, "assets");
const assets = await readdir(assetsDirectory);
const budgets = [
  { pattern: /^kpiStudio-.*\.js$/, bytes: 550 * 1024 },
  { pattern: /^i18n-.*\.js$/, bytes: 230 * 1024 },
  {
    pattern: /^(documentOperations|operationsHub|knowledgeAssistant|catalogIntelligence|leadAppointment|integrationControl|architectureRescue|workflowAudit|opportunityScout)-.*\.js$/,
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
console.log("Built the public site in dist/.");
