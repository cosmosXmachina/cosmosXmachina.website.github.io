import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  classifyPublicDocument,
  DailyVisitAggregator,
  parseVisitDatagram,
  readVisitRecords
} from "../../api/visit-analytics.mjs";

test("visit datagrams accept only successful public document navigation", () => {
  const message = '<190>Aug  3 10:00:00 cosmos_visit: {"ip":"203.0.113.8","path":"/portfolio/kpi-studio/","method":"GET","status":200,"dest":"document"}';
  assert.deepEqual(parseVisitDatagram(message), { ip: "203.0.113.8", path: "/portfolio/kpi-studio/" });
  assert.deepEqual(classifyPublicDocument("/portfolio/document-operations/index.html"), { page: "demo", demo: "document-operations" });
  assert.equal(parseVisitDatagram(message.replace('"document"', '"image"')), null);
  assert.equal(parseVisitDatagram(message.replace('"status":200', '"status":500')), null);
  assert.equal(parseVisitDatagram(message.replace("/portfolio/kpi-studio/", "/api/lab/health")), null);
  assert.equal(parseVisitDatagram(message.replace("203.0.113.8", "127.0.0.1")), null);
  assert.deepEqual(
    parseVisitDatagram("<190>cosmos_visit: COSMOS_VISIT 198.51.100.7 304 GET document /portfolio/knowledge-assistant/"),
    { ip: "198.51.100.7", path: "/portfolio/knowledge-assistant/" }
  );
});

test("hourly visitor buckets stay within the configured memory bound", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cosmos-visits-bound-"));
  const aggregator = new DailyVisitAggregator({ file: join(directory, "visits.jsonl"), maxBuckets: 2 });
  try {
    assert.equal(aggregator.record({ ip: "203.0.113.1", path: "/" }), true);
    assert.equal(aggregator.record({ ip: "203.0.113.2", path: "/" }), true);
    assert.equal(aggregator.record({ ip: "203.0.113.3", path: "/" }), false);
    assert.equal(aggregator.buckets.size, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("daily records deduplicate by address and hour without persisting identifiers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cosmos-visits-"));
  const file = join(directory, "visits-daily.jsonl");
  const firstHour = Date.UTC(2026, 7, 3, 8, 5);
  const aggregator = await new DailyVisitAggregator({ file, timeZone: "Europe/Rome" }).load();

  try {
    aggregator.record({ ip: "203.0.113.8", path: "/" }, firstHour);
    aggregator.record({ ip: "203.0.113.8", path: "/index.html" }, firstHour + 1_000);
    aggregator.record({ ip: "203.0.113.8", path: "/portfolio/" }, firstHour + 2_000);
    aggregator.record({ ip: "203.0.113.8", path: "/portfolio/document-operations/" }, firstHour + 3_000);
    aggregator.record({ ip: "203.0.113.8", path: "/portfolio/kpi-studio/" }, firstHour + 4_000);
    aggregator.record({ ip: "198.51.100.9", path: "/portfolio/document-operations/" }, firstHour + 5_000);
    await aggregator.flush(firstHour + 61 * 60 * 1_000);

    let [day] = await readVisitRecords(file);
    assert.equal(day.date, "2026-08-03");
    assert.equal(day.visits, 2);
    assert.equal(day.visitsWithHome, 1);
    assert.equal(day.visitsWithCreationLab, 1);
    assert.equal(day.visitsWithAnyDemo, 2);
    assert.equal(day.visitsWithLabAndDemo, 1);
    assert.equal(day.demos["document-operations"], 2);
    assert.equal(day.demos["kpi-studio"], 1);

    aggregator.record({ ip: "203.0.113.8", path: "/privacy.html" }, firstHour + 65 * 60 * 1_000);
    await aggregator.flush(firstHour + 125 * 60 * 1_000);
    [day] = await readVisitRecords(file);
    assert.equal(day.visits, 3);
    assert.equal(day.visitsWithPrivacy, 1);

    const persisted = await readFile(file, "utf8");
    assert.doesNotMatch(persisted, /203\.0\.113\.8|198\.51\.100\.9|"ip"|address|identifier|hash/i);
    assert.equal(persisted.trim().split(/\r?\n/).length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
