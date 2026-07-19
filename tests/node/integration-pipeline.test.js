import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationPipeline } from "../../api/lab/integration-pipeline.mjs";

test("duplicate events do not apply their effect twice", () => {
  const pipeline = new IntegrationPipeline({});
  const first = pipeline.execute("process", { eventId: "evt_901" });
  const duplicate = pipeline.execute("process", { eventId: "evt_901" });
  assert.equal(first.effectApplied, true);
  assert.deepEqual(duplicate, {
    id: "evt_901",
    status: "duplicate",
    idempotent: true,
    effectApplied: false
  });
});

test("hostile or malformed event identifiers are rejected", () => {
  const pipeline = new IntegrationPipeline({});
  assert.throws(
    () => pipeline.execute("process", { eventId: "<script>alert(1)</script>" }),
    /Invalid event identifier/
  );
});
