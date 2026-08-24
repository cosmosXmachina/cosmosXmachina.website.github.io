import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import test from "node:test";
import { componentHash, sha256File, verifyRelease } from "../../production/verify-release.mjs";

const files = [
  "dist/index.html",
  "dist/privacy.html",
  "dist/robots.txt",
  "dist/sitemap.xml",
  "dist/portfolio/index.html",
  "runtime/node/api/server.bundle.mjs",
  "runtime/node/api/contact.js",
  "runtime/node/api/package.json",
  "runtime/python/python_service/__init__.py",
  "runtime/python/python_service/app.py",
  "runtime/python/python_service/provider.py",
  "runtime/python/python_service/retrieval.py",
  "runtime/python/python_service/schemas.py",
  "runtime/python/python_service/server.py",
  "runtime/python/requirements-production.txt",
  "runtime/smoke-release.mjs"
];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "cosmos-release-"));
  for (const file of files) {
    const path = join(root, ...file.split("/"));
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, file.endsWith("package.json") ? '{"type":"commonjs"}\n' : `fixture:${file}\n`, "utf8");
  }
  const entries = [];
  for (const file of files.sort()) {
    const path = join(root, ...file.split("/"));
    entries.push({ path: relative(root, path).split(sep).join("/"), bytes: (await stat(path)).size, sha256: await sha256File(path) });
  }
  const requirementsSha256 = await sha256File(join(root, "runtime/python/requirements-production.txt"));
  const manifest = {
    schemaVersion: 1,
    releaseId: "release-test-001",
    commit: "0".repeat(40),
    dirty: false,
    createdAt: "2026-08-04T00:00:00.000Z",
    aiMode: "fixture",
    externalAI: false,
    nodeMinimum: "22.5.0",
    requirementsSha256,
    components: {
      frontend: componentHash(entries, "dist/"),
      node: componentHash(entries, "runtime/node/"),
      python: componentHash(entries, "runtime/python/")
    },
    files: entries,
    totalBytes: entries.reduce((total, entry) => total + entry.bytes, 0)
  };
  await writeFile(join(root, "manifest.json"), JSON.stringify(manifest), "utf8");
  return { root, manifest };
}

test("release verifier accepts an exact fixture-only allowlisted tree", async () => {
  const { root, manifest } = await fixture();
  try {
    const result = await verifyRelease(root, { expectedReleaseId: manifest.releaseId, expectedRequirementsHash: manifest.requirementsSha256 });
    assert.equal(result.manifest.releaseId, manifest.releaseId);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release verifier rejects extra source and changed dependency manifests", async () => {
  const { root } = await fixture();
  try {
    await writeFile(join(root, "AGENTS.md"), "private source", "utf8");
    await assert.rejects(verifyRelease(root), /does not match its manifest/);
    await rm(join(root, "AGENTS.md"));
    await assert.rejects(verifyRelease(root, { expectedRequirementsHash: "0".repeat(64) }), /bootstrap/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release verifier rejects public files outside the exact route and asset allowlist", async () => {
  const { root, manifest } = await fixture();
  try {
    const path = join(root, "dist/private.pdf");
    await writeFile(path, "private", "utf8");
    const entry = { path: "dist/private.pdf", bytes: (await stat(path)).size, sha256: await sha256File(path) };
    manifest.files.push(entry);
    manifest.files.sort((left, right) => left.path.localeCompare(right.path));
    manifest.totalBytes += entry.bytes;
    manifest.components.frontend = componentHash(manifest.files, "dist/");
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest), "utf8");
    await assert.rejects(verifyRelease(root), /forbidden path/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("release verifier rejects modified files and dirty production releases", async () => {
  const { root, manifest } = await fixture();
  try {
    manifest.dirty = true;
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest), "utf8");
    await assert.rejects(verifyRelease(root), /Dirty development releases/);
    await writeFile(join(root, "dist/index.html"), "modified", "utf8");
    await assert.rejects(verifyRelease(root, { allowDirty: true }), /checksum mismatch/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
