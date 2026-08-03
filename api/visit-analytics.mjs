import { createSocket } from "node:dgram";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const DEMO_SLUGS = ["document-operations", "operations-hub", "knowledge-assistant", "kpi-studio"];

function blankDay(date) {
  return {
    date,
    visits: 0,
    visitsWithHome: 0,
    visitsWithCreationLab: 0,
    visitsWithAnyDemo: 0,
    visitsWithLabAndDemo: 0,
    visitsWithPrivacy: 0,
    demos: Object.fromEntries(DEMO_SLUGS.map((slug) => [slug, 0]))
  };
}

function cleanDay(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.date || "")) return null;
  const clean = blankDay(value.date);
  for (const key of Object.keys(clean).filter((key) => key !== "date" && key !== "demos")) {
    clean[key] = Number.isSafeInteger(value[key]) && value[key] >= 0 ? value[key] : 0;
  }
  for (const slug of DEMO_SLUGS) {
    clean.demos[slug] = Number.isSafeInteger(value.demos?.[slug]) && value.demos[slug] >= 0 ? value.demos[slug] : 0;
  }
  return clean;
}

export async function readVisitRecords(file) {
  try {
    const source = await readFile(file, "utf8");
    return source.split(/\r?\n/).filter(Boolean).map((line) => cleanDay(JSON.parse(line))).filter(Boolean);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function dateInZone(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function classifyPublicDocument(path) {
  const normalized = String(path || "").replace(/\/{2,}/g, "/");
  if (normalized === "/" || normalized === "/index.html") return { page: "home" };
  if (normalized === "/privacy.html") return { page: "privacy" };
  if (["/portfolio", "/portfolio/", "/portfolio/index.html"].includes(normalized)) return { page: "creationLab" };
  const match = normalized.match(/^\/portfolio\/([^/]+)(?:\/|\/index\.html)?$/);
  if (match && DEMO_SLUGS.includes(match[1])) return { page: "demo", demo: match[1] };
  return null;
}

export function parseVisitDatagram(message) {
  const source = Buffer.isBuffer(message) ? message.toString("utf8") : String(message || "");
  const start = source.indexOf("{");
  if (start < 0) return null;
  try {
    const event = JSON.parse(source.slice(start));
    if (!event.ip || event.method !== "GET" || event.dest !== "document") return null;
    const status = Number(event.status);
    if (!Number.isInteger(status) || status < 200 || status >= 400) return null;
    if (["127.0.0.1", "::1"].includes(event.ip)) return null;
    return classifyPublicDocument(event.path) ? { ip: String(event.ip), path: String(event.path) } : null;
  } catch {
    return null;
  }
}

export class DailyVisitAggregator {
  constructor({ file, timeZone = "Europe/Rome", retentionDays = 400, now = Date.now }) {
    this.file = resolve(file);
    this.timeZone = timeZone;
    this.retentionDays = retentionDays;
    this.now = now;
    this.buckets = new Map();
    this.records = new Map();
    this.dirty = false;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    for (const record of await readVisitRecords(this.file)) this.records.set(record.date, record);
    return this;
  }

  record(event, timestamp = this.now()) {
    const classified = classifyPublicDocument(event.path);
    if (!classified || !event.ip) return false;
    const hour = Math.floor(timestamp / HOUR_MS);
    this.finalizeClosedHours(hour);
    const key = `${hour}\0${event.ip}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { hour, date: dateInZone(timestamp, this.timeZone), pages: new Set(), demos: new Set() };
      this.buckets.set(key, bucket);
    }
    bucket.pages.add(classified.page);
    if (classified.demo) bucket.demos.add(classified.demo);
    return true;
  }

  finalizeClosedHours(currentHour = Math.floor(this.now() / HOUR_MS)) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.hour >= currentHour) continue;
      const day = this.records.get(bucket.date) || blankDay(bucket.date);
      const anyDemo = bucket.demos.size > 0;
      day.visits += 1;
      if (bucket.pages.has("home")) day.visitsWithHome += 1;
      if (bucket.pages.has("creationLab")) day.visitsWithCreationLab += 1;
      if (bucket.pages.has("privacy")) day.visitsWithPrivacy += 1;
      if (anyDemo) day.visitsWithAnyDemo += 1;
      if (anyDemo && bucket.pages.has("creationLab")) day.visitsWithLabAndDemo += 1;
      for (const slug of bucket.demos) day.demos[slug] += 1;
      this.records.set(bucket.date, day);
      this.buckets.delete(key);
      this.dirty = true;
    }
  }

  flush(timestamp = this.now()) {
    const operation = this.writeQueue.then(async () => {
      this.finalizeClosedHours(Math.floor(timestamp / HOUR_MS));
      const oldestDate = dateInZone(timestamp - (this.retentionDays - 1) * DAY_MS, this.timeZone);
      for (const date of this.records.keys()) {
        if (date < oldestDate) {
          this.records.delete(date);
          this.dirty = true;
        }
      }
      if (!this.dirty) return;
      const body = [...this.records.values()]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((record) => JSON.stringify(record)).join("\n") + "\n";
      const temporary = `${this.file}.tmp-${process.pid}`;
      await mkdir(dirname(this.file), { recursive: true, mode: 0o750 });
      await writeFile(temporary, body, { encoding: "utf8", mode: 0o640 });
      await rename(temporary, this.file);
      this.dirty = false;
    });
    this.writeQueue = operation.catch(() => {});
    return operation;
  }
}

function enabled(value) {
  return String(value || "").toLowerCase() === "true";
}

export function createVisitAnalytics(environment, logger = console) {
  if (!enabled(environment.VISIT_ANALYTICS_ENABLED)) {
    return { enabled: false, async start() {}, async close() {} };
  }

  const host = environment.VISIT_ANALYTICS_HOST || "127.0.0.1";
  const port = Number(environment.VISIT_ANALYTICS_PORT || 5514);
  const file = environment.VISIT_ANALYTICS_FILE || "/var/lib/cosmos-analytics/visits-daily.jsonl";
  const requestedRetention = Number(environment.VISIT_ANALYTICS_RETENTION_DAYS || 400);
  const retentionDays = Number.isInteger(requestedRetention) ? Math.min(3_650, Math.max(7, requestedRetention)) : 400;
  const aggregator = new DailyVisitAggregator({ file, timeZone: environment.VISIT_ANALYTICS_TIMEZONE || "Europe/Rome", retentionDays });
  let socket;
  let timer;

  return {
    enabled: true,
    async start() {
      await aggregator.load();
      socket = createSocket("udp4");
      socket.on("message", (message) => {
        const event = parseVisitDatagram(message);
        if (event) aggregator.record(event);
      });
      socket.on("error", (error) => logger.error(`Visit analytics socket error: ${error.message}`));
      await new Promise((resolveBind, rejectBind) => {
        socket.once("error", rejectBind);
        socket.bind(port, host, () => {
          socket.off("error", rejectBind);
          resolveBind();
        });
      });
      timer = setInterval(() => aggregator.flush().catch((error) => logger.error(`Visit analytics write failed: ${error.message}`)), 30_000);
      timer.unref();
    },
    async close() {
      if (timer) clearInterval(timer);
      await aggregator.flush();
      if (socket) await new Promise((resolveClose) => socket.close(resolveClose));
    }
  };
}
