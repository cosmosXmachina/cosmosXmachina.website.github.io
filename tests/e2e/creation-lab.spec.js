import { expect, test } from "@playwright/test";

const slugs = [
  "document-operations",
  "operations-hub",
  "knowledge-assistant",
  "kpi-studio"
];

const navigate = (page, path) => page.goto(path, { waitUntil: "domcontentloaded" });

test("portfolio publishes the four active bilingual entries", async ({ page }) => {
  await navigate(page, "/portfolio/?lang=en");
  await expect(page.locator("article.demo-card")).toHaveCount(4);
  await expect(page.getByText("Synthetic demonstration", { exact: false }).first()).toBeVisible();
  for (const slug of slugs) {
    await expect(page.locator('a[href*="' + slug + '"]')).toHaveCount(1);
  }
});

test("every demo loads on the static-only topology without Lab or provider requests", async ({ page }) => {
  const forbidden = [];
  const consoleErrors = [];
  page.on("request", (request) => {
    if (/\/api\/lab(?:\/|$)|api\.openai\.com|generativelanguage\.googleapis\.com|api\.anthropic\.com|api\.x\.ai|openrouter\.ai/i.test(request.url())) forbidden.push(request.url());
  });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  for (const slug of slugs) {
    await navigate(page, "/portfolio/" + slug + "/?lang=en");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.getByText("Synthetic demonstration. Orion Works is fictional and all data is synthetic.", { exact: true })).toBeVisible();
  }
  expect(forbidden).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("document workflow returns deterministic evidence", async ({ page }) => {
  await navigate(page, "/portfolio/document-operations/?lang=en");
  await page.getByRole("button", { name: "Classify and extract" }).click();
  await expect(page.getByLabel("Category")).toHaveValue("purchase_order");
  await expect(page.getByLabel("Order reference")).toHaveValue("NW-8841");
});

test("homepage exposes the bilingual four-demo portfolio preview", async ({ page }) => {
  await navigate(page, "/?lang=en");
  await expect(page.locator('a[href="#portfolio"]')).toHaveText("Portfolio");
  await expect(page.locator("#portfolio h2")).toHaveText("Four systems to use, inspect and challenge.");
  await page.locator("#portfolio").scrollIntoViewIfNeeded();
  await expect(page.locator("#portfolio article.portfolio-preview")).toHaveCount(4);
  await expect(page.locator("#portfolio img.portfolio-media")).toHaveCount(4);
  await expect(page.locator("#portfolio img.portfolio-media").first()).toHaveJSProperty("complete", true);
  await expect(page.locator("#portfolio a.preview-link").first()).toHaveAttribute("target", "_blank");
  await expect(page.locator("#portfolio a.preview-link").first()).toHaveAttribute("rel", "noopener");
  await expect(page.locator("#portfolioAll")).toHaveAttribute("target", "_blank");
  await expect(page.locator("#portfolioAll")).toHaveAttribute("rel", "noopener");
});

test("privacy notice documents cookie-free aggregate measurement without a consent banner", async ({ page }) => {
  await navigate(page, "/?lang=en");
  await expect(page.locator("#privacyFormLink")).toHaveText("privacy notice");
  await expect(page.locator("#privacyFooterLink")).toHaveAttribute("href", "/privacy.html?lang=en");

  await navigate(page, "/privacy.html?lang=en");
  await expect(page.locator("article:not([hidden]) h1")).toHaveText("Privacy and local technologies.");
  await expect(page.getByText("No profiling cookies.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /accept|reject/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.cookie)).toBe("");

  await page.getByRole("button", { name: "IT" }).click();
  await expect(page).not.toHaveURL(/(?:\?|&)lang=/);
  await expect(page.locator("article:not([hidden]) h1")).toHaveText("Privacy e tecnologie locali.");
});

test("language URLs expose matching canonical, social, and alternate metadata", async ({ page }) => {
  await navigate(page, "/?lang=en");
  await expect(page).toHaveTitle("cosmosXmachina | Custom software and AI automation");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://cosmos-x-machina.it/?lang=en");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  await expect(page.locator('link[hreflang="it"]')).toHaveAttribute("href", "https://cosmos-x-machina.it/?lang=it");

  await navigate(page, "/portfolio/document-operations/?lang=it");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://cosmos-x-machina.it/portfolio/document-operations/?lang=it");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Posta in ingresso/);

  await navigate(page, "/?design=hermetic-observatory&lang=en");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
});

test("demo CTA transfers an expiring reviewable summary to contact", async ({ page }) => {
  await navigate(page, "/portfolio/document-operations/?lang=en");
  await page.getByRole("button", { name: "Transfer this case to contact Next" }).click();
  await expect(page).toHaveURL(/\?lang=en#contact$/);
  await expect(page.locator("#problemInput")).toHaveValue(/Requests arrive across email and attachments/);
  await expect(page.locator("#formStatus")).toContainText("Review it before sending");
  const handoff = await page.evaluate(() => JSON.parse(sessionStorage.getItem("cosmos-lab-handoff")));
  expect(handoff.expiresAt).toBeGreaterThan(Date.now());
});

test("knowledge assistant visibly abstains on a restricted prompt", async ({ page }) => {
  await navigate(page, "/portfolio/knowledge-assistant/?lang=en");
  await page.getByRole("button", { name: "Try a disallowed request" }).click();
  await expect(page.getByRole("heading", { name: "Atlas abstained" })).toBeVisible();
  await expect(page.getByText("The request attempts to override retrieval permissions.")).toBeVisible();
});

test("homepage opens a selected demo in a focused new tab", async ({ page }) => {
  await navigate(page, "/?lang=en#portfolio");
  const homeUrl = page.url();
  const [demoPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator("#portfolio a.preview-link").first().click()
  ]);
  await demoPage.waitForLoadState("domcontentloaded");
  await expect(demoPage).toHaveURL(/portfolio\/document-operations\/\?lang=en/);
  await expect(demoPage.locator("h1")).toHaveText("Document Operations");
  expect(page.url()).toBe(homeUrl);
  await demoPage.close();
});

test("homepage opens Creation Lab in a focused new tab", async ({ page }) => {
  await navigate(page, "/?lang=en#portfolio");
  const homeUrl = page.url();
  const [labPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator("#portfolioAll").click()
  ]);
  await labPage.waitForLoadState("domcontentloaded");
  await expect(labPage).toHaveURL(/portfolio\/?\?lang=en/);
  await expect(labPage.locator("h1")).toHaveText("Creation Lab");
  expect(page.url()).toBe(homeUrl);
  await labPage.close();
});

test("document exception requires correction before a human approval", async ({ page }) => {
  await navigate(page, "/portfolio/document-operations/?lang=en");
  await page.getByRole("button", { name: /Dolomiti Automation/ }).click();
  await page.getByRole("button", { name: "Classify and extract" }).click();
  await expect(page.getByLabel("Requested date")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Approve" })).toBeDisabled();
  await page.getByLabel("Requested date").fill("2026-08-20");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("approved", { exact: true }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Reopen review" })).toBeEnabled();
});

test("operations mutations are transactional, persisted and role protected", async ({ page }) => {
  await navigate(page, "/portfolio/operations-hub/?lang=en");
  await page.getByLabel("Internal note").fill("Confirm the revised delivery promise.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved in this browser");
  await page.getByRole("button", { name: /Advance state -> packing/i }).click();
  await expect(page.getByRole("status")).toHaveText("OW-2418 -> packing");
  await page.getByRole("button", { name: "Generate risk brief" }).click();
  await expect(page.getByRole("heading", { name: /Delivery promise is exposed/ })).toBeVisible();
  await page.getByLabel("Current role").selectOption("sales");
  await page.getByRole("button", { name: /OW-2419/ }).click();
  await expect(page.getByRole("button", { name: "Role cannot advance" })).toBeDisabled();
});

test("Operations Hub restores IndexedDB state and supports a deterministic reset", async ({ page }) => {
  await navigate(page, "/portfolio/operations-hub/?lang=en");
  await page.getByLabel("Internal note").fill("Persist this browser-local checkpoint.");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("status")).toHaveText("Note saved in this browser");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Internal note")).toHaveValue("Persist this browser-local checkpoint.");
  await page.getByRole("button", { name: "Reset data" }).click();
  await expect(page.getByRole("status")).toHaveText("Workspace reset");
  await expect(page.getByLabel("Internal note")).toHaveValue("Verify availability and delivery promise before confirmation.");
});

test("Operations Hub recovers visibly from stale persisted state", async ({ page }) => {
  await navigate(page, "/portfolio/operations-hub/?lang=en");
  await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("cosmos-creation-lab", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("demo-state", "readwrite");
      transaction.objectStore("demo-state").put({ schema: 0, orders: [] }, "operations-hub");
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("status")).toHaveText("Local state was unavailable, so the synthetic dataset was restored.");
  await expect(page.getByRole("button", { name: /OW-2418/ })).toBeVisible();
});

test("knowledge answer is cited, evaluated and reviewable", async ({ page }) => {
  await navigate(page, "/portfolio/knowledge-assistant/?lang=en");
  await page.getByRole("button", { name: "What is the replacement process for Gold customers?" }).click();
  await page.getByRole("button", { name: "Search permitted sources" }).click();
  await expect(page.getByRole("heading", { name: /Gold customers may request/ })).toBeVisible();
  await expect(page.getByText("2 citations", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Evaluate answer" }).click();
  await expect(page.getByText("Supported", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Useful" }).click();
  await expect(page.getByText("Recorded in this session only", { exact: true })).toBeVisible();
});

test("KPI workflow keeps deterministic metrics separate from localized narrative", async ({ page }) => {
  await navigate(page, "/portfolio/kpi-studio/?lang=it");
  await page.getByRole("combobox", { name: /Periodo/ }).selectOption("3");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByText("3 righe", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Genera nota decisionale" }).click();
  await expect(page.getByRole("heading", { name: /I ricavi crescono/ })).toBeVisible();
  await expect(page.getByText("Campione sintetico di 3 mesi", { exact: true })).toBeVisible();
});

test("document actions remain usable when every Lab API route is unavailable", async ({ page }) => {
  let labRequests = 0;
  await page.route("**/api/lab/**", async (route) => { labRequests += 1; await route.abort(); });
  await navigate(page, "/portfolio/document-operations/?lang=en");
  await page.getByRole("button", { name: "Classify and extract" }).click();
  await expect(page.getByLabel("Order reference")).toHaveValue("NW-8841");
  expect(labRequests).toBe(0);
});

test("active workflows create no fetch or XHR traffic", async ({ page }) => {
  const runtimeRequests = [];
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) runtimeRequests.push(request.url());
  });

  await navigate(page, "/portfolio/document-operations/?lang=en");
  await page.getByRole("button", { name: "Classify and extract" }).click();
  await expect(page.getByLabel("Order reference")).toHaveValue("NW-8841");

  await navigate(page, "/portfolio/operations-hub/?lang=en");
  await page.getByRole("button", { name: "Generate risk brief" }).click();
  await expect(page.getByRole("heading", { name: /Delivery promise is exposed/ })).toBeVisible();

  await navigate(page, "/portfolio/knowledge-assistant/?lang=en");
  await page.getByRole("button", { name: "Search permitted sources" }).click();
  await expect(page.getByRole("heading", { name: /Gold customers may request/ })).toBeVisible();

  await navigate(page, "/portfolio/kpi-studio/?lang=en");
  await page.getByRole("button", { name: "Generate decision note" }).click();
  await expect(page.getByRole("heading", { name: /Revenue is rising/ })).toBeVisible();
  expect(runtimeRequests).toEqual([]);
});

test("each browser demo exposes a deterministic reset", async ({ page }) => {
  await navigate(page, "/portfolio/document-operations/?lang=en");
  await page.getByRole("button", { name: "Classify and extract" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByLabel("Order reference")).toHaveCount(0);

  await navigate(page, "/portfolio/knowledge-assistant/?lang=en");
  await page.getByRole("button", { name: "Search permitted sources" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByText("Evidence before answer", { exact: true })).toBeVisible();

  await navigate(page, "/portfolio/kpi-studio/?lang=en");
  await page.getByRole("combobox", { name: /Period/ }).selectOption("3");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("combobox", { name: /Period/ })).toHaveValue("6");
});

test("all published demos retain complete Italian and English document language", async ({ page }) => {
  for (const language of ["it", "en"]) {
    for (const slug of slugs) {
      await navigate(page, `/portfolio/${slug}/?lang=${language}`);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.locator("h1").first()).toBeVisible();
    }
  }
});

test("reduced motion and compact layouts remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const slug of slugs) {
    await navigate(page, "/portfolio/" + slug + "/?lang=it");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator("h1").first()).toBeVisible();
  }
});
