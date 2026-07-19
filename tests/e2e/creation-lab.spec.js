import { expect, test } from "@playwright/test";

const slugs = [
  "document-operations",
  "operations-hub",
  "knowledge-assistant",
  "catalog-intelligence",
  "lead-appointment",
  "kpi-studio",
  "integration-control",
  "architecture-rescue",
  "workflow-audit",
  "opportunity-scout"
];

test("portfolio publishes all ten complete bilingual entries", async ({ page }) => {
  await page.goto("/portfolio/?lang=en");
  await expect(page.locator("article.demo-card")).toHaveCount(10);
  await expect(page.getByText("Synthetic demonstration", { exact: false }).first()).toBeVisible();
  for (const slug of slugs) {
    await expect(page.locator('a[href*="' + slug + '"]')).toHaveCount(1);
  }
});

test("every demo is usable and makes no external AI-provider request", async ({ page }) => {
  const forbidden = [];
  page.on("request", (request) => {
    if (/openai|anthropic|gemini|openrouter|groq/i.test(request.url())) forbidden.push(request.url());
  });

  for (const slug of slugs) {
    await page.goto("/portfolio/" + slug + "/?lang=en");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByText("Synthetic demonstration. Orion Works is fictional and all data is synthetic.", { exact: true })).toBeVisible();
  }
  expect(forbidden).toEqual([]);
});

test("document workflow returns deterministic evidence", async ({ page }) => {
  await page.goto("/portfolio/document-operations/?lang=en");
  await page.getByRole("button", { name: "Classify and extract" }).click();
  await expect(page.getByText("purchase_order")).toBeVisible();
  await expect(page.getByText("NW-8841", { exact: true })).toBeVisible();
});

test("homepage exposes the bilingual four-demo portfolio preview", async ({ page }) => {
  await page.goto("/?lang=en");
  await expect(page.locator('a[href="#portfolio"]')).toHaveText("Portfolio");
  await expect(page.locator("#portfolio h2")).toHaveText("Systems to use, inspect and challenge.");
  await expect(page.locator("#portfolio article.portfolio-preview")).toHaveCount(4);
});

test("demo CTA transfers an expiring reviewable summary to contact", async ({ page }) => {
  await page.goto("/portfolio/workflow-audit/?lang=en");
  await page.getByRole("button", { name: "Transfer this analysis to contact Next" }).click();
  await expect(page).toHaveURL(/\?lang=en#contact$/);
  await expect(page.locator("#problemInput")).toHaveValue(/Automation is often selected by intuition/);
  await expect(page.locator("#formStatus")).toContainText("Review it before sending");
  const handoff = await page.evaluate(() => JSON.parse(sessionStorage.getItem("cosmos-lab-handoff")));
  expect(handoff.expiresAt).toBeGreaterThan(Date.now());
});

test("knowledge assistant visibly abstains on a restricted prompt", async ({ page }) => {
  await page.goto("/portfolio/knowledge-assistant/?lang=en");
  await page.getByRole("button", { name: "Try a disallowed request" }).click();
  await expect(page.getByRole("heading", { name: "Atlas abstained" })).toBeVisible();
  await expect(page.getByText("No permitted evidence supports this answer.")).toBeVisible();
});
