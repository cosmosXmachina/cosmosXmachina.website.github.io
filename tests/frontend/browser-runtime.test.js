import { describe, expect, it, vi } from "vitest";
import { BrowserLabRuntime, LabClientError, runtimeInternals } from "../../portfolio/shared/browser-runtime.js";

const documentInput = { messageId: "M-204", body: "Order NW-8841 totals EUR 4,820.", language: "en" };

function runtime(options = {}) {
  let sequence = 0;
  return new BrowserLabRuntime({ latency: 0, idFactory: () => `id-${++sequence}`, ...options });
}

describe("BrowserLabRuntime", () => {
  it("runs deterministic actions without fetch or an external provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const lab = runtime();
    const providers = await lab.getProviders();
    const response = await lab.runAction("document-operations", "classify", documentInput, "anthropic");
    expect(providers.mode).toBe("fixture-browser");
    expect(response.result.execution).toMatchObject({
      output: { fields: { orderReference: "NW-8841" } },
      trace: { provider: "fixture", execution: "browser", targetProvider: "anthropic", deterministic: true }
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("replays an idempotent action without consuming quota and rejects a conflicting payload", async () => {
    const lab = runtime();
    const options = { idempotencyKey: "same-action" };
    const first = await lab.runAction("document-operations", "classify", documentInput, "openai", options);
    const replay = await lab.runAction("document-operations", "classify", documentInput, "openai", options);
    expect(first.quota.remaining).toBe(runtimeInternals.ACTION_QUOTA - 1);
    expect(replay.quota.remaining).toBe(first.quota.remaining);
    expect(replay.trace.replayed).toBe(true);
    await expect(lab.runAction("document-operations", "classify", { ...documentInput, messageId: "M-205" }, "openai", options))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("commits state only after a valid action and preserves it when a session renews", async () => {
    let now = 1_000;
    const lab = runtime({ now: () => now });
    const before = lab.session("visitor").remaining;
    await expect(lab.runAction("document-operations", "approve", { messageId: "M-204", fields: null, language: "en" }))
      .rejects.toBeInstanceOf(LabClientError);
    expect(lab.session("visitor").remaining).toBe(before);
    await lab.runAction("document-operations", "classify", documentInput);
    now += runtimeInternals.SESSION_MS + 1;
    const approved = await lab.runAction("document-operations", "approve", {
      messageId: "M-204",
      fields: { orderReference: "NW-8841", requestedDate: "2026-08-03", total: 4820, currency: "EUR" },
      language: "en"
    });
    expect(approved.result.state.step).toBe("approved");
    expect(approved.quota.remaining).toBe(runtimeInternals.ACTION_QUOTA - 1);
  });

  it("enforces roles, transition rules, request bounds, cancellation and quota", async () => {
    const lab = runtime();
    const operation = { orderId: "OW-2419", currentStatus: "packing", role: "sales", language: "en" };
    await expect(lab.runAction("operations-hub", "advance", { ...operation, next: "shipped" }))
      .rejects.toMatchObject({ code: "ROLE_FORBIDDEN" });
    await expect(lab.runAction("document-operations", "classify", { ...documentInput, body: "<script>alert(1)</script>" }))
      .rejects.toMatchObject({ code: "HOSTILE_INPUT" });
    const controller = new AbortController();
    controller.abort();
    await expect(lab.runAction("document-operations", "classify", documentInput, "openai", { signal: controller.signal }))
      .rejects.toMatchObject({ code: "REQUEST_ABORTED" });

    const quotaLab = runtime();
    for (let index = 0; index < runtimeInternals.ACTION_QUOTA; index += 1) {
      await quotaLab.runAction("document-operations", "classify", documentInput, "openai", { idempotencyKey: `quota-${index}` });
    }
    await expect(quotaLab.runAction("document-operations", "classify", documentInput))
      .rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
  });

  it("rejects concurrent actions and stale operations state without consuming another action", async () => {
    const concurrentLab = runtime({ latency: 20 });
    const pending = concurrentLab.runAction("document-operations", "classify", documentInput);
    await expect(concurrentLab.runAction("document-operations", "classify", documentInput))
      .rejects.toMatchObject({ code: "ACTION_IN_PROGRESS" });
    await pending;
    expect(concurrentLab.session("visitor").remaining).toBe(runtimeInternals.ACTION_QUOTA - 1);

    const operationsLab = runtime();
    const order = { orderId: "OW-2418", currentStatus: "review", role: "operations", language: "en" };
    await operationsLab.runAction("operations-hub", "advance", { ...order, next: "packing" });
    const remaining = operationsLab.session("operations").remaining;
    await expect(operationsLab.runAction("operations-hub", "advance", { ...order, next: "packing" }))
      .rejects.toMatchObject({ code: "STATE_TRANSITION_INVALID" });
    expect(operationsLab.session("operations").remaining).toBe(remaining);
  });
});
