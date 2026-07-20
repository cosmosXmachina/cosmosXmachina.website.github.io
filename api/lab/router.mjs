import { AIGateway } from "../ai/gateway.mjs";
import { actionCatalog, aiActionTasks, pythonDemos, validateAction } from "./catalog.mjs";
import { OrionFixtureDatabase } from "./orion-db.mjs";
import { SessionStore } from "./session-store.mjs";

const orionFixtures = new OrionFixtureDatabase();
const MAX_TEXT = 12000;

function cleanInput(value) {
  const serialized = JSON.stringify(value || {});
  if (Buffer.byteLength(serialized, "utf8") > MAX_TEXT) throw new Error("Request is too large");
  if (/<script|javascript:|onerror\s*=/i.test(serialized)) throw new Error("Hostile HTML rejected");
  return JSON.parse(serialized);
}

function standard({ demo, action, session, result, mode = "fixture", warnings = [] }) {
  return {
    ok: true,
    mode,
    demo,
    action,
    session: session.id,
    result,
    trace: {
      requestId: crypto.randomUUID(),
      deterministic: mode === "fixture",
      persisted: false
    },
    warnings,
    quota: {
      remaining: session.remaining,
      expiresAt: session.expiresAt
    }
  };
}

async function executePython(environment, demo, action, input) {
  const base = environment.PYTHON_LAB_URL || "http://127.0.0.1:8790";
  const parsed = new URL(base);
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new Error("PYTHON_LAB_URL must point to the private loopback interface");
  }

  const response = await fetch(base + "/execute/" + demo + "/" + action, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(4000)
  });
  if (!response.ok) throw new Error("Private Python pipeline failed");
  return response.json();
}

export function transition(session, demo, action, input) {
  const current = session.states[demo] || { step: "new", history: [], entities: {} };
  current.entities ||= {};
  const entityId = demo === "document-operations" ? input.messageId : demo === "operations-hub" ? input.orderId : null;
  const suppliedInitial = demo === "operations-hub"
    ? (["review", "packing", "blocked", "shipped"].includes(input.currentStatus) ? input.currentStatus : "review")
    : "new";
  const target = entityId
    ? (current.entities[entityId] ||= { step: suppliedInitial, history: [] })
    : current;
  const transitionRules = {
    "document-operations:approve": ["classified"],
    "document-operations:reject": ["classified"],
    "document-operations:reopen": ["approved", "rejected"],
    "operations-hub:advance": ["review", "packing", "blocked"]
  };
  const transitionKey = demo + ":" + action;

  if (transitionKey === "operations-hub:advance" && !["review", "packing", "shipped"].includes(input.next)) {
    throw new Error("Invalid operations state");
  }

  if (transitionRules[transitionKey] && !transitionRules[transitionKey].includes(target.step)) {
    throw new Error("Invalid state transition from " + target.step + " using " + action);
  }

  if (transitionKey === "operations-hub:advance") {
    const allowedNext = { review: "packing", packing: "shipped", blocked: "review" };
    if (allowedNext[target.step] !== input.next) throw new Error("Invalid operations transition");
    if (input.next === "shipped" && !["operations", "warehouse"].includes(input.role)) {
      throw new Error("Current role cannot mark an order as shipped");
    }
  }
  if (transitionKey === "operations-hub:assign" && !["operations", "sales", "warehouse"].includes(input.owner)) {
    throw new Error("Invalid operations owner");
  }

  const nextSteps = {
    classify: "classified",
    approve: "approved",
    reject: "rejected",
    reopen: "classified",
    advance: input.next || "review"
  };

  target.step = nextSteps[action] || target.step;
  target.history.push({ action, at: new Date().toISOString(), entityId });
  target.history = target.history.slice(-20);
  session.states[demo] = current;
  return target;
}

function executeRules(demo, action, input, state) {
  const outputs = {
    "document-operations:approve": { decision: "approved", humanReview: true, messageId: input.messageId },
    "document-operations:reject": { decision: "rejected", humanReview: true, messageId: input.messageId },
    "document-operations:reopen": { decision: "reopened", humanReview: true, messageId: input.messageId },
    "operations-hub:advance": { orderId: input.orderId, status: state.step },
    "operations-hub:assign": { orderId: input.orderId, owner: input.owner },
    "operations-hub:flag": { orderId: input.orderId, flagged: Boolean(input.flagged), reason: input.reason || null },
    "knowledge-assistant:feedback": { accepted: true, rating: input.rating },
    "kpi-studio:calculate": { scope: input.scope, calculated: true },
    "kpi-studio:compare": { baseline: input.baseline, comparison: input.comparison, calculated: true }
  };
  return {
    output: outputs[demo + ":" + action] || { status: "completed" },
    evidence: [],
    usage: { inputUnits: 0, outputUnits: 0, estimatedCost: 0 },
    trace: { provider: "rules", task: demo + ":" + action, deterministic: true },
    warnings: []
  };
}

export async function registerLabRoutes(app, environment) {
  const ai = new AIGateway(environment);
  const store = new SessionStore(
    environment.LAB_SESSION_SECRET || "local-development-secret-change-me"
  );

  app.get("/api/lab/health", async () => ({
    ok: true,
    mode: ai.mode,
    demos: Object.keys(actionCatalog),
    externalAI: ai.mode === "live",
    providers: ai.providers().map(({ id, simulated, liveReady }) => ({ id, simulated, liveReady })),
    python: environment.PYTHON_LAB_URL || "http://127.0.0.1:8790"
  }));

  app.get("/api/lab/providers", async () => ({
    ok: true,
    mode: ai.mode,
    defaultProvider: ai.defaultProvider,
    providers: ai.providers()
  }));

  app.post("/api/lab/session", async () => {
    const created = store.create();
    return {
      ok: true,
      mode: ai.mode,
      demo: null,
      action: "session",
      session: created.token,
      result: { expiresAt: created.expiresAt },
      trace: { persisted: false },
      warnings: [
        "Anonymous session expires after 30 minutes.",
        ai.mode === "fixture" ? "All provider choices are simulated; no external AI call is made." : "Live AI mode is enabled."
      ],
      quota: { remaining: created.remaining, expiresAt: created.expiresAt }
    };
  });

  app.post("/api/lab/:demo/reset", async (request, reply) => {
    try {
      const session = store.get(request.headers["x-lab-session"]);
      if (!actionCatalog[request.params.demo]) return reply.code(404).send({ ok: false, error: "Unknown demo" });
      store.reset(session, request.params.demo);
      return standard({
        demo: request.params.demo,
        action: "reset",
        session,
        result: { state: "new" },
        mode: ai.mode
      });
    } catch (error) {
      return reply.code(401).send({ ok: false, error: error.message });
    }
  });

  app.post("/api/lab/:demo/:action", async (request, reply) => {
    const { demo, action } = request.params;
    if (!validateAction(demo, action)) {
      return reply.code(404).send({ ok: false, error: "Unknown demo or action" });
    }

    try {
      const session = store.get(request.headers["x-lab-session"]);
      const input = cleanInput(request.body && request.body.input);
      const selectedProvider = request.body && request.body.provider;
      store.consume(session);
      const state = transition(session, demo, action, input);

      let execution;
      const task = aiActionTasks.get(demo + ":" + action);
      if (task) {
        let context = { demo, action };
        const preparationWarnings = [];
        if (pythonDemos.has(demo) && ["classify", "search"].includes(action)) {
          try {
            const prepared = await executePython(environment, demo, action, input);
            context = {
              ...context,
              evidence: prepared.evidence || [],
              preparedOutput: prepared.output || null,
              pipeline: prepared.trace || null
            };
          } catch {
            preparationWarnings.push("Private Python service unavailable; server fixture context used.");
          }
        }
        try {
          execution = await ai.execute({ provider: selectedProvider, task, context, input });
          execution.warnings.push(...preparationWarnings);
        } catch (error) {
          throw new Error("AI execution failed: " + error.message);
        }
      } else {
        execution = executeRules(demo, action, input, state);
      }

      if (demo === "operations-hub") {
        execution.output.orders = orionFixtures.orders();
      }

      return standard({
        demo,
        action,
        session,
        result: { execution, state },
        mode: ai.mode,
        warnings: execution.warnings || []
      });
    } catch (error) {
      const status = /session|quota/i.test(error.message) ? 401 : 400;
      return reply.code(status).send({ ok: false, error: error.message });
    }
  });
}
