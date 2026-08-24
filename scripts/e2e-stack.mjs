import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const children = [];
let stopping = false;
const localProfile = process.argv.includes("--local");
const sitePort = Number(process.env.E2E_SITE_PORT || 4173);
const nodePort = Number(process.env.E2E_NODE_PORT || 8787);
const pythonPort = Number(process.env.E2E_PYTHON_PORT || 8790);

function start(command, args, environment = {}) {
  const child = spawn(command, args, {
    cwd: resolve("."),
    env: { ...process.env, ...environment },
    stdio: "inherit",
    windowsHide: true
  });
  children.push(child);
  child.once("exit", (code) => {
    setTimeout(() => {
      if (!stopping) {
        console.error(`${command} exited before the test stack stopped (${code}).`);
        stop(code || 1);
      }
    }, 250).unref();
  });
  return child;
}

async function waitFor(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse()) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 250).unref();
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => stop(0));
process.on("uncaughtException", (error) => { console.error(error); stop(1); });
process.on("unhandledRejection", (error) => { console.error(error); stop(1); });

if (localProfile) {
  const localPython = process.platform === "win32"
    ? resolve(".venv", "Scripts", "python.exe")
    : resolve(".venv", "bin", "python");
  const python = existsSync(localPython) ? localPython : process.platform === "win32" ? "python" : "python3";
  start(python, ["-m", "uvicorn", "python_service.app:app", "--host", "127.0.0.1", "--port", String(pythonPort)], { PYTHONUNBUFFERED: "1" });
  await waitFor(`http://127.0.0.1:${pythonPort}/health`);
  start(process.execPath, ["api/server.mjs"], {
    NODE_ENV: "development", PORT: String(nodePort), AI_MODE: "fixture",
    LAB_SESSION_SECRET: "local-e2e-session-secret-change-me", LAB_SESSION_RATE_LIMIT: "500",
    ALLOWED_ORIGIN: `http://127.0.0.1:${sitePort}`, PYTHON_LAB_URL: `http://127.0.0.1:${pythonPort}`
  });
  await waitFor(`http://127.0.0.1:${nodePort}/api/lab/health`);
}

start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(sitePort), "--strictPort"], {
  VITE_BROWSER_FIXTURES: "false",
  VITE_API_TARGET: `http://127.0.0.1:${nodePort}`
});
await waitFor(`http://127.0.0.1:${sitePort}/portfolio/`);
console.log(localProfile
  ? `cosmosXmachina is ready at http://127.0.0.1:${sitePort}/ (Ctrl+C stops all services).`
  : "Static-only Creation Lab E2E stack is ready; no Lab backend is running.");
await new Promise(() => {});
