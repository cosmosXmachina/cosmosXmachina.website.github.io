import { FixtureAIProvider } from "./fixture-ai.js";
import { evaluateKnowledgeRequest } from "./knowledge-policy.js";

const provider = new FixtureAIProvider();
let sessionToken = null;

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
    "knowledge-assistant:search": "knowledge_search",
    "catalog-intelligence:enrich": "catalog_enrich"
  };
  return tasks[demo + ":" + action] || demo + "_" + action;
}

export async function runAction(demo, action, input = {}) {
  try {
    const token = await getSession();
    const response = await fetch("/api/lab/" + demo + "/" + action, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lab-session": token
      },
      body: JSON.stringify({ input })
    });
    if (!response.ok) throw new Error("Lab action failed");
    return await response.json();
  } catch {
    const fixture = await provider.execute({
      task: fixtureTask(demo, action),
      schema: { type: "object" },
      context: { demo, action },
      input
    });

    if (demo === "knowledge-assistant" && action === "search") {
      const policy = evaluateKnowledgeRequest(input);
      if (!policy.allowed) {
        fixture.output = {
          answer: null,
          confidence: 0,
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
}

export function resetSession() {
  sessionToken = null;
}
