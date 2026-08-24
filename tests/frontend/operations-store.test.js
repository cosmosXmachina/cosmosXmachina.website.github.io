import { describe, expect, it } from "vitest";
import { operationsStoreInternals, validateOperationsRecord } from "../../portfolio/shared/operations-store.js";

const order = {
  id: "OW-2418", customer: "Nordline Impianti", value: 4820, status: "review", owner: "operations",
  due: "03 Aug", items: "20 x Orion S7", blocker: null, flagged: false, note: "Review delivery."
};

describe("Operations Hub persisted schema", () => {
  it("accepts and clones a bounded versioned record", () => {
    const source = { schema: operationsStoreInternals.SCHEMA, orders: [order] };
    const result = validateOperationsRecord(source);
    expect(result).toEqual([order]);
    expect(result).not.toBe(source.orders);
  });

  it("rejects stale, corrupt and unbounded records", () => {
    expect(() => validateOperationsRecord({ schema: 0, orders: [order] })).toThrow(/unsupported schema/);
    expect(() => validateOperationsRecord({ schema: 1, orders: [{ ...order, status: "deleted" }] })).toThrow(/invalid/);
    expect(() => validateOperationsRecord({ schema: 1, orders: Array.from({ length: 51 }, (_, id) => ({ ...order, id: `OW-${id}` })) })).toThrow(/invalid/);
  });
});
