#!/usr/bin/env node
import assert from "node:assert/strict";

const nodeUrl = process.env.NODE_HEALTH_URL || "http://127.0.0.1:8787";
const pythonUrl = process.env.PYTHON_HEALTH_URL || "http://127.0.0.1:8790";

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5_000) });
  const body = await response.json().catch(() => ({}));
  assert.equal(response.ok, true, `${url} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const python = await request(`${pythonUrl}/health`);
assert.deepEqual({ ok: python.ok, mode: python.mode, externalAI: python.externalAI }, {
  ok: true,
  mode: "fixture",
  externalAI: false
});

const health = await request(`${nodeUrl}/api/lab/health`);
assert.equal(health.ok, true);
assert.equal(health.mode, "fixture");
assert.equal(health.externalAI, false);

const session = await request(`${nodeUrl}/api/lab/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ role: "visitor" })
});
const classified = await request(`${nodeUrl}/api/lab/document-operations/classify`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-lab-session": session.session,
    "x-idempotency-key": `production-smoke-${Date.now()}`
  },
  body: JSON.stringify({
    provider: "openai",
    input: {
      messageId: "SMOKE-001",
      body: "Order OW-2418 requests delivery on 2026-08-08 for EUR 4820.",
      language: "en"
    }
  })
});
assert.equal(classified.ok, true);
assert.equal(classified.mode, "fixture");
assert.equal(classified.result.execution.trace.deterministic, true);
console.log("Production smoke topology passed in fixture mode.");
