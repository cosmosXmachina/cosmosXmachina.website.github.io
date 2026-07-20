import { describe, expect, it } from "vitest";
import { calculateKpis, formatPercent } from "../../portfolio/kpi-studio/kpi-engine.js";

const rows = [
  { month: "Jan", all: { revenue: 100, cogs: 60, delivered: 10, onTime: 9, returned: 1, shipped: 10 } },
  { month: "Feb", all: { revenue: 120, cogs: 72, delivered: 12, onTime: 12, returned: 0, shipped: 12 } },
  { month: "Mar", all: { revenue: 150, cogs: 90, delivered: 15, onTime: 14, returned: 1, shipped: 15 } },
  { month: "Apr", all: { revenue: 180, cogs: 108, delivered: 18, onTime: 17, returned: 0, shipped: 18 } }
];

describe("KPI engine", () => {
  it("calculates selected period and comparison deterministically", () => {
    const result = calculateKpis(rows, "all", 2);
    expect(result.metrics.revenue).toBe(330);
    expect(result.metrics.margin).toBeCloseTo(40);
    expect(result.metrics.revenueDelta).toBe(50);
    expect(result.quality).toMatchObject({ records: 2, missingValues: 0, duplicates: 0 });
  });

  it("returns an explicit unavailable percentage for zero denominators", () => {
    const result = calculateKpis([{ month: "May", all: { revenue: 0, cogs: 0, delivered: 0, onTime: 0, returned: 0, shipped: 0 } }], "all", 1);
    expect(result.metrics.margin).toBeNull();
    expect(formatPercent(result.metrics.margin)).toBe("N/A");
  });
});
