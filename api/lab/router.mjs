import { createHash } from "node:crypto";
import { AIGateway } from "../ai/gateway.mjs";
import { AppError, errorPayload, normalizeError } from "../errors.mjs";
import { actionCatalog, aiActionTasks, pythonDemos, validateAction } from "./catalog.mjs";
import { OrionFixtureDatabase } from "./orion-db.mjs";
import { SessionStore } from "./session-store.mjs";
import { cleanInput, validateActionInput, validateRole, validateSessionRole } from "./validation.mjs";
import { abstention, evaluateKnowledgeRequest } from "./knowledge-policy.mjs";

const orionFixtures = new OrionFixtureDatabase();

class FixedWindowLimiter {
  constructor({ limit = 20, windowMs = 10 * 60 * 1000, now = () => Date.now() } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.entries = new Map();
  }

  consume(key) {
    const now = this.now();
    const current = this.entries.get(key);
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + this.windowMs } : current;
    entry.count += 1;
    this.entries.set(key, entry);
    if (entry.count > this.limit) {
      throw new AppError("RATE_LIMITED", "Too many anonymous sessions were requested. Try again later.", {
        status: 429,
        retryable: true
      });
    }
  }
}

function standard({ demo, action, session, result, mode, requestId, warnings = [], remaining, replayed = false }) {
  return {
    ok: true,
    mode,
    demo,
    action,
    session: session.id,
    role: session.role,
    result,
    trace: {
      requestId,
      deterministic: mode === "fixture",
      persisted: false,
      replayed
    },
    warnings: replayed ? [...warnings, "A completed idempotent response was replayed without consuming quota."] : warnings,
    quota: { remaining, expiresAt: session.expiresAt }
  };
}

async function executePython(environment, demo, action, input) {
  const base = environment.PYTHON_LAB_URL || "http://127.0.0.1:8790";
  const parsed = new URL(base);
  if (!["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)) {
    throw new AppError("PIPELINE_CONFIGURATION", "The private pipeline must use a loopback address.", { status: 500 });
  }
  let response;
  try {
    response = await fetch(base + "/execute/" + demo + "/" + action, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input }),
      signal: AbortSignal.timeout(Number(environment.PYTHON_LAB_TIMEOUT_MS || 4000))
    });
  } catch (error) {
    throw new AppError("PIPELINE_UNAVAILABLE", "The private deterministic pipeline is unavailable.", {
      status: 503,
      retryable: true,
      cause: error
    });
  }
  if (!response.ok) {
    throw new AppError("PIPELINE_FAILED", "The private deterministic pipeline rejected the request.", {
      status: response.status >= 500 ? 503 : 422,
      retryable: response.status >= 500
    });
  }
  return response.json();
}

export function transition(session, demo, action, input) {
  const current = session.states[demo] || { step: "new", history: [], entities: {} };
  current.entities ||= {};
  const entityId = demo === "document-operations" ? input.messageId : demo === "operations-hub" ? input.orderId : null;
  const initial = demo === "operations-hub" ? input.currentStatus : "new";
  const target = entityId
    ? (current.entities[entityId] ||= { step: initial || "new", history: [] })
    : current;
  const key = `${demo}:${action}`;
  const requiredStates = {
    "document-operations:approve": ["classified"],
    "document-operations:reject": ["classified"],
    "document-operations:reopen": ["approved", "rejected"],
    "operations-hub:advance": ["review", "packing", "blocked"]
  };
  if (requiredStates[key] && !requiredStates[key].includes(target.step)) {
    throw new AppError("STATE_TRANSITION_INVALID", `The ${action} action is not allowed from ${target.step}.`, { status: 409 });
  }
  if (key === "operations-hub:advance") {
    const allowedNext = { review: "packing", packing: "shipped", blocked: "review" };
    if (allowedNext[target.step] !== input.next) {
      throw new AppError("STATE_TRANSITION_INVALID", "The requested operations transition is not allowed.", { status: 409 });
    }
    if (input.next === "shipped" && !["operations", "warehouse"].includes(session.role)) {
      throw new AppError("ROLE_FORBIDDEN", "The current role cannot mark an order as shipped.", { status: 403 });
    }
  }

  const nextSteps = { classify: "classified", approve: "approved", reject: "rejected", reopen: "classified", advance: input.next };
  target.step = nextSteps[action] || target.step;
  if (action === "assign") target.owner = input.owner;
  if (action === "flag") Object.assign(target, { flagged: input.flagged, flagReason: input.reason });
  if (action === "note") target.note = input.note;
  if (["approve", "reject"].includes(action)) target.fields = structuredClone(input.fields);
  target.history.push({ action, at: new Date().toISOString(), entityId, actorRole: session.role });
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
    "operations-hub:assign": { orderId: input.orderId, owner: state.owner },
    "operations-hub:flag": { orderId: input.orderId, flagged: state.flagged, reason: state.flagReason || null },
    "operations-hub:note": { orderId: input.orderId, note: state.note },
    "knowledge-assistant:feedback": { accepted: true, rating: input.rating },
    "kpi-studio:calculate": { scope: input.scope, calculated: true },
    "kpi-studio:compare": { baseline: input.baseline, comparison: input.comparison, calculated: true }
  };
  return {
    output: outputs[`${demo}:${action}`] || { status: "completed" },
    evidence: [],
    usage: { inputUnits: 0, outputUnits: 0, estimatedCost: 0 },
    trace: { provider: "rules", task: `${demo}:${action}`, deterministic: true },
    warnings: []
  };
}

function fingerprint(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url");
}

function sendFailure(reply, request, error) {
  const normalized = normalizeError(error);
  return reply.code(normalized.status).send(errorPayload(normalized, request.id));
}

export async function registerLabRoutes(app, environment) {
  const ai = new AIGateway(environment);
  const production = String(environment.NODE_ENV).toLowerCase() === "production";
  const secret = environment.LAB_SESSION_SECRET || (production ? "" : "local-development-secret-change-me");
  if (!secret) throw new Error("LAB_SESSION_SECRET is required in production");
  const store = new SessionStore(secret);
  const sessionLimiter = new FixedWindowLimiter({
    limit: Number(environment.LAB_SESSION_RATE_LIMIT || 20),
    windowMs: Number(environment.LAB_SESSION_RATE_WINDOW_MS || 10 * 60 * 1000)
  });

  app.get("/api/lab/health", async () => ({
    ok: true,
    mode: ai.mode,
    demos: Object.keys(actionCatalog),
    externalAI: ai.mode === "live",
    providers: ai.providers().map(({ id, simulated, liveReady }) => ({ id, simulated, liveReady })),
    python: "private-loopback"
  }));

  app.get("/api/lab/providers", async () => ({
    ok: true,
    mode: ai.mode,
    defaultProvider: ai.defaultProvider,
    providers: ai.providers()
  }));

  app.post("/api/lab/session", async (request, reply) => {
    try {
      sessionLimiter.consume(request.ip || "anonymous");
      const role = validateSessionRole(request.body?.role);
      const created = store.create({ role });
      return {
        ok: true,
        mode: ai.mode,
        demo: null,
        action: "session",
        session: created.token,
        role: created.role,
        result: { expiresAt: created.expiresAt },
        trace: { requestId: request.id, persisted: false },
        warnings: [
          "Anonymous session expires after 30 minutes.",
          ai.mode === "fixture" ? "All provider choices are simulated; no external AI call is made." : "Live AI mode is enabled."
        ],
        quota: { remaining: created.remaining, expiresAt: created.expiresAt }
      };
    } catch (error) {
      return sendFailure(reply, request, error);
    }
  });

  app.post("/api/lab/:demo/reset", async (request, reply) => {
    try {
      const session = store.get(request.headers["x-lab-session"]);
      if (!actionCatalog[request.params.demo]) throw new AppError("DEMO_NOT_FOUND", "The requested demonstration does not exist.", { status: 404 });
      store.reset(session, request.params.demo);
      return standard({
        demo: request.params.demo,
        action: "reset",
        session,
        result: { state: "new" },
        mode: ai.mode,
        requestId: request.id,
        remaining: session.remaining
      });
    } catch (error) {
      return sendFailure(reply, request, error);
    }
  });

  app.post("/api/lab/:demo/:action", async (request, reply) => {
    const { demo, action } = request.params;
    if (!validateAction(demo, action)) {
      return sendFailure(reply, request, new AppError("ACTION_NOT_FOUND", "The requested demonstration action does not exist.", { status: 404 }));
    }
    try {
      const session = store.get(request.headers["x-lab-session"]);
      const input = validateActionInput(demo, action, cleanInput(request.body?.input));
      validateRole(session, demo, input);
      const selectedProvider = request.body?.provider;
      const idempotencyKey = request.headers["x-idempotency-key"];
      const run = await store.run(session, {
        idempotencyKey,
        fingerprint: fingerprint({ demo, action, input, selectedProvider }),
        operation: async (draft) => {
          const state = transition(draft, demo, action, input);
          let execution;
          const task = aiActionTasks.get(`${demo}:${action}`);
          if (task) {
            let context = { demo, action };
            if (pythonDemos.has(demo) && ["classify", "search"].includes(action)) {
              const policy = demo === "knowledge-assistant" ? evaluateKnowledgeRequest(input) : { allowed: true };
              if (!policy.allowed) {
                context = { ...context, evidence: [], preparedOutput: abstention(policy.reason), policy: "abstain" };
              } else {
                const prepared = await executePython(environment, demo, action, input);
                context = {
                  ...context,
                  evidence: prepared.evidence || [],
                  preparedOutput: prepared.output || null,
                  pipeline: prepared.trace || null
                };
              }
            }
            execution = await ai.execute({ provider: selectedProvider, task, context, input });
          } else {
            execution = executeRules(demo, action, input, state);
          }
          if (demo === "operations-hub") execution.output.orders = orionFixtures.orders();
          return { execution, state };
        }
      });
      return standard({
        demo,
        action,
        session,
        result: run.value,
        mode: ai.mode,
        requestId: request.id,
        warnings: run.value.execution.warnings || [],
        remaining: run.remaining,
        replayed: run.replayed
      });
    } catch (error) {
      return sendFailure(reply, request, error);
    }
  });
}

export const routerInternals = { FixedWindowLimiter, executePython, fingerprint };
