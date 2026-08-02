import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = "http://127.0.0.1:4173";
const output = resolve("assets", "portfolio");
const stack = spawn(process.execPath, ["scripts/e2e-stack.mjs"], {
  cwd: resolve("."), stdio: "inherit", windowsHide: true
});

async function waitFor(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function capture(page, name, anchor) {
  await page.locator(anchor).scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: resolve(output, `${name}.jpg`), type: "jpeg", quality: 84 });
}

let browser;
try {
  await waitFor(`${base}/portfolio/`);
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: "chromium", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce" });

  await page.goto(`${base}/portfolio/document-operations/?lang=en`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Dolomiti Automation/ }).click();
  await page.getByRole("button", { name: "Classify and extract" }).click();
  await page.getByLabel("Requested date").waitFor();
  await capture(page, "document-operations", ".workstation");

  await page.goto(`${base}/portfolio/operations-hub/?lang=en`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Generate risk brief" }).click();
  await page.locator(".brief").waitFor();
  await capture(page, "operations-hub", ".brief");

  await page.goto(`${base}/portfolio/knowledge-assistant/?lang=en`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "What is the replacement process for Gold customers?" }).click();
  await page.getByRole("button", { name: "Search permitted sources" }).click();
  await page.getByRole("button", { name: "Evaluate answer" }).click();
  await page.getByText("Supported", { exact: true }).waitFor();
  await capture(page, "knowledge-assistant", ".research");

  await page.goto(`${base}/portfolio/kpi-studio/?lang=en`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Generate decision note" }).click();
  await page.locator(".narrative").waitFor();
  await capture(page, "kpi-studio", ".narrative");
} finally {
  await browser?.close();
  if (!stack.killed) stack.kill("SIGTERM");
}

console.log(`Captured four verified previews in ${output}.`);
