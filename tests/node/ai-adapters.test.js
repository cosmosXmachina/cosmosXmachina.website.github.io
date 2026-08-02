import assert from "node:assert/strict";
import test from "node:test";
import { LiveAIProvider } from "../../api/ai/adapters.mjs";
import { taskDefinition } from "../../api/ai/tasks.mjs";

const environment = {
  OPENAI_API_KEY: "test-openai",
  OPENAI_MODEL: "openai-test",
  GOOGLE_AI_API_KEY: "test-google",
  GOOGLE_AI_MODEL: "google-test",
  ANTHROPIC_API_KEY: "test-anthropic",
  ANTHROPIC_MODEL: "anthropic-test",
  XAI_API_KEY: "test-xai",
  XAI_MODEL: "xai-test",
  OPENROUTER_API_KEY: "test-openrouter",
  OPENROUTER_MODEL: "openrouter/test",
  PUBLIC_SITE_URL: "https://example.test"
};

const bodies = {
  openai: { id: "oa-1", model: "openai-test", output_text: '{"supported":true}' },
  xai: { id: "xai-1", model: "xai-test", output: [{ content: [{ type: "output_text", text: '{"supported":true}' }] }] },
  google: { model: "google-test", candidates: [{ content: { parts: [{ text: '{"supported":true}' }] } }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2 } },
  anthropic: { id: "ant-1", model: "anthropic-test", content: [{ type: "text", text: '{"supported":true}' }], usage: { input_tokens: 4, output_tokens: 2 } },
  openrouter: { id: "or-1", model: "openrouter/test", choices: [{ message: { content: '{"supported":true}' } }], usage: { prompt_tokens: 4, completion_tokens: 2 } }
};

for (const provider of Object.keys(bodies)) {
  test(provider + " adapter constructs an authenticated request and normalizes output", async () => {
    let captured;
    const adapter = new LiveAIProvider(provider, environment, async (url, init) => {
      captured = { url, init, body: JSON.parse(init.body) };
      return new Response(JSON.stringify(bodies[provider]), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });
    const definition = taskDefinition("knowledge_evaluate");
    const result = await adapter.execute({
      task: "knowledge_evaluate",
      description: definition.description,
      schema: definition.schema,
      schemaId: definition.id,
      context: { evidence: [{ source: "fixture" }] },
      input: { answer: "bounded" }
    });
    assert.equal(result.output.supported, true);
    assert.equal(result.trace.provider, provider);
    assert.equal(result.trace.deterministic, false);
    assert.deepEqual(result.evidence, [{ source: "fixture" }]);
    assert.equal(captured.init.method, "POST");
    assert.match(captured.init.headers.authorization || captured.init.headers["x-api-key"] || captured.init.headers["x-goog-api-key"], /test-/);
    assert.ok(captured.body.model || provider === "google");
  });
}

test("live mode refuses to initialize without the provider credential", () => {
  assert.throws(() => new LiveAIProvider("openai", {}, async () => {}), /OPENAI_API_KEY/);
});

test("adapter retries one transient response and never exposes its body", async () => {
  let calls = 0;
  const adapter = new LiveAIProvider("openai", environment, async () => {
    calls += 1;
    return calls === 1
      ? new Response("sensitive upstream failure", { status: 503 })
      : new Response(JSON.stringify(bodies.openai), { status: 200 });
  });
  const definition = taskDefinition("knowledge_evaluate");
  const result = await adapter.execute({
    task: "knowledge_evaluate",
    description: definition.description,
    schema: definition.schema,
    schemaId: definition.id,
    input: {}
  });
  assert.equal(calls, 2);
  assert.equal(result.output.supported, true);
});

test("adapter normalizes malformed and unavailable provider failures", async () => {
  const malformed = new LiveAIProvider("openai", environment, async () => new Response("not-json", { status: 200 }));
  await assert.rejects(malformed.execute({ task: "x", schema: {}, input: {} }), (error) => error.code === "PROVIDER_RESPONSE_INVALID");

  let calls = 0;
  const unavailable = new LiveAIProvider("openai", environment, async () => {
    calls += 1;
    throw new Error("credential-shaped secret must not escape");
  });
  await assert.rejects(
    unavailable.execute({ task: "x", schema: {}, input: {} }),
    (error) => error.code === "PROVIDER_UNAVAILABLE" && !error.message.includes("credential-shaped")
  );
  assert.equal(calls, 2);
});
