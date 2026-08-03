import { defineConfig } from "@playwright/test";

const sitePort = Number(process.env.E2E_SITE_PORT || 4173);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : undefined,
  use: {
    baseURL: `http://127.0.0.1:${sitePort}`,
    viewport: { width: 1280, height: 900 },
    trace: "on-first-retry",
    channel: "chromium",
    reducedMotion: "no-preference"
  },
  webServer: {
    command: `"${process.execPath}" scripts/e2e-stack.mjs`,
    url: `http://127.0.0.1:${sitePort}/portfolio/`,
    reuseExistingServer: false,
    timeout: 120_000
  },
  projects: [
    { name: "mobile", use: { viewport: { width: 360, height: 800 } } },
    { name: "tablet", use: { viewport: { width: 768, height: 900 } } },
    { name: "compact-desktop", use: { viewport: { width: 1024, height: 900 } } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } }
  ]
});
