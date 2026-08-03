#!/usr/bin/env node
import { readVisitRecords, DEMO_SLUGS } from "../api/visit-analytics.mjs";

const args = process.argv.slice(2);
const valueAfter = (name) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : ""; };
const file = valueAfter("--file") || process.env.VISIT_ANALYTICS_FILE || "/var/lib/cosmos-analytics/visits-daily.jsonl";
const requestedDays = Number(valueAfter("--days") || 7);
if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 366) {
  throw new Error("--days must be an integer between 1 and 366");
}

const records = (await readVisitRecords(file)).slice(-requestedDays);
const numericKeys = ["visits", "visitsWithHome", "visitsWithCreationLab", "visitsWithAnyDemo", "visitsWithLabAndDemo", "visitsWithPrivacy"];
const total = Object.assign(Object.fromEntries(numericKeys.map((key) => [key, 0])), { demos: Object.fromEntries(DEMO_SLUGS.map((slug) => [slug, 0])) });

for (const record of records) {
  console.log(`${record.date}  visits=${record.visits}  home=${record.visitsWithHome}  lab=${record.visitsWithCreationLab}  demos=${record.visitsWithAnyDemo}  lab+demo=${record.visitsWithLabAndDemo}  privacy=${record.visitsWithPrivacy}`);
  console.log(`  ${DEMO_SLUGS.map((slug) => `${slug}=${record.demos[slug]}`).join("  ")}`);
  for (const key of numericKeys) total[key] += record[key];
  for (const slug of DEMO_SLUGS) total.demos[slug] += record.demos[slug];
}

if (!records.length) console.log("No completed hourly visit buckets are available yet.");
console.log(`\n${records.length}-day total  visits=${total.visits}  home=${total.visitsWithHome}  lab=${total.visitsWithCreationLab}  demos=${total.visitsWithAnyDemo}  lab+demo=${total.visitsWithLabAndDemo}  privacy=${total.visitsWithPrivacy}`);
console.log(`  ${DEMO_SLUGS.map((slug) => `${slug}=${total.demos[slug]}`).join("  ")}`);
