import { AppError } from "../errors.mjs";

export const sessionRoles = new Set(["visitor", "operations", "sales", "warehouse", "support", "guest"]);
const owners = new Set(["operations", "sales", "warehouse"]);
const ratings = new Set(["useful", "review"]);
const scopes = new Set(["all", "italy", "export"]);
const languages = new Set(["it", "en"]);

function invalid(message) {
  throw new AppError("INPUT_INVALID", message, { status: 422 });
}

function object(value, label = "Input") {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${label} must be an object.`);
  return value;
}

function text(value, label, { min = 1, max = 600 } = {}) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) {
    invalid(`${label} must contain between ${min} and ${max} characters.`);
  }
  return value.trim();
}

function oneOf(value, values, label) {
  if (!values.has(value)) invalid(`${label} is not supported.`);
  return value;
}

function documentFields(value) {
  object(value, "Document fields");
  const requestedDate = text(value.requestedDate, "Requested date", { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(Date.parse(`${requestedDate}T00:00:00Z`))) {
    invalid("Requested date must be a valid ISO date.");
  }
  const total = Number(value.total);
  if (!Number.isFinite(total) || total <= 0 || total > 10_000_000) invalid("Total must be a positive bounded number.");
  const currency = text(value.currency, "Currency", { min: 3, max: 3 }).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) invalid("Currency must be a three-letter code.");
  return {
    orderReference: text(value.orderReference, "Order reference", { max: 80 }),
    requestedDate,
    total,
    currency
  };
}

function language(value) {
  return oneOf(value || "en", languages, "Language");
}

export function cleanInput(value, maxBytes = 12_000) {
  const serialized = JSON.stringify(value || {});
  if (Buffer.byteLength(serialized, "utf8") > maxBytes) {
    throw new AppError("REQUEST_TOO_LARGE", "The request exceeds the demonstration limit.", { status: 413 });
  }
  if (/<script|javascript:|onerror\s*=|onload\s*=/i.test(serialized)) {
    throw new AppError("HOSTILE_INPUT", "Executable HTML is not accepted.", { status: 422 });
  }
  return JSON.parse(serialized);
}

export function validateSessionRole(value) {
  const role = value == null ? "visitor" : String(value).toLowerCase();
  if (!sessionRoles.has(role)) invalid("Session role is not supported.");
  return role;
}

export function validateRole(session, demo, input) {
  const required = demo === "operations-hub"
    ? new Set(["operations", "sales", "warehouse"])
    : demo === "knowledge-assistant"
      ? new Set(["support", "sales", "guest"])
      : new Set(["visitor"]);
  if (!required.has(session.role)) {
    throw new AppError("ROLE_FORBIDDEN", "This session role cannot use the requested workflow.", { status: 403 });
  }
  if (input.role != null && input.role !== session.role) {
    throw new AppError("ROLE_MISMATCH", "The requested role does not match the signed session.", { status: 403 });
  }
}

export function validateActionInput(demo, action, raw) {
  const input = object(raw || {});
  const key = `${demo}:${action}`;
  if (key === "document-operations:classify") {
    return { messageId: text(input.messageId, "Message ID", { max: 24 }), body: text(input.body, "Document body", { max: 4000 }), language: language(input.language) };
  }
  if (["document-operations:approve", "document-operations:reject", "document-operations:reopen"].includes(key)) {
    return {
      messageId: text(input.messageId, "Message ID", { max: 24 }),
      fields: action === "approve" ? documentFields(input.fields) : null,
      language: language(input.language)
    };
  }
  if (demo === "operations-hub") {
    const base = {
      orderId: text(input.orderId, "Order ID", { max: 24 }),
      role: oneOf(input.role, new Set(["operations", "sales", "warehouse"]), "Role"),
      currentStatus: oneOf(input.currentStatus || "review", new Set(["review", "packing", "blocked", "shipped"]), "Order state")
      , language: language(input.language)
    };
    if (action === "advance") return { ...base, next: oneOf(input.next, new Set(["review", "packing", "shipped"]), "Next state") };
    if (action === "assign") return { ...base, owner: oneOf(input.owner, owners, "Owner") };
    if (action === "flag") return { ...base, flagged: Boolean(input.flagged), reason: input.reason ? text(input.reason, "Flag reason", { max: 240 }) : null };
    if (action === "note") return { ...base, note: text(input.note, "Internal note", { max: 500 }) };
    if (action === "brief") return { ...base, order: object(input.order, "Order"), inventory: Array.isArray(input.inventory) ? input.inventory.slice(0, 20) : [] };
  }
  if (demo === "knowledge-assistant") {
    const role = oneOf(input.role, new Set(["support", "sales", "guest"]), "Role");
    if (action === "search") return { question: text(input.question, "Question", { max: 600 }), role, language: language(input.language) };
    if (action === "evaluate") return {
      question: text(input.question, "Question", { max: 600 }),
      answer: text(input.answer, "Answer", { max: 2000 }),
      citations: Array.isArray(input.citations) ? input.citations.slice(0, 12).map((item) => text(item, "Citation", { max: 240 })) : [],
      role,
      language: language(input.language)
    };
    if (action === "feedback") return { rating: oneOf(input.rating, ratings, "Rating"), questionId: text(input.questionId, "Question ID", { max: 600 }), role, language: language(input.language) };
  }
  if (demo === "kpi-studio") {
    if (action === "calculate") return { scope: oneOf(input.scope, scopes, "Scope"), months: Number(input.months) };
    if (action === "compare") return { baseline: object(input.baseline, "Baseline"), comparison: object(input.comparison, "Comparison") };
    if (action === "brief") {
      const months = Number(input.months);
      if (![3, 6].includes(months)) invalid("Reporting period must be three or six months.");
      return {
        scope: oneOf(input.scope, scopes, "Scope"),
        months,
        metrics: object(input.metrics, "Metrics"),
        quality: object(input.quality, "Quality"),
        scenarioGrowth: Math.max(-10, Math.min(25, Number(input.scenarioGrowth) || 0)),
        language: language(input.language)
      };
    }
  }
  invalid("No validator exists for this action.");
}
