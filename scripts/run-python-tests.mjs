import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const candidates = process.platform === "win32"
  ? [resolve(".venv", "Scripts", "python.exe"), "python"]
  : [resolve(".venv", "bin", "python"), "python3", "python"];

const interpreter = candidates.find((candidate) =>
  candidate.includes(".venv") ? existsSync(candidate) : true
);

const result = spawnSync(
  interpreter,
  ["-m", "pytest", "-p", "no:cacheprovider", "python_service/tests"],
  { stdio: "inherit" }
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
