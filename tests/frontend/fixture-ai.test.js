import { describe, expect, it, vi } from "vitest";
import { FixtureAIProvider } from "../../portfolio/shared/fixture-ai.js";

describe("FixtureAIProvider contract", () => {
  it("returns the provider-neutral contract deterministically", async () => {
    const provider = new FixtureAIProvider();
    const request = {
      task: "document_classify",
      schema: { type: "object" },
      context: { demo: "document-operations" },
      input: { messageId: "M-204" }
    };
    const first = await provider.execute(request);
    const second = await provider.execute(request);
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      output: { category: "purchase_order" },
      usage: { estimatedCost: 0 },
      trace: { provider: "fixture", deterministic: true }
    });
    expect(first.evidence.length).toBeGreaterThan(0);
    expect(first.warnings[0]).toContain("no external AI");
  });

  it("never calls fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await new FixtureAIProvider().execute({
      task: "knowledge_search",
      schema: {},
      context: {},
      input: {}
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns Italian task copy when the validated language requests it", async () => {
    const result = await new FixtureAIProvider().execute({
      task: "kpi_narrative",
      schema: {},
      context: {},
      input: { language: "it" }
    });
    expect(result.output.summary).toContain("ricavi");
    expect(result.warnings[0]).toContain("Dimostrazione sintetica");
  });
});
