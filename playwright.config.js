import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 900 },
    trace: "on-first-retry",
    channel: "chromium",
    reducedMotion: "no-preference"
  },
  webServer: {
    command: `"${process.execPath}" scripts/e2e-stack.mjs`,
    url: "http://127.0.0.1:4173/portfolio/",
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
