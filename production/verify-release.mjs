#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_RELEASE_BYTES = 8 * 1024 * 1024;
const required = [
  "dist/index.html",
  "dist/privacy.html",
  "dist/robots.txt",
  "dist/sitemap.xml",
  "dist/portfolio/index.html",
  "runtime/node/api/server.bundle.mjs",
  "runtime/node/api/contact.js",
  "runtime/node/api/package.json",
  "runtime/python/python_service/server.py",
  "runtime/python/requirements-production.txt",
  "runtime/smoke-release.mjs"
];
const allowed = [
  /^dist\/(?:index\.html|privacy\.html|robots\.txt|sitemap\.xml)$/,
  /^dist\/assets\/[A-Za-z0-9_./-]+\.(?:css|js|mjs|svg|webp|jpe?g|png|woff2)$/,
  /^dist\/portfolio(?:\/(?:document-operations|operations-hub|knowledge-assistant|kpi-studio))?\/index\.html$/,
  /^runtime\/node\/api\/(?:server\.bundle\.mjs|contact\.js|package\.json)$/,
  /^runtime\/python\/python_service\/(?:__init__|app|provider|retrieval|schemas|server)\.py$/,
  /^runtime\/python\/requirements-production\.txt$/,
  /^runtime\/smoke-release\.mjs$/
];
const forbiddenContent = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,})\b/,
  /^SMTP_PASS\s*=\s*\S+/m,
  /^AI_LIVE_ENABLED\s*=\s*true\b/im
];

function cleanPath(root, path) {
  return relative(root, path).split(sep).join("/");
}

async function filesBelow(root, directory = root) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) throw new Error(`Release contains a symbolic link: ${cleanPath(root, path)}`);
    if (metadata.isDirectory()) output.push(...await filesBelow(root, path));
    else if (metadata.isFile()) output.push(path);
    else throw new Error(`Release contains a special file: ${cleanPath(root, path)}`);
  }
  return output;
}

export async function sha256File(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export function componentHash(entries, prefix) {
  return createHash("sha256")
    .update(entries.filter((entry) => entry.path.startsWith(prefix)).map((entry) => `${entry.path}\0${entry.sha256}\n`).join(""))
    .digest("hex");
}

function comparePath(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export async function verifyRelease(directory, { expectedReleaseId = "", expectedRequirementsHash = "", allowDirty = false } = {}) {
  const root = resolve(directory);
  const manifestSource = await readFile(resolve(root, "manifest.json"), "utf8");
  if (forbiddenContent.some((pattern) => pattern.test(manifestSource))) throw new Error("Release manifest contains forbidden secret or live-AI content.");
  const manifest = JSON.parse(manifestSource);
  if (manifest.schemaVersion !== 1) throw new Error("Unsupported release manifest schema.");
  if (!/^[a-z0-9][a-z0-9.-]{6,94}[a-z0-9]$/i.test(manifest.releaseId || "")) throw new Error("Invalid release identifier.");
  if (!/^[a-f0-9]{40}$/.test(manifest.commit || "")) throw new Error("Invalid release commit.");
  if (!Number.isFinite(Date.parse(manifest.createdAt))) throw new Error("Invalid release creation time.");
  if (manifest.nodeMinimum !== "22.5.0") throw new Error("Unsupported release Node runtime floor.");
  if (expectedReleaseId && manifest.releaseId !== expectedReleaseId) throw new Error("Ready marker and release manifest identifiers differ.");
  if (manifest.dirty && !allowDirty) throw new Error("Dirty development releases cannot be activated in production.");
  if (manifest.aiMode !== "fixture" || manifest.externalAI !== false) throw new Error("Release is not fixture-only.");
  if (!Array.isArray(manifest.files) || !Number.isInteger(manifest.totalBytes) || manifest.totalBytes < 0) throw new Error("Invalid release file manifest.");
  if (!/^[a-f0-9]{64}$/.test(manifest.requirementsSha256 || "")) throw new Error("Invalid production requirement hash.");
  for (const name of ["frontend", "node", "python"]) {
    if (!/^[a-f0-9]{64}$/.test(manifest.components?.[name] || "")) throw new Error(`Invalid ${name} component digest.`);
  }
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== "string" || !Number.isInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256 || "")) {
      throw new Error("Invalid release file entry.");
    }
  }

  const actualFiles = (await filesBelow(root)).map((path) => cleanPath(root, path)).filter((path) => path !== "manifest.json").sort();
  const declared = [...manifest.files].sort((left, right) => comparePath(left.path, right.path));
  if (new Set(declared.map((entry) => entry.path)).size !== declared.length) throw new Error("Manifest contains duplicate files.");
  if (actualFiles.join("\n") !== declared.map((entry) => entry.path).join("\n")) throw new Error("Release tree does not match its manifest.");
  for (const path of actualFiles) {
    if (path.split("/").some((part) => part === "." || part === ".." || part.startsWith("."))) {
      throw new Error(`Release contains a hidden or unsafe path: ${path}`);
    }
    if (!allowed.some((pattern) => pattern.test(path))) throw new Error(`Release contains a forbidden path: ${path}`);
  }
  for (const path of required) {
    if (!actualFiles.includes(path)) throw new Error(`Release is missing ${path}`);
  }

  let bytes = 0;
  for (const entry of declared) {
    const path = resolve(root, ...entry.path.split("/"));
    const metadata = await lstat(path);
    const digest = await sha256File(path);
    if (metadata.size !== entry.bytes || digest !== entry.sha256) throw new Error(`Release checksum mismatch: ${entry.path}`);
    bytes += metadata.size;
    if (/\.(?:css|html|js|json|mjs|py|svg|txt)$/i.test(entry.path)) {
      const source = await readFile(path, "utf8");
      if (forbiddenContent.some((pattern) => pattern.test(source))) throw new Error(`Forbidden secret or live-AI content in ${entry.path}`);
    }
  }
  if (bytes !== manifest.totalBytes || bytes > MAX_RELEASE_BYTES) throw new Error("Release exceeds its declared or allowed payload size.");

  for (const [name, prefix] of Object.entries({ frontend: "dist/", node: "runtime/node/", python: "runtime/python/" })) {
    if (componentHash(declared, prefix) !== manifest.components?.[name]) throw new Error(`${name} component hash is invalid.`);
  }
  const requirementsHash = await sha256File(resolve(root, "runtime/python/requirements-production.txt"));
  if (requirementsHash !== manifest.requirementsSha256) throw new Error("Production requirement hash is invalid.");
  if (expectedRequirementsHash && requirementsHash !== expectedRequirementsHash) {
    throw new Error("Python requirements changed; rerun the privileged bootstrap before activation.");
  }
  return { manifest, bytes };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: node production/verify-release.mjs RELEASE_DIR [--release ID] [--requirements SHA256]");
  const result = await verifyRelease(directory, {
    expectedReleaseId: option("--release"),
    expectedRequirementsHash: option("--requirements"),
    allowDirty: process.argv.includes("--allow-dirty")
  });
  console.log(JSON.stringify({ ok: true, releaseId: result.manifest.releaseId, bytes: result.bytes }));
}
