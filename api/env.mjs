import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseValue(raw) {
  const value = raw.trim();
  if (
    (value.startsWith(String.fromCharCode(34)) && value.endsWith(String.fromCharCode(34))) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value.replace(/\s+#.*$/, "").trim();
}

export function loadEnv(file = resolve(".env")) {
  let source = "";
  try {
    source = readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }

  return source.split(/\r?\n/).reduce((environment, line) => {
    const match = line.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && !line.trim().startsWith("#")) environment[match[1]] = parseValue(match[2]);
    return environment;
  }, {});
}

export function allowedOrigins(environment) {
  return String(environment.ALLOWED_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
