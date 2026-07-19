import Fastify from "fastify";
import cors from "@fastify/cors";
import { createRequire } from "node:module";
import { allowedOrigins, loadEnv } from "./env.mjs";
import { registerLabRoutes } from "./lab/router.mjs";

const require = createRequire(import.meta.url);
const contactHandler = require("./contact.js");
const environment = loadEnv();
const origins = allowedOrigins(environment);
const app = Fastify({
  logger: false,
  bodyLimit: 64 * 1024,
  requestTimeout: 12000
});

await app.register(cors, {
  origin(origin, callback) {
    if (!origin || !origins.length || origins.includes(origin)) callback(null, true);
    else callback(new Error("Origin not allowed"), false);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["content-type", "accept", "x-lab-session"]
});

app.post("/api/contact", async (request, reply) => {
  reply.hijack();
  await contactHandler(
    {
      method: request.method,
      headers: request.headers,
      body: request.body
    },
    reply.raw
  );
});

await registerLabRoutes(app, environment);

app.setErrorHandler((error, request, reply) => {
  const status = error.statusCode && error.statusCode < 500 ? error.statusCode : 400;
  reply.code(status).send({ ok: false, error: status === 400 ? error.message : "Request failed" });
});

const port = Number(environment.PORT || 8787);
await app.listen({ host: "127.0.0.1", port });
console.log("cosmosXmachina gateway listening on http://127.0.0.1:" + port);
