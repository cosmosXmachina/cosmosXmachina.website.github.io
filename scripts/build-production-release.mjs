#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { basename, relative, resolve, sep } from "node:path";
import { build as bundle } from "esbuild";
import { componentHash, sha256File, verifyRelease } from "../production/verify-release.mjs";

const root = resolve(".");
const output = resolve(root, "release-output");
const allowDirty = process.argv.includes("--allow-dirty");
const releaseInputs = [
  "index.html", "privacy.html", "robots.txt", "sitemap.xml", "assets", "portfolio", "api",
  "python_service", "production", "scripts", "tests", "package.json", "package-lock.json",
  "vite.config.js", "playwright.config.js"
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: false, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
}

function capture(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

async function filesBelow(directory) {
  const nested = await Promise.all((await readdir(directory, { withFileTypes: true })).map(async (entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  }));
  return nested.flat();
}

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const { port } = server.address();
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
  return port;
}

async function waitFor(url, processState, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processState.child.exitCode !== null) throw new Error(`${processState.name} exited during packaged smoke:\n${processState.output}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`${processState.name} did not become healthy:\n${processState.output}`);
}

function start(command, args, { cwd, env, name }) {
  const state = { name, output: "" };
  state.child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const capture = (chunk) => { state.output = (state.output + chunk.toString("utf8")).slice(-8_000); };
  state.child.stdout.on("data", capture);
  state.child.stderr.on("data", capture);
  state.child.on("error", (error) => capture(Buffer.from(`${error.message}\n`)));
  return state;
}

async function stop(state) {
  if (!state?.child || state.child.exitCode !== null) return;
  const exited = once(state.child, "exit");
  state.child.kill("SIGTERM");
  await Promise.race([exited, new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000))]);
  if (state.child.exitCode === null) state.child.kill("SIGKILL");
}

async function smokePackagedRuntime(directory) {
  const [nodePort, pythonPort] = await Promise.all([freePort(), freePort()]);
  const localPython = process.platform === "win32"
    ? resolve(root, ".venv", "Scripts", "python.exe")
    : resolve(root, ".venv", "bin", "python");
  const pythonCommand = existsSync(localPython) ? localPython : process.platform === "win32" ? "python" : "python3";
  const environmentFile = resolve(directory, "missing-production.env");
  let python;
  let node;
  try {
    python = start(pythonCommand, [resolve(directory, "runtime/python/python_service/server.py")], {
      name: "Bundled Python service",
      cwd: resolve(directory, "runtime/python"),
      env: { ...process.env, COSMOS_ENV_FILE: environmentFile, PYTHON_LAB_PORT: String(pythonPort), PYTHONUNBUFFERED: "1" }
    });
    await waitFor(`http://127.0.0.1:${pythonPort}/health`, python);
    node = start(process.execPath, [resolve(directory, "runtime/node/api/server.bundle.mjs")], {
      name: "Bundled Node gateway",
      cwd: directory,
      env: {
        ...process.env,
        COSMOS_ENV_FILE: environmentFile,
        NODE_ENV: "production",
        PORT: String(nodePort),
        LAB_MODE: "fixture",
        LAB_SESSION_SECRET: "packaged-runtime-smoke-secret",
        AI_MODE: "fixture",
        AI_LIVE_ENABLED: "false",
        PYTHON_LAB_URL: `http://127.0.0.1:${pythonPort}`,
        VISIT_ANALYTICS_ENABLED: "false"
      }
    });
    await waitFor(`http://127.0.0.1:${nodePort}/api/lab/health`, node);
    run(process.execPath, [resolve(directory, "runtime/smoke-release.mjs")], {
      env: { ...process.env, NODE_HEALTH_URL: `http://127.0.0.1:${nodePort}`, PYTHON_HEALTH_URL: `http://127.0.0.1:${pythonPort}` }
    });
  } finally {
    await stop(node);
    await stop(python);
  }
  console.log("Packaged release runtime passed its private topology smoke test.");
}

const commit = capture("git", ["rev-parse", "HEAD"]);
const trackedDirty = capture("git", ["status", "--porcelain", "--untracked-files=no"]) !== "";
const untrackedRuntimeInput = capture("git", ["status", "--porcelain", "--untracked-files=all", "--", ...releaseInputs]) !== "";
const dirty = trackedDirty || untrackedRuntimeInput;
if (dirty && !allowDirty) throw new Error("Commit tracked changes before creating an uploadable production release. Use --allow-dirty only for local packaging tests.");
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const releaseId = dirty ? `${commit.slice(0, 12)}-dirty-${stamp.toLowerCase()}` : commit.slice(0, 12);
const stage = resolve(output, `.stage-${releaseId}`);
const archive = resolve(output, `cosmos-release-${releaseId}.tar.gz`);
const checksum = `${archive}.sha256`;
const ready = resolve(output, `cosmos-release-${releaseId}.ready`);

console.log("Running the complete local release gates.");
run(process.execPath, [resolve(root, "node_modules/vitest/vitest.mjs"), "run"]);
const nodeTests = (await readdir(resolve(root, "tests/node")))
  .filter((file) => file.endsWith(".test.js"))
  .map((file) => resolve(root, "tests/node", file));
run(process.execPath, ["--test", ...nodeTests]);
run(process.execPath, [resolve(root, "scripts/run-python-tests.mjs")]);
const [sitePort, nodePort, pythonPort] = await Promise.all([freePort(), freePort(), freePort()]);
run(process.execPath, [resolve(root, "node_modules/@playwright/test/cli.js"), "test"], {
  env: {
    ...process.env,
    E2E_SITE_PORT: String(sitePort),
    E2E_NODE_PORT: String(nodePort),
    E2E_PYTHON_PORT: String(pythonPort)
  }
});
run(process.execPath, [resolve(root, "scripts/build.mjs")]);

await mkdir(output, { recursive: true });
await rm(stage, { recursive: true, force: true });
await Promise.all([rm(archive, { force: true }), rm(checksum, { force: true }), rm(ready, { force: true })]);
await mkdir(resolve(stage, "runtime/node/api"), { recursive: true });
await mkdir(resolve(stage, "runtime/python/python_service"), { recursive: true });
await cp(resolve(root, "dist"), resolve(stage, "dist"), { recursive: true });

await bundle({
  entryPoints: [resolve(root, "api/server.mjs")],
  outfile: resolve(stage, "runtime/node/api/server.bundle.mjs"),
  bundle: true,
  minify: true,
  platform: "node",
  format: "esm",
  target: "node22.5",
  legalComments: "none",
  banner: { js: "import { createRequire as __cosmosCreateRequire } from 'node:module'; const require = __cosmosCreateRequire(import.meta.url);" }
});
await cp(resolve(root, "api/contact.js"), resolve(stage, "runtime/node/api/contact.js"));
await cp(resolve(root, "api/package.json"), resolve(stage, "runtime/node/api/package.json"));
for (const file of ["__init__.py", "app.py", "provider.py", "retrieval.py", "schemas.py", "server.py"]) {
  await cp(resolve(root, "python_service", file), resolve(stage, "runtime/python/python_service", file));
}
await cp(resolve(root, "python_service/requirements-production.txt"), resolve(stage, "runtime/python/requirements-production.txt"));
await cp(resolve(root, "production/smoke-release.mjs"), resolve(stage, "runtime/smoke-release.mjs"));

const files = [];
for (const path of (await filesBelow(stage)).sort()) {
  const name = relative(stage, path).split(sep).join("/");
  files.push({ path: name, bytes: (await stat(path)).size, sha256: await sha256File(path) });
}
const manifest = {
  schemaVersion: 1,
  releaseId,
  commit,
  dirty,
  createdAt: new Date().toISOString(),
  aiMode: "fixture",
  externalAI: false,
  nodeMinimum: "22.5.0",
  requirementsSha256: await sha256File(resolve(stage, "runtime/python/requirements-production.txt")),
  components: {
    frontend: componentHash(files, "dist/"),
    node: componentHash(files, "runtime/node/"),
    python: componentHash(files, "runtime/python/")
  },
  files,
  totalBytes: files.reduce((total, entry) => total + entry.bytes, 0)
};
await writeFile(resolve(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
await verifyRelease(stage, { expectedReleaseId: releaseId, allowDirty });
await smokePackagedRuntime(stage);

run("tar", ["-czf", archive, "-C", stage, "."]);
const archiveBytes = (await stat(archive)).size;
if (archiveBytes > 8 * 1024 * 1024) throw new Error(`Release archive exceeds 8 MiB: ${archiveBytes}`);
const archiveHash = createHash("sha256").update(await readFile(archive)).digest("hex");
await writeFile(checksum, `${archiveHash}  ${basename(archive)}\n`, "utf8");
await writeFile(ready, JSON.stringify({ schemaVersion: 1, releaseId, archive: basename(archive), sha256: archiveHash }, null, 2) + "\n", "utf8");
await rm(stage, { recursive: true, force: true });

console.log(`Release ${releaseId} is ready (${(archiveBytes / 1024 / 1024).toFixed(2)} MiB archive).`);
console.log(`Upload in order:\n  ${archive}\n  ${checksum}\n  ${ready} (last)`);
