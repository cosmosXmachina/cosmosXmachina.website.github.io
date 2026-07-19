import assert from "node:assert/strict";
import test from "node:test";
import { OrionFixtureDatabase } from "../../api/lab/orion-db.mjs";

test("Operations Hub reads stable Orion fixtures from in-memory SQLite", () => {
  const fixtures = new OrionFixtureDatabase();
  try {
    assert.deepEqual(fixtures.orders(), [
      { id: "OW-2418", customer: "Nordline Impianti", value: 4820, status: "review" },
      { id: "OW-2419", customer: "Adria Systems", value: 1690, status: "packing" },
      { id: "OW-2420", customer: "Alpina Processi", value: 7350, status: "blocked" }
    ]);
  } finally {
    fixtures.close();
  }
});
