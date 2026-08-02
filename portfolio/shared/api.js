import { FixtureAIProvider } from "./fixture-ai.js";
import { evaluateKnowledgeRequest } from "./knowledge-policy.js";

const providerFixture = new FixtureAIProvider();
const sessions = new Map();
const providerKey = "cosmos-lab-provider";
const browserFixturesEnabled = import.meta.env.DEV && (
  import.meta.env.MODE === "fixtures" || import.meta.env.VITE_BROWSER_FIXTURES === "true"
);

export class LabClientError extends Error {
  constructor(code, message, { retryable = false, requestId = null } = {}) {
    super(message);
    this.name = "LabClientError";
    this.code = code;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

export function getPreferredProvider() {
  return sessionStorage.getItem(providerKey) || "openai";
}

export function setPreferredProvider(provider) {
  sessionStorage.setItem(providerKey, provider);
}

function localCatalog() {
  return {
    ok: true,
    mode: "fixture-browser",
    defaultProvider: "openai",
    providers: [
      ["openai", "OpenAI"],
      ["google", "Google Gemini"],
      ["anthropic", "Anthropic Claude"],
      ["xai", "xAI Grok"],
      ["openrouter", "OpenRouter"]
    ].map(([id, label]) => ({ id, label, model: "configured on server", selectable: true, simulated: true, liveReady: false }))
  };
}

export async function getProviders() {
  try {
    const response = await fetch("/api/lab/providers", { headers: { accept: "application/json" } });
    if (!response.ok) throw await failureFrom(response);
    return await response.json();
  } catch (error) {
    if (browserFixturesEnabled) return localCatalog();
    throw networkFailure(error, "Provider catalog unavailable");
  }
}

async function getSession(role) {
  if (sessions.has(role)) return sessions.get(role);
  const response = await fetch("/api/lab/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role })
  });
  if (!response.ok) throw await failureFrom(response);
  const payload = await response.json();
  sessions.set(role, payload.session);
  return payload.session;
}

function fixtureTask(demo, action) {
  return {
    "document-operations:classify": "document_classify",
    "operations-hub:brief": "operations_risk_brief",
    "knowledge-assistant:search": "knowledge_search",
    "knowledge-assistant:evaluate": "knowledge_evaluate",
    "kpi-studio:brief": "kpi_narrative"
  }[`${demo}:${action}`] || `${demo}_${action}`;
}

function fixtureState(demo, action, input) {
  if (demo === "document-operations") return { step: { classify: "classified", approve: "approved", reject: "rejected", reopen: "classified" }[action] || "new" };
  if (demo !== "operations-hub") return { step: "completed" };
  return {
    step: action === "advance" ? input.next : input.currentStatus,
    owner: action === "assign" ? input.owner : undefined,
    flagged: action === "flag" ? input.flagged : undefined,
    note: action === "note" ? input.note : undefined
  };
}

async function browserFixture(demo, action, input, provider) {
  const fixture = await providerFixture.execute({
    task: fixtureTask(demo, action),
    schema: { type: "object" },
    context: { demo, action },
    input,
    targetProvider: provider
  });
  if (demo === "knowledge-assistant" && action === "search") {
    const policy = evaluateKnowledgeRequest(input);
    if (!policy.allowed) {
      fixture.output = { answer: null, confidence: 0, citations: [], abstained: true, reason: policy.reason };
      fixture.evidence = [];
      fixture.warnings.push(policy.reason);
    }
  }
  return {
    ok: true,
    mode: "fixture-browser",
    demo,
    action,
    session: "local-preview",
    result: { execution: fixture, state: fixtureState(demo, action, input) },
    trace: fixture.trace,
    warnings: fixture.warnings,
    quota: { remaining: 24, expiresAt: null }
  };
}

function roleFor(demo, input) {
  if (demo === "operations-hub" || demo === "knowledge-assistant") return input.role || "visitor";
  return "visitor";
}

function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() || `lab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function failureFrom(response) {
  const payload = await response.json().catch(() => ({}));
  const error = payload.error || {};
  return new LabClientError(
    typeof error === "string" ? "REQUEST_FAILED" : error.code || "REQUEST_FAILED",
    typeof error === "string" ? error : error.message || "Lab action failed",
    typeof error === "object" ? error : {}
  );
}

function networkFailure(error, fallback) {
  if (error instanceof LabClientError) return error;
  return new LabClientError("SERVICE_UNAVAILABLE", fallback, { retryable: true });
}

export async function runAction(demo, action, input = {}, requestedProvider = getPreferredProvider()) {
  const role = roleFor(demo, input);
  const key = idempotencyKey();
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const token = await getSession(role);
      const response = await fetch(`/api/lab/${demo}/${action}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lab-session": token,
          "x-idempotency-key": key
        },
        body: JSON.stringify({ input, provider: requestedProvider })
      });
      if (!response.ok) {
        const failure = await failureFrom(response);
        if (["SESSION_INVALID", "SESSION_EXPIRED"].includes(failure.code) && attempt === 0) {
          sessions.delete(role);
          continue;
        }
        throw failure;
      }
      return await response.json();
    } catch (error) {
      lastError = networkFailure(error, "The Creation Lab service is unavailable.");
      if (error instanceof LabClientError || attempt > 0) break;
    }
  }
  if (browserFixturesEnabled && lastError?.code === "SERVICE_UNAVAILABLE") {
    return browserFixture(demo, action, input, requestedProvider);
  }
  throw lastError;
}

export function resetSession(role) {
  if (role) sessions.delete(role);
  else sessions.clear();
}

export const clientInternals = { browserFixturesEnabled, roleFor };
