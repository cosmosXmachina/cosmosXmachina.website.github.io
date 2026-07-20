export function calculateKpis(records, scope = "all", months = 6) {
  const selected = records.slice(-months).map((record) => ({ month: record.month, ...record[scope] }));
  const previous = records.slice(-(months * 2), -months).map((record) => ({ month: record.month, ...record[scope] }));
  const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);
  const revenue = sum(selected, "revenue");
  const previousRevenue = sum(previous, "revenue");
  const cogs = sum(selected, "cogs");
  const delivered = sum(selected, "delivered");
  const onTime = sum(selected, "onTime");
  const shipped = sum(selected, "shipped");
  const returned = sum(selected, "returned");
  const percent = (part, whole) => whole ? (part / whole) * 100 : null;
  return {
    selected,
    metrics: {
      revenue,
      margin: percent(revenue - cogs, revenue),
      delivery: percent(onTime, delivered),
      returns: percent(returned, shipped),
      revenueDelta: previousRevenue ? ((revenue - previousRevenue) / previousRevenue) * 100 : null
    },
    quality: {
      records: selected.length,
      missingValues: selected.reduce((count, item) => count + Object.values(item).filter((value) => value === null || value === undefined).length, 0),
      duplicates: new Set(selected.map((item) => item.month)).size === selected.length ? 0 : 1,
      refreshedAt: "2026-07-19T08:30:00Z"
    }
  };
}

export function formatPercent(value) {
  return value === null ? "N/A" : value.toFixed(1) + "%";
}
