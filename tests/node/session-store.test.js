import assert from "node:assert/strict";
import test from "node:test";
import { SessionStore, sessionLimits } from "../../api/lab/session-store.mjs";
import { transition } from "../../api/lab/router.mjs";

const secret = "a-long-local-test-secret-value";

test("anonymous sessions are signed, role-bound, and expire after thirty minutes", () => {
  let now = 1_000;
  const store = new SessionStore(secret, () => now);
  const created = store.create({ role: "support" });
  assert.equal(created.expiresAt, now + sessionLimits.ttlMs);
  assert.equal(store.get(created.token).role, "support");
  now += sessionLimits.ttlMs + 1;
  assert.throws(() => store.get(created.token), (error) => error.code === "SESSION_EXPIRED");
});

test("tampered tokens and bounded session capacity are rejected", () => {
  const store = new SessionStore(secret, () => Date.now(), { maxSessions: 1 });
  const created = store.create();
  assert.throws(() => store.get(created.token + "x"), (error) => error.code === "SESSION_INVALID");
  assert.throws(() => store.create(), (error) => error.code === "SESSION_CAPACITY");
});

test("failed operations roll back state and quota", async () => {
  const store = new SessionStore(secret);
  const record = store.get(store.create().token);
  await assert.rejects(store.run(record, {
    idempotencyKey: "rollback-001",
    fingerprint: "same-input",
    operation: async (draft) => {
      draft.states.changed = true;
      throw new Error("pipeline failed");
    }
  }), /pipeline failed/);
  assert.deepEqual(record.states, {});
  assert.equal(record.remaining, sessionLimits.maxActions);
});

test("idempotent replay returns the first result without consuming quota twice", async () => {
  const store = new SessionStore(secret);
  const record = store.get(store.create().token);
  let calls = 0;
  const request = {
    idempotencyKey: "replay-001",
    fingerprint: "same-input",
    operation: async () => ({ call: ++calls })
  };
  const first = await store.run(record, request);
  const replay = await store.run(record, request);
  assert.equal(first.value.call, 1);
  assert.equal(replay.value.call, 1);
  assert.equal(replay.replayed, true);
  assert.equal(record.remaining, sessionLimits.maxActions - 1);
  await assert.rejects(store.run(record, { ...request, fingerprint: "different-input" }), (error) => error.code === "IDEMPOTENCY_CONFLICT");
});

test("workflow actions reject invalid state transitions", () => {
  const session = { role: "visitor", states: {} };
  assert.throws(
    () => transition(session, "document-operations", "approve", { messageId: "M-204" }),
    (error) => error.code === "STATE_TRANSITION_INVALID"
  );
  transition(session, "document-operations", "classify", { messageId: "M-204" });
  assert.equal(transition(session, "document-operations", "approve", {
    messageId: "M-204",
    fields: { orderReference: "NW-8841", requestedDate: "2026-08-03", total: 4820, currency: "EUR" }
  }).step, "approved");
});

test("operations state is isolated per order and shipping is role protected", () => {
  const session = { role: "operations", states: {} };
  assert.equal(transition(session, "operations-hub", "advance", {
    orderId: "OW-2418", currentStatus: "review", next: "packing", role: "operations"
  }).step, "packing");
  assert.equal(transition(session, "operations-hub", "advance", {
    orderId: "OW-2420", currentStatus: "blocked", next: "review", role: "operations"
  }).step, "review");
  session.role = "sales";
  assert.throws(() => transition(session, "operations-hub", "advance", {
    orderId: "OW-2418", currentStatus: "packing", next: "shipped", role: "sales"
  }), (error) => error.code === "ROLE_FORBIDDEN");
});
