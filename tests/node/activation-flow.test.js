import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { appendFile, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import test from "node:test";
import { componentHash, sha256File } from "../../production/verify-release.mjs";

const bash = process.platform === "win32" ? "C:\\Program Files\\Git\\bin\\bash.exe" : "bash";
const fixtureFiles = [
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

function shellPath(path) {
  const normalized = resolve(path).replaceAll("\\", "/");
  return process.platform === "win32" ? `/${normalized[0].toLowerCase()}${normalized.slice(2)}` : normalized;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  return result;
}

async function makeRelease(testRoot, releaseId) {
  const stage = resolve(testRoot, `source-${releaseId}`);
  await mkdir(stage, { recursive: true });
  for (const file of fixtureFiles) {
    const path = resolve(stage, ...file.split("/"));
    await mkdir(dirname(path), { recursive: true });
    const content = file === "runtime/smoke-release.mjs"
      ? "console.log('fixture smoke passed');\n"
      : file.endsWith("package.json") ? "{\"type\":\"commonjs\"}\n" : `fixture:${file}\n`;
    await writeFile(path, content, "utf8");
  }
  const files = [];
  for (const file of [...fixtureFiles].sort()) {
    const path = resolve(stage, ...file.split("/"));
    files.push({ path: relative(stage, path).split(sep).join("/"), bytes: (await stat(path)).size, sha256: await sha256File(path) });
  }
  const requirementsSha256 = await sha256File(resolve(stage, "runtime/python/requirements-production.txt"));
  const manifest = {
    schemaVersion: 1,
    releaseId,
    commit: "0".repeat(40),
    dirty: false,
    createdAt: new Date().toISOString(),
    aiMode: "fixture",
    externalAI: false,
    nodeMinimum: "22.5.0",
    requirementsSha256,
    components: {
      frontend: componentHash(files, "dist/"),
      node: componentHash(files, "runtime/node/"),
      python: componentHash(files, "runtime/python/")
    },
    files,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0)
  };
  await writeFile(resolve(stage, "manifest.json"), JSON.stringify(manifest), "utf8");
  return { stage, manifest };
}

async function uploadRelease(testRoot, incoming, releaseId) {
  const { stage, manifest } = await makeRelease(testRoot, releaseId);
  const archiveName = `cosmos-release-${releaseId}.tar.gz`;
  const archive = resolve(incoming, archiveName);
  const packed = run("tar", ["-czf", archive, "-C", stage, "."]);
  assert.equal(packed.status, 0, packed.stderr);
  const sha256 = createHash("sha256").update(await readFile(archive)).digest("hex");
  await writeFile(`${archive}.sha256`, `${sha256}  ${archiveName}\n`, "utf8");
  await writeFile(resolve(incoming, `cosmos-release-${releaseId}.ready`), JSON.stringify({
    schemaVersion: 1,
    releaseId,
    archive: archiveName,
    sha256
  }), "utf8");
  await rm(stage, { recursive: true, force: true });
  return { archive, manifest };
}

test("marker activation is idempotent and rejects unsafe releases with rollback", {
  timeout: 30_000,
  skip: process.platform === "win32" ? "Atomic POSIX symlink activation is exercised by the Ubuntu CI job." : false
}, async () => {
  const testRoot = resolve(".test-tmp", `activation-${process.pid}-${Date.now()}`);
  const deployment = resolve(testRoot, "deployment");
  const incoming = resolve(testRoot, "incoming");
  const status = resolve(testRoot, "status");
  const mockBin = resolve(testRoot, "mock-bin");
  const config = resolve(testRoot, "deploy.conf");
  const script = resolve("production/activate-release.sh");
  await Promise.all([
    mkdir(resolve(deployment, "bin"), { recursive: true }),
    mkdir(resolve(deployment, "shared"), { recursive: true }),
    mkdir(incoming, { recursive: true }),
    mkdir(status, { recursive: true }),
    mkdir(mockBin, { recursive: true })
  ]);

  try {
    await cp(resolve("production/verify-release.mjs"), resolve(deployment, "bin/verify-release.mjs"));
    await writeFile(resolve(mockBin, "systemctl"), `#!/usr/bin/env bash\nif [[ \"\${COSMOS_MOCK_SERVICE_FAILURE:-0}\" == 1 && \"\${1:-}\" == restart && \"\${2:-}\" == cosmos-python.service ]]; then exit 1; fi\nexit 0\n`, { mode: 0o755 });
    await writeFile(resolve(mockBin, "curl"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
    await writeFile(resolve(mockBin, "flock"), "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
    await writeFile(resolve(mockBin, "df"), `#!/usr/bin/env bash\nprintf 'Filesystem 1024-blocks Used Available Capacity Mounted on\\n'\nif [[ \"\${COSMOS_MOCK_LOW_DISK:-0}\" == 1 ]]; then printf 'mock 100 99 1 99%% /\\n'; else printf 'mock 1000000 1 999999 1%% /\\n'; fi\n`, { mode: 0o755 });

    const configBody = [
      `COSMOS_ROOT=${shellPath(deployment)}`,
      `INCOMING_DIR=${shellPath(incoming)}`,
      `STATUS_DIR=${shellPath(status)}`,
      "NODE_SERVICE=cosmos-node.service",
      "PYTHON_SERVICE=cosmos-python.service",
      "SERVICE_USER=nobody",
      "SERVICE_GROUP=nobody",
      "UPLOAD_USER=nobody",
      "UPLOAD_GROUP=nobody",
      "KEEP_RELEASES=2",
      "MIN_FREE_MIB=100",
      "ALLOW_LOW_MEMORY=1",
      `NODE_BIN=${shellPath(process.execPath)}`,
      `PATH=${shellPath(mockBin)}:$PATH`
    ].join("\n") + "\n";
    await writeFile(config, configBody, "utf8");

    const releaseA = "aaaaaaaa0001";
    const releaseB = "bbbbbbbb0002";
    const requirements = (await makeRelease(testRoot, "requirements0000")).manifest.requirementsSha256;
    await writeFile(resolve(deployment, "shared/requirements-production.sha256"), `${requirements}\n`, "utf8");
    await rm(resolve(testRoot, "source-requirements0000"), { recursive: true, force: true });

    const activate = (environment = {}) => run(bash, [shellPath(script), "--config", shellPath(config)], {
      env: { ...process.env, COSMOS_ACTIVATION_TEST_ROOT: shellPath(testRoot), ...environment }
    });
    const activeRelease = async () => JSON.parse(await readFile(resolve(status, "active.json"), "utf8")).activeRelease;

    await uploadRelease(testRoot, incoming, releaseA);
    let result = activate();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(resolve(status, "active.json")), true, `Activation produced no status.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
    assert.equal(await activeRelease(), releaseA);

    await uploadRelease(testRoot, incoming, releaseA);
    result = activate();
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await activeRelease(), releaseA);

    const corrupt = await uploadRelease(testRoot, incoming, "cccccccc0003");
    await appendFile(corrupt.archive, "corrupt", "utf8");
    result = activate();
    assert.notEqual(result.status, 0);
    assert.equal(await activeRelease(), releaseA);

    await uploadRelease(testRoot, incoming, "dddddddd0004");
    result = activate({ COSMOS_MOCK_LOW_DISK: "1" });
    assert.notEqual(result.status, 0);
    assert.equal(await activeRelease(), releaseA);

    await writeFile(resolve(deployment, "shared/requirements-production.sha256"), `${"0".repeat(64)}\n`, "utf8");
    await uploadRelease(testRoot, incoming, releaseB);
    result = activate();
    assert.notEqual(result.status, 0);
    assert.equal(await activeRelease(), releaseA);

    await writeFile(resolve(deployment, "shared/requirements-production.sha256"), `${requirements}\n`, "utf8");
    await uploadRelease(testRoot, incoming, releaseB);
    result = activate({ COSMOS_MOCK_SERVICE_FAILURE: "1" });
    assert.notEqual(result.status, 0);
    assert.equal(await activeRelease(), releaseA);
    assert.match(JSON.parse(await readFile(resolve(status, `release-${releaseB}.json`), "utf8")).message, /previous release restored/i);
  } finally {
    await rm(testRoot, { recursive: true, force: true });
  }
});
