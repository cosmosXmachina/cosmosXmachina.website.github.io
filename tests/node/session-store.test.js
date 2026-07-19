import assert from "node:assert/strict";
import test from "node:test";
import { SessionStore, sessionLimits } from "../../api/lab/session-store.mjs";
import { transition } from "../../api/lab/router.mjs";

test("anonymous sessions are signed and expire after thirty minutes", () => {
  let now = 1_000;
  const store = new SessionStore("a-long-local-test-secret-value", () => now);
  const created = store.create();
  assert.equal(created.expiresAt, now + sessionLimits.ttlMs);
  assert.ok(store.get(created.token).id);
  now += sessionLimits.ttlMs + 1;
  assert.throws(() => store.get(created.token), /expired/i);
});

test("tampered tokens and exhausted quotas are rejected", () => {
  const store = new SessionStore("another-long-local-test-secret");
  const created = store.create();
  assert.throws(() => store.get(created.token + "x"), /invalid/i);
  const record = store.get(created.token);
  for (let index = 0; index < sessionLimits.maxActions; index += 1) store.consume(record);
  assert.throws(() => store.consume(record), /quota/i);
});

test("workflow actions reject invalid state transitions", () => {
  const session = { states: {} };
  assert.throws(
    () => transition(session, "document-operations", "approve", {}),
    /Invalid state transition/
  );
  transition(session, "document-operations", "classify", {});
  assert.equal(transition(session, "document-operations", "approve", {}).step, "approved");
  assert.throws(() => transition({ states: {} }, "operations-hub", "advance", { next: "deleted" }), /Invalid operations state/);
});
