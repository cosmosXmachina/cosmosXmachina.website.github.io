"use strict";

const tls = require("node:tls");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const ENV = {
  ...loadDotEnv(path.resolve(process.env.COSMOS_ENV_FILE || path.resolve(__dirname, "..", ".env"))),
  ...process.env
};
const MAX_BODY_BYTES = 32 * 1024;
const FIELD_LIMITS = {
  lang: 8,
  name: 120,
  email: 180,
  type: 180,
  budget: 120,
  tools: 1000,
  problem: 5000,
  company: 200
};

async function contactHandler(req, res) {
  const origin = header(req, "origin");
  setCors(res, origin);

  if (req.method === "OPTIONS") return sendJson(res, 204);
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  if (!originAllowed(origin)) return sendJson(res, 403, { error: "Origin not allowed" });

  let payload;
  try {
    payload = normalizePayload(await readJsonBody(req));
  } catch (error) {
    return sendJson(res, 400, { error: "Invalid JSON body" });
  }

  if (payload.company) return sendJson(res, 200, { ok: true });

  const validationError = validatePayload(payload);
  if (validationError) return sendJson(res, 400, { error: validationError });

  const smtp = smtpConfigFromDotEnv();
  if (!smtp.user || !smtp.pass || !smtp.to || !smtp.from) {
    return sendJson(res, 500, { error: "Mail server is not configured" });
  }

  try {
    await sendSmtpMail(smtp, buildMessage(payload, smtp));
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("SMTP contact delivery failed:", error);
    return sendJson(res, 502, { error: "Mail delivery failed" });
  }
}

module.exports = contactHandler;

if (require.main === module) {
  const http = require("node:http");
  const port = Number(ENV.PORT || 8787);
  http.createServer(contactHandler).listen(port, "127.0.0.1", () => {
    console.log(`cosmosXmachina contact endpoint listening on http://127.0.0.1:${port}`);
  });
}

function smtpConfigFromDotEnv() {
  const pass = ENV.SMTP_PASS || "";
  const user = ENV.SMTP_USER || "";
  return {
    host: ENV.SMTP_HOST || "smtp.gmail.com",
    port: Number(ENV.SMTP_PORT || 465),
    user,
    pass: pass.replace(/\s+/g, ""),
    from: ENV.MAIL_FROM || user,
    to: ENV.MAIL_TO || user
  };
}

function loadDotEnv(filePath) {
  let raw = "";
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }

  return raw.split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return env;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) return env;
    env[match[1]] = parseEnvValue(match[2]);
    return env;
  }, {});
}

function parseEnvValue(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const inner = trimmed.slice(1, -1);
    return trimmed.startsWith('"')
      ? inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
      : inner.replace(/\\'/g, "'");
  }
  return trimmed.replace(/\s+#.*$/, "").trim();
}

async function sendSmtpMail(config, message) {
  const socket = tls.connect({
    host: config.host,
    port: config.port,
    servername: config.host,
    rejectUnauthorized: true
  });
  socket.setTimeout(12000);

  const reader = createSmtpReader(socket);
  await reader.ready;

  const command = async (line, expected) => {
    socket.write(`${line}\r\n`);
    expectSmtp(await reader.read(), expected);
  };

  try {
    expectSmtp(await reader.read(), 220);
    await command("EHLO cosmosxmachina.website", 250);
    await command("AUTH LOGIN", 334);
    await command(Buffer.from(config.user, "utf8").toString("base64"), 334);
    await command(Buffer.from(config.pass, "utf8").toString("base64"), 235);
    await command(`MAIL FROM:<${cleanEmailAddress(config.from)}>`, 250);
    await command(`RCPT TO:<${cleanEmailAddress(config.to)}>`, 250);
    await command("DATA", 354);
    socket.write(`${dotStuff(message)}\r\n.\r\n`);
    expectSmtp(await reader.read(), 250);
    await command("QUIT", 221);
  } finally {
    socket.end();
  }
}

function createSmtpReader(socket) {
  let buffer = "";
  let failure = null;
  const waiters = [];

  const ready = new Promise((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });

  socket.on("data", chunk => {
    buffer += chunk.toString("utf8");
    flush();
  });

  socket.on("timeout", () => {
    socket.destroy(new Error("SMTP connection timed out"));
  });

  socket.on("error", error => {
    failure = error;
    while (waiters.length) waiters.shift().reject(error);
  });

  function read() {
    if (failure) return Promise.reject(failure);
    return new Promise((resolve, reject) => {
      waiters.push({ resolve, reject });
      flush();
    });
  }

  function flush() {
    while (waiters.length) {
      const response = extractSmtpResponse();
      if (!response) break;
      waiters.shift().resolve(response);
    }
  }

  function extractSmtpResponse() {
    const match = buffer.match(/(?:^|\r\n)(\d{3}) [^\r\n]*\r\n/);
    if (!match) return null;
    const end = match.index + match[0].length;
    const response = buffer.slice(0, end);
    buffer = buffer.slice(end);
    return response;
  }

  return { ready, read };
}

function expectSmtp(response, expected) {
  const accepted = Array.isArray(expected) ? expected : [expected];
  const code = smtpCode(response);
  if (!accepted.includes(code)) {
    throw new Error(`SMTP expected ${accepted.join("/")} but received ${code}: ${response.trim()}`);
  }
}

function smtpCode(response) {
  const lines = response.trimEnd().split(/\r\n/);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (/^\d{3} /.test(lines[index])) return Number(lines[index].slice(0, 3));
  }
  return Number(response.slice(0, 3));
}

function buildMessage(payload, smtp) {
  const subject = payload.lang === "it"
    ? `Richiesta progetto cosmosXmachina - ${payload.type}`
    : `cosmosXmachina project request - ${payload.type}`;
  const labels = payload.lang === "it"
    ? { name: "Nome", email: "Email", type: "Tipo di progetto", budget: "Budget indicativo", tools: "Strumenti usati oggi", problem: "Problema / risultato desiderato", language: "Lingua" }
    : { name: "Name", email: "Email", type: "Project type", budget: "Indicative budget", tools: "Tools used today", problem: "Problem / desired outcome", language: "Language" };

  const body = [
    `${labels.language}: ${payload.lang}`,
    `${labels.name}: ${payload.name}`,
    `${labels.email}: ${payload.email}`,
    `${labels.type}: ${payload.type}`,
    `${labels.budget}: ${payload.budget}`,
    `${labels.tools}: ${payload.tools || "-"}`,
    "",
    `${labels.problem}:`,
    payload.problem
  ].join("\r\n");

  const headers = [
    `From: ${formatAddress("cosmosXmachina website", smtp.from)}`,
    `To: ${formatAddress("cosmosXmachina", smtp.to)}`,
    `Reply-To: ${formatAddress(payload.name, payload.email)}`,
    `Subject: ${encodedHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@cosmosxmachina.website>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit"
  ];

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const item = Buffer.from(chunk);
    total += item.length;
    if (total > MAX_BODY_BYTES) throw new Error("Request body is too large");
    chunks.push(item);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function normalizePayload(raw) {
  return Object.keys(FIELD_LIMITS).reduce((payload, key) => {
    payload[key] = cleanText(raw?.[key], FIELD_LIMITS[key]);
    return payload;
  }, {});
}

function validatePayload(payload) {
  if (!payload.name) return "Name is required";
  if (!validEmail(payload.email)) return "A valid email is required";
  if (!payload.type) return "Project type is required";
  if (!payload.problem) return "Problem description is required";
  return "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function cleanText(value, limit) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, limit);
}

function cleanHeader(value) {
  return cleanText(value, 240).replace(/[\r\n]+/g, " ").replace(/"/g, "'");
}

function cleanEmailAddress(value) {
  return String(value || "").replace(/[<>\r\n]/g, "").trim();
}

function formatAddress(name, email) {
  return `"${cleanHeader(name)}" <${cleanEmailAddress(email)}>`;
}

function encodedHeader(value) {
  return `=?UTF-8?B?${Buffer.from(cleanHeader(value), "utf8").toString("base64")}?=`;
}

function dotStuff(message) {
  return message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function originAllowed(origin) {
  const allowed = allowedOrigins();
  return !allowed.length || !origin || allowed.includes(origin);
}

function allowedOrigins() {
  return String(ENV.ALLOWED_ORIGIN || "")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function setCors(res, origin) {
  const allowed = allowedOrigins();
  const allowOrigin = allowed.length ? (allowed.includes(origin) ? origin : allowed[0]) : (origin || "*");
  setHeader(res, "Access-Control-Allow-Origin", allowOrigin);
  setHeader(res, "Access-Control-Allow-Methods", "POST, OPTIONS");
  setHeader(res, "Access-Control-Allow-Headers", "Content-Type, Accept");
  setHeader(res, "Vary", "Origin");
}

function sendJson(res, statusCode, payload = null) {
  res.statusCode = statusCode;
  setHeader(res, "Content-Type", "application/json; charset=utf-8");
  if (statusCode === 204) return res.end();
  return res.end(JSON.stringify(payload || {}));
}

function header(req, name) {
  return req.headers?.[name] || req.headers?.[name.toLowerCase()] || "";
}

function setHeader(res, name, value) {
  if (typeof res.setHeader === "function") res.setHeader(name, value);
}
