import Fastify from "fastify";
import cors from "@fastify/cors";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { allowedOrigins, loadEnv } from "./env.mjs";
import { errorPayload, normalizeError } from "./errors.mjs";
import { registerLabRoutes } from "./lab/router.mjs";
import { createVisitAnalytics } from "./visit-analytics.mjs";

const require = createRequire(import.meta.url);
const contactHandler = require("./contact.js");

export async function buildServer(environment = loadEnv()) {
  const origins = allowedOrigins(environment);
  const production = String(environment.NODE_ENV).toLowerCase() === "production";
  const app = Fastify({
    logger: false,
    bodyLimit: 64 * 1024,
    requestTimeout: 12_000,
    trustProxy: production ? ["127.0.0.1", "::1"] : false
  });

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (origins.includes(origin)) return callback(null, true);
      if (!production && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["content-type", "accept", "x-lab-session", "x-idempotency-key"]
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return payload;
  });

  app.post("/api/contact", async (request, reply) => {
    reply.hijack();
    await contactHandler({ method: request.method, headers: request.headers, body: request.body }, reply.raw);
  });

  await registerLabRoutes(app, environment);

  app.setErrorHandler((error, request, reply) => {
    const normalized = normalizeError(error);
    reply.code(normalized.status).send(errorPayload(normalized, request.id));
  });
  return app;
}

async function start() {
  const environment = loadEnv();
  const app = await buildServer(environment);
  const analytics = createVisitAnalytics(environment);
  const port = Number(environment.PORT || 8787);
  await analytics.start();
  try {
    await app.listen({ host: "127.0.0.1", port });
  } catch (error) {
    await analytics.close();
    throw error;
  }
  const stop = async () => {
    await app.close();
    await analytics.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.log(`cosmosXmachina gateway listening on http://127.0.0.1:${port}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await start();
}
