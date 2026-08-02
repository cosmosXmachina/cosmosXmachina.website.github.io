import assert from "node:assert/strict";
import test from "node:test";
import { buildServer } from "../../api/server.mjs";
import { routerInternals } from "../../api/lab/router.mjs";

const environment = {
  NODE_ENV: "test",
  AI_MODE: "fixture",
  AI_ALLOWED_PROVIDERS: "openai,google,anthropic,xai,openrouter",
  AI_DEFAULT_PROVIDER: "openai",
  LAB_SESSION_SECRET: "server-test-session-secret-value",
  ALLOWED_ORIGIN: "http://127.0.0.1:4173"
};

async function session(app, role) {
  const response = await app.inject({ method: "POST", url: "/api/lab/session", payload: { role } });
  assert.equal(response.statusCode, 200);
  return response.json().session;
}

test("gateway returns normalized errors and security headers", async () => {
  const app = await buildServer(environment);
  try {
    const missing = await app.inject({ method: "POST", url: "/api/lab/not-real/nope", payload: {} });
    assert.equal(missing.statusCode, 404);
    assert.deepEqual(Object.keys(missing.json().error).sort(), ["code", "message", "requestId", "retryable"]);
    assert.equal(missing.headers["x-content-type-options"], "nosniff");

    const cors = await app.inject({ method: "GET", url: "/api/lab/health", headers: { origin: "https://evil.example" } });
    assert.equal(cors.headers["access-control-allow-origin"], undefined);
  } finally {
    await app.close();
  }
});

test("role-bound mutations are idempotent and consume quota after success", async () => {
  const app = await buildServer(environment);
  try {
    const token = await session(app, "operations");
    const request = {
      method: "POST",
      url: "/api/lab/operations-hub/assign",
      headers: { "x-lab-session": token, "x-idempotency-key": "assign-OW-2418-1" },
      payload: {
        provider: "openai",
        input: { orderId: "OW-2418", currentStatus: "review", owner: "warehouse", role: "operations" }
      }
    };
    const first = await app.inject(request);
    const replay = await app.inject(request);
    assert.equal(first.statusCode, 200);
    assert.equal(first.json().result.state.owner, "warehouse");
    assert.equal(first.json().quota.remaining, 24);
    assert.equal(replay.json().quota.remaining, 24);
    assert.equal(replay.json().trace.replayed, true);

    const conflict = await app.inject({ ...request, payload: { ...request.payload, input: { ...request.payload.input, owner: "sales" } } });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.json().error.code, "IDEMPOTENCY_CONFLICT");
  } finally {
    await app.close();
  }
});

test("session role mismatch and missing idempotency keys fail closed", async () => {
  const app = await buildServer(environment);
  try {
    const token = await session(app, "sales");
    const base = {
      method: "POST",
      url: "/api/lab/operations-hub/assign",
      headers: { "x-lab-session": token },
      payload: { input: { orderId: "OW-2418", currentStatus: "review", owner: "sales", role: "operations" } }
    };
    const mismatch = await app.inject({ ...base, headers: { ...base.headers, "x-idempotency-key": "role-mismatch-1" } });
    assert.equal(mismatch.statusCode, 403);
    assert.equal(mismatch.json().error.code, "ROLE_MISMATCH");

    const missingKey = await app.inject({ ...base, payload: { input: { ...base.payload.input, role: "sales" } } });
    assert.equal(missingKey.statusCode, 400);
    assert.equal(missingKey.json().error.code, "IDEMPOTENCY_KEY_REQUIRED");
  } finally {
    await app.close();
  }
});

test("session creation limiter rejects bursts deterministically", () => {
  let now = 0;
  const limiter = new routerInternals.FixedWindowLimiter({ limit: 2, windowMs: 1000, now: () => now });
  limiter.consume("client");
  limiter.consume("client");
  assert.throws(() => limiter.consume("client"), (error) => error.code === "RATE_LIMITED");
  now = 1001;
  assert.doesNotThrow(() => limiter.consume("client"));
});

test("production startup requires an explicit session secret", async () => {
  await assert.rejects(
    buildServer({ ...environment, NODE_ENV: "production", LAB_SESSION_SECRET: "" }),
    /LAB_SESSION_SECRET/
  );
});
