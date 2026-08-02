import assert from "node:assert/strict";
import test from "node:test";
import { AIGateway } from "../../api/ai/gateway.mjs";

const fixtureEnvironment = {
  AI_MODE: "fixture",
  AI_DEFAULT_PROVIDER: "openai",
  AI_ALLOWED_PROVIDERS: "openai,google,anthropic,xai,openrouter"
};

test("fixture mode exposes all targets without credentials or network calls", async () => {
  let calls = 0;
  const gateway = new AIGateway(fixtureEnvironment, { fetchImpl: async () => { calls += 1; } });
  const result = await gateway.execute({
    provider: "anthropic",
    task: "document_classify",
    input: { messageId: "M-204" }
  });
  assert.equal(calls, 0);
  assert.equal(result.trace.provider, "fixture");
  assert.equal(result.trace.targetProvider, "anthropic");
  assert.equal(result.trace.deterministic, true);
  assert.equal(gateway.providers().length, 5);
  assert.ok(gateway.providers().every((item) => item.simulated && !item.liveReady));
  assert.ok(gateway.providers().every((item) => !("apiKey" in item)));
});

test("unknown and disallowed providers are rejected before execution", async () => {
  const gateway = new AIGateway({ ...fixtureEnvironment, AI_ALLOWED_PROVIDERS: "openai,google" });
  await assert.rejects(
    gateway.execute({ provider: "xai", task: "knowledge_search", input: {} }),
    /not allowed/i
  );
});

test("fixture output is validated against the task contract", async () => {
  const gateway = new AIGateway(fixtureEnvironment);
  gateway.fixture.execute = async () => ({ output: { category: "broken" }, trace: {}, warnings: [] });
  await assert.rejects(
    gateway.execute({ task: "document_classify", input: {} }),
    (error) => error.code === "PROVIDER_OUTPUT_INVALID"
  );
});

test("live mode requires an explicit safety switch", () => {
  assert.throws(
    () => new AIGateway({ ...fixtureEnvironment, AI_MODE: "live", OPENAI_API_KEY: "test" }),
    (error) => error.code === "LIVE_AI_DISABLED"
  );
});
