import { actionCatalog, pythonDemos, validateAction } from "./catalog.mjs";
import { FixtureAIProvider } from "./fixture-provider.mjs";
import { OrionFixtureDatabase } from "./orion-db.mjs";
import { IntegrationPipeline } from "./integration-pipeline.mjs";
import { SessionStore } from "./session-store.mjs";

const orionFixtures = new OrionFixtureDatabase();
const provider = new FixtureAIProvider();
const MAX_TEXT = 12000;

function cleanInput(value) {
  const serialized = JSON.stringify(value || {});
  if (Buffer.byteLength(serialized, "utf8") > MAX_TEXT) throw new Error("Request is too large");
  if (/<script|javascript:|onerror\s*=/i.test(serialized)) throw new Error("Hostile HTML rejected");
  return JSON.parse(serialized);
}

function standard({ demo, action, session, result, warnings = [] }) {
  return {
    ok: true,
    mode: "fixture",
    demo,
    action,
    session: session.id,
    result,
    trace: {
      requestId: crypto.randomUUID(),
      deterministic: true,
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
  const current = session.states[demo] || { step: "new", history: [] };
  const transitionRules = {
    "document-operations:approve": ["classified"],
    "document-operations:reject": ["classified"],
    "catalog-intelligence:approve": ["enriched"],
    "catalog-intelligence:rollback": ["approved"],
    "operations-hub:advance": ["new", "review", "packing"],
    "integration-control:retry": ["failed", "dead_letter", "new"],
    "integration-control:replay": ["dead_letter", "failed", "new"],
    "lead-appointment:confirm": ["booked"]
  };
  const transitionKey = demo + ":" + action;

  if (transitionRules[transitionKey] && !transitionRules[transitionKey].includes(current.step)) {
    throw new Error("Invalid state transition from " + current.step + " using " + action);
  }

  if (transitionKey === "operations-hub:advance" && !["review", "packing", "shipped"].includes(input.next)) {
    throw new Error("Invalid operations state");
  }

  const nextSteps = {
    classify: "classified",
    enrich: "enriched",
    approve: "approved",
    reject: "rejected",
    rollback: "rolled_back",
    advance: input.next || "review",
    retry: "processed",
    replay: "processed",
    book: "booked",
    confirm: "confirmed"
  };

  current.step = nextSteps[action] || action;
  current.history.push({ action, at: new Date().toISOString() });
  current.history = current.history.slice(-12);
  session.states[demo] = current;
  return current;
}

export async function registerLabRoutes(app, environment) {
  const store = new SessionStore(
    environment.LAB_SESSION_SECRET || "local-development-secret-change-me"
  );

  app.get("/api/lab/health", async () => ({
    ok: true,
    mode: "fixture",
    demos: Object.keys(actionCatalog),
    externalAI: false,
    python: environment.PYTHON_LAB_URL || "http://127.0.0.1:8790"
  }));

  app.post("/api/lab/session", async () => {
    const created = store.create();
    return {
      ok: true,
      mode: "fixture",
      demo: null,
      action: "session",
      session: created.token,
      result: { expiresAt: created.expiresAt },
      trace: { persisted: false },
      warnings: ["Anonymous session expires after 30 minutes."],
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
        result: { state: "new" }
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
      store.consume(session);
      const state = transition(session, demo, action, input);

      let execution;
      if (pythonDemos.has(demo) && ["classify", "search", "enrich"].includes(action)) {
        try {
          execution = await executePython(environment, demo, action, input);
        } catch {
          execution = await provider.executeDemo(demo, action, input);
          execution.warnings.push("Private Python service unavailable; deterministic Node fixture used.");
        }
      } else {
        execution = await provider.executeDemo(demo, action, input);
      }

      if (demo === "operations-hub") {
        execution.output.orders = orionFixtures.orders();
      }

      if (demo === "integration-control") {
        execution.output.event = new IntegrationPipeline(state).execute(action, input);
      }

      return standard({
        demo,
        action,
        session,
        result: { execution, state },
        warnings: execution.warnings || []
      });
    } catch (error) {
      const status = /session|quota/i.test(error.message) ? 401 : 400;
      return reply.code(status).send({ ok: false, error: error.message });
    }
  });
}
