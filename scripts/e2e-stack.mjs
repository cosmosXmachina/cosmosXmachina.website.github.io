import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const children = [];
let stopping = false;

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

const python = process.platform === "win32"
  ? resolve(".venv", "Scripts", "python.exe")
  : resolve(".venv", "bin", "python");
if (!existsSync(python)) throw new Error("Create .venv and install python_service/requirements.txt before E2E tests.");

start(python, ["-m", "uvicorn", "python_service.app:app", "--host", "127.0.0.1", "--port", "8790"], {
  PYTHONUNBUFFERED: "1"
});
await waitFor("http://127.0.0.1:8790/health");

start(process.execPath, ["api/server.mjs"], {
  NODE_ENV: "test",
  PORT: "8787",
  AI_MODE: "fixture",
  LAB_SESSION_SECRET: "local-e2e-session-secret-change-me",
  LAB_SESSION_RATE_LIMIT: "500",
  ALLOWED_ORIGIN: "http://127.0.0.1:4173",
  PYTHON_LAB_URL: "http://127.0.0.1:8790"
});
await waitFor("http://127.0.0.1:8787/api/lab/health");

start(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4173", "--strictPort"], {
  VITE_BROWSER_FIXTURES: "false"
});
await waitFor("http://127.0.0.1:4173/portfolio/");
console.log("Local Creation Lab E2E stack is ready.");
await new Promise(() => {});
