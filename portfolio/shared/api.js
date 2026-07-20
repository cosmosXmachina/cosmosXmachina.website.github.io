import { FixtureAIProvider } from "./fixture-ai.js";
import { evaluateKnowledgeRequest } from "./knowledge-policy.js";

const provider = new FixtureAIProvider();
let sessionToken = null;
const providerKey = "cosmos-lab-provider";

export function getPreferredProvider() {
  return sessionStorage.getItem(providerKey) || "openai";
}

export function setPreferredProvider(provider) {
  sessionStorage.setItem(providerKey, provider);
}

export async function getProviders() {
  try {
    const response = await fetch("/api/lab/providers", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Provider catalog unavailable");
    return await response.json();
  } catch {
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
}

async function getSession() {
  if (sessionToken) return sessionToken;

  const response = await fetch("/api/lab/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  if (!response.ok) throw new Error("Session service unavailable");
  const payload = await response.json();
  sessionToken = payload.session;
  return sessionToken;
}

function fixtureTask(demo, action) {
  const tasks = {
    "document-operations:classify": "document_classify",
    "knowledge-assistant:search": "knowledge_search"
  };
  return tasks[demo + ":" + action] || demo + "_" + action;
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
      fixture.output = {
        answer: null,
        confidence: 0,
        citations: [],
        abstained: true,
        reason: policy.reason
      };
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
    result: fixture,
    trace: fixture.trace,
    warnings: fixture.warnings,
    quota: { remaining: 24, resetsAt: null }
  };
}

const providerFixture = provider;

export async function runAction(demo, action, input = {}, requestedProvider = getPreferredProvider()) {
  let response;
  try {
    const token = await getSession();
    response = await fetch("/api/lab/" + demo + "/" + action, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lab-session": token
      },
      body: JSON.stringify({ input, provider: requestedProvider })
    });
  } catch {
    return browserFixture(demo, action, input, requestedProvider);
  }
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    throw new Error(failure.error || "Lab action failed");
  }
  return response.json();
}

export function resetSession() {
  sessionToken = null;
}
