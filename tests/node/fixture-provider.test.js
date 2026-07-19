import assert from "node:assert/strict";
import test from "node:test";
import { FixtureAIProvider } from "../../api/lab/fixture-provider.mjs";

test("Node provider satisfies the asynchronous contract", async () => {
  const provider = new FixtureAIProvider();
  const result = await provider.executeDemo("catalog-intelligence", "enrich", { sku: "OR-S7" });
  assert.equal(result.output.channelStatus, "ready_for_review");
  assert.equal(result.trace.provider, "fixture");
  assert.equal(result.trace.deterministic, true);
  assert.equal(result.usage.estimatedCost, 0);
  assert.ok(result.evidence.length > 0);
  assert.match(result.warnings[0], /no external AI/i);
});

test("identical input replays identically", async () => {
  const provider = new FixtureAIProvider();
  const a = await provider.executeDemo("knowledge-assistant", "search", { question: "replacement" });
  const b = await provider.executeDemo("knowledge-assistant", "search", { question: "replacement" });
  assert.deepEqual(a, b);
});
