import { FixtureAIProvider } from "./fixture-ai.js";
import { abstention, evaluateKnowledgeRequest, searchKnowledge } from "./knowledge-index.js";

const PROVIDERS = [
  ["openai", "OpenAI"],
  ["google", "Google Gemini"],
  ["anthropic", "Anthropic Claude"],
  ["xai", "xAI Grok"],
  ["openrouter", "OpenRouter"]
].map(([id, label]) => ({ id, label, model: "browser fixture", selectable: true, simulated: true, liveReady: false }));

const ROLE_SETS = {
  "document-operations": new Set(["visitor"]),
  "operations-hub": new Set(["operations", "sales", "warehouse"]),
  "knowledge-assistant": new Set(["support", "sales", "guest"]),
  "kpi-studio": new Set(["visitor"])
};
const ACTIONS = {
  "document-operations": new Set(["classify", "approve", "reject", "reopen"]),
  "operations-hub": new Set(["advance", "assign", "flag", "note", "brief"]),
  "knowledge-assistant": new Set(["search", "evaluate", "feedback"]),
  "kpi-studio": new Set(["brief"])
};
const SESSION_MS = 30 * 60 * 1000;
const ACTION_QUOTA = 25;
const MAX_REPLAYS = 40;

export class LabClientError extends Error {
  constructor(code, message, { retryable = false, requestId = null } = {}) {
    super(message);
    this.name = "LabClientError";
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

const fail = (code, message, details) => { throw new LabClientError(code, message, details); };
const clone = (value) => structuredClone(value);
const byteLength = (value) => new TextEncoder().encode(JSON.stringify(value)).length;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function cleanInput(value) {
  const input = clone(value || {});
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("INPUT_INVALID", "Input must be an object.");
  if (byteLength(input) > 12_000) fail("REQUEST_TOO_LARGE", "The request exceeds the demonstration limit.");
  if (/<script|javascript:|onerror\s*=|onload\s*=/i.test(JSON.stringify(input))) fail("HOSTILE_INPUT", "Executable HTML is not accepted.");
  return input;
}

function text(value, label, { min = 1, max = 600 } = {}) {
  if (typeof value !== "string" || value.trim().length < min || value.length > max) fail("INPUT_INVALID", `${label} is invalid.`);
  return value.trim();
}

function oneOf(value, values, label) {
  if (!values.has(value)) fail("INPUT_INVALID", `${label} is not supported.`);
  return value;
}

function language(value) {
  return oneOf(value || "en", new Set(["it", "en"]), "Language");
}

function documentFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INPUT_INVALID", "Document fields are invalid.");
  const requestedDate = text(value.requestedDate, "Requested date", { max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || Number.isNaN(Date.parse(`${requestedDate}T00:00:00Z`))) fail("INPUT_INVALID", "Requested date must be a valid ISO date.");
  const total = Number(value.total);
  if (!Number.isFinite(total) || total <= 0 || total > 10_000_000) fail("INPUT_INVALID", "Total must be a positive bounded number.");
  const currency = text(value.currency, "Currency", { min: 3, max: 3 }).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) fail("INPUT_INVALID", "Currency must be a three-letter code.");
  return { orderReference: text(value.orderReference, "Order reference", { max: 80 }), requestedDate, total, currency };
}

function validateInput(demo, action, raw) {
  const input = cleanInput(raw);
  const key = `${demo}:${action}`;
  if (key === "document-operations:classify") return { messageId: text(input.messageId, "Message ID", { max: 24 }), body: text(input.body, "Document body", { max: 4000 }), language: language(input.language) };
  if (["document-operations:approve", "document-operations:reject", "document-operations:reopen"].includes(key)) {
    return { messageId: text(input.messageId, "Message ID", { max: 24 }), fields: action === "approve" ? documentFields(input.fields) : null, language: language(input.language) };
  }
  if (demo === "operations-hub") {
    const base = {
      orderId: text(input.orderId, "Order ID", { max: 24 }),
      role: oneOf(input.role, ROLE_SETS[demo], "Role"),
      currentStatus: oneOf(input.currentStatus || "review", new Set(["review", "packing", "blocked", "shipped"]), "Order state"),
      language: language(input.language)
    };
    if (action === "advance") return { ...base, next: oneOf(input.next, new Set(["review", "packing", "shipped"]), "Next state") };
    if (action === "assign") return { ...base, owner: oneOf(input.owner, new Set(["operations", "sales", "warehouse"]), "Owner") };
    if (action === "flag") return { ...base, flagged: Boolean(input.flagged), reason: input.reason ? text(input.reason, "Flag reason", { max: 240 }) : null };
    if (action === "note") return { ...base, note: text(input.note, "Internal note", { max: 500 }) };
    if (action === "brief") return { ...base, order: clone(input.order || {}), inventory: Array.isArray(input.inventory) ? clone(input.inventory.slice(0, 20)) : [] };
  }
  if (demo === "knowledge-assistant") {
    const role = oneOf(input.role, ROLE_SETS[demo], "Role");
    if (action === "search") return { question: text(input.question, "Question", { max: 600 }), role, language: language(input.language) };
    if (action === "evaluate") return { question: text(input.question, "Question", { max: 600 }), answer: text(input.answer, "Answer", { max: 2000 }), citations: Array.isArray(input.citations) ? input.citations.slice(0, 12).map((item) => text(item, "Citation", { max: 240 })) : [], role, language: language(input.language) };
    if (action === "feedback") return { rating: oneOf(input.rating, new Set(["useful", "review"]), "Rating"), questionId: text(input.questionId, "Question ID", { max: 600 }), role, language: language(input.language) };
  }
  if (key === "kpi-studio:brief") {
    const months = Number(input.months);
    if (![3, 6].includes(months)) fail("INPUT_INVALID", "Reporting period must be three or six months.");
    return { scope: oneOf(input.scope, new Set(["all", "italy", "export"]), "Scope"), months, metrics: clone(input.metrics || {}), quality: clone(input.quality || {}), scenarioGrowth: Math.max(-10, Math.min(25, Number(input.scenarioGrowth) || 0)), language: language(input.language) };
  }
  fail("ACTION_NOT_FOUND", "The requested demonstration action does not exist.");
}

function roleFor(demo, input) {
  return ["operations-hub", "knowledge-assistant"].includes(demo) ? input.role || "visitor" : "visitor";
}

function transition(states, demo, action, input, role) {
  const current = states[demo] || { step: "new", history: [], entities: {} };
  current.entities ||= {};
  const entityId = demo === "document-operations" ? input.messageId : demo === "operations-hub" ? input.orderId : null;
  const existingTarget = entityId ? current.entities[entityId] : null;
  const target = entityId ? (current.entities[entityId] ||= { step: demo === "operations-hub" ? input.currentStatus : "new", history: [] }) : current;
  if (demo === "operations-hub" && existingTarget && target.step !== input.currentStatus) fail("STATE_TRANSITION_INVALID", "The order changed since this view was loaded.");
  const required = {
    "document-operations:approve": ["classified"], "document-operations:reject": ["classified"],
    "document-operations:reopen": ["approved", "rejected"], "operations-hub:advance": ["review", "packing", "blocked"]
  }[`${demo}:${action}`];
  if (required && !required.includes(target.step)) fail("STATE_TRANSITION_INVALID", `The ${action} action is not allowed from ${target.step}.`);
  if (demo === "operations-hub" && action === "advance") {
    const allowed = { review: "packing", packing: "shipped", blocked: "review" };
    if (allowed[target.step] !== input.next) fail("STATE_TRANSITION_INVALID", "The requested operations transition is not allowed.");
    if (input.next === "shipped" && !["operations", "warehouse"].includes(role)) fail("ROLE_FORBIDDEN", "The current role cannot mark an order as shipped.");
  }
  target.step = { classify: "classified", approve: "approved", reject: "rejected", reopen: "classified", advance: input.next }[action] || target.step;
  if (action === "assign") target.owner = input.owner;
  if (action === "flag") Object.assign(target, { flagged: input.flagged, flagReason: input.reason });
  if (action === "note") target.note = input.note;
  if (["approve", "reject"].includes(action)) target.fields = clone(input.fields);
  target.history = [...(target.history || []), { action, entityId, actorRole: role }].slice(-20);
  states[demo] = current;
  return target;
}

function wait(ms, signal) {
  if (signal?.aborted) return Promise.reject(new LabClientError("REQUEST_ABORTED", "The request was cancelled."));
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new LabClientError("REQUEST_ABORTED", "The request was cancelled.")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export class BrowserLabRuntime {
  constructor({ now = () => Date.now(), latency = 110, provider = new FixtureAIProvider(), idFactory = null } = {}) {
    this.now = now;
    this.latency = latency;
    this.provider = provider;
    this.sequence = 0;
    this.idFactory = idFactory || (() => `browser-${String(++this.sequence).padStart(6, "0")}`);
    this.sessions = new Map();
  }

  static roleFor = roleFor;

  async getProviders() {
    return { ok: true, mode: "fixture-browser", defaultProvider: "openai", providers: clone(PROVIDERS) };
  }

  session(role) {
    const existing = this.sessions.get(role);
    if (existing && existing.expiresAt > this.now()) return existing;
    const created = { id: this.idFactory(), role, expiresAt: this.now() + SESSION_MS, remaining: ACTION_QUOTA, states: existing ? clone(existing.states) : {}, replays: new Map(), busy: false };
    this.sessions.set(role, created);
    return created;
  }

  reset(role) {
    if (role) this.sessions.delete(role);
    else this.sessions.clear();
  }

  async runAction(demo, action, rawInput = {}, provider = "openai", { idempotencyKey = this.idFactory(), signal } = {}) {
    if (!ACTIONS[demo]?.has(action)) fail("ACTION_NOT_FOUND", "The requested demonstration action does not exist.");
    if (!PROVIDERS.some((item) => item.id === provider)) fail("PROVIDER_UNAVAILABLE", "The selected simulated provider is unavailable.");
    const input = validateInput(demo, action, rawInput);
    const role = roleFor(demo, input);
    if (!ROLE_SETS[demo]?.has(role)) fail("ROLE_FORBIDDEN", "The selected role cannot perform this action.");
    const session = this.session(role);
    const fingerprint = JSON.stringify(stable({ demo, action, input, provider }));
    const replay = session.replays.get(idempotencyKey);
    if (replay) {
      if (replay.fingerprint !== fingerprint) fail("IDEMPOTENCY_CONFLICT", "The same request key was reused with different data.");
      const payload = clone(replay.payload);
      payload.trace.replayed = true;
      payload.warnings.push(input.language === "it" ? "Risposta deterministica riprodotta senza consumare quota." : "Deterministic response replayed without consuming quota.");
      return payload;
    }
    if (session.remaining <= 0) fail("QUOTA_EXCEEDED", "The synthetic session action limit has been reached.");
    if (session.busy) fail("ACTION_IN_PROGRESS", "Another demonstration action is still running.");

    session.busy = true;
    try {
      await wait(this.latency, signal);
      const draftStates = clone(session.states);
      const state = transition(draftStates, demo, action, input, role);
      const execution = await this.execute(demo, action, input, provider);
      if (signal?.aborted) fail("REQUEST_ABORTED", "The request was cancelled.");
      const payload = {
        ok: true, mode: "fixture-browser", demo, action, session: session.id, role,
        result: { execution, state },
        trace: { requestId: idempotencyKey, deterministic: true, persisted: demo === "operations-hub", replayed: false },
        warnings: clone(execution.warnings || []),
        quota: { remaining: session.remaining - 1, expiresAt: session.expiresAt }
      };
      session.states = draftStates;
      session.remaining -= 1;
      session.replays.set(idempotencyKey, { fingerprint, payload: clone(payload) });
      while (session.replays.size > MAX_REPLAYS) session.replays.delete(session.replays.keys().next().value);
      return payload;
    } finally {
      session.busy = false;
    }
  }

  async execute(demo, action, input, targetProvider) {
    if (demo === "knowledge-assistant" && action === "search") {
      const policy = evaluateKnowledgeRequest(input);
      const evidence = policy.allowed ? searchKnowledge(input.question, input.role, input.language) : [];
      const preparedOutput = policy.allowed && evidence.length
        ? { answer: evidence[0].answer, confidence: Math.min(.96, .72 + evidence.length * .08), citations: evidence.map((item) => `${item.source}, ${item.section}`), abstained: false, reason: null }
        : abstention(policy.reason || (input.language === "it" ? "Nessuna evidenza consentita supporta questa risposta." : "No permitted evidence supports this answer."));
      return this.provider.execute({ task: "knowledge_search", schema: { id: "knowledge-assistant.search", type: "object" }, context: { demo, action, preparedOutput, evidence, retrieval: "browser-inverted-index" }, input, targetProvider });
    }
    const tasks = {
      "document-operations:classify": "document_classify",
      "operations-hub:brief": "operations_risk_brief",
      "knowledge-assistant:evaluate": "knowledge_evaluate",
      "kpi-studio:brief": "kpi_narrative"
    };
    const task = tasks[`${demo}:${action}`];
    if (task) return this.provider.execute({ task, schema: { id: `${demo}.${action}`, type: "object" }, context: { demo, action }, input, targetProvider });
    return {
      output: demo === "knowledge-assistant" ? { accepted: true, rating: input.rating } : { status: "completed" },
      evidence: [], usage: { inputUnits: 0, outputUnits: 0, estimatedCost: 0 },
      trace: { provider: "browser-rules", targetProvider, task: `${demo}:${action}`, deterministic: true }, warnings: []
    };
  }
}

export const runtimeInternals = { ACTION_QUOTA, SESSION_MS, cleanInput, stable, transition, validateInput };
