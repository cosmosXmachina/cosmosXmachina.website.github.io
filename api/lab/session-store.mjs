import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { AppError } from "../errors.mjs";

const TTL_MS = 30 * 60 * 1000;
const MAX_ACTIONS = 25;
const MAX_SESSIONS = 2_000;
const MAX_IDEMPOTENCY_RECORDS = 40;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sessionError(code, message) {
  return new AppError(code, message, { status: 401 });
}

export class SessionStore {
  constructor(secret, now = () => Date.now(), { maxSessions = MAX_SESSIONS } = {}) {
    if (!secret || secret.length < 24) throw new Error("LAB_SESSION_SECRET must contain at least 24 characters");
    this.secret = secret;
    this.now = now;
    this.maxSessions = maxSessions;
    this.sessions = new Map();
  }

  create({ role = "visitor" } = {}) {
    this.sweep();
    if (this.sessions.size >= this.maxSessions) {
      throw new AppError("SESSION_CAPACITY", "Anonymous session capacity is temporarily full.", {
        status: 503,
        retryable: true
      });
    }
    const record = {
      id: randomUUID(),
      role,
      createdAt: this.now(),
      expiresAt: this.now() + TTL_MS,
      remaining: MAX_ACTIONS,
      states: {},
      idempotency: new Map(),
      queue: Promise.resolve()
    };
    this.sessions.set(record.id, record);
    return {
      token: this.sign({ id: record.id, exp: record.expiresAt }),
      expiresAt: record.expiresAt,
      remaining: record.remaining,
      role: record.role
    };
  }

  get(token) {
    const payload = this.verify(token);
    const record = this.sessions.get(payload.id);
    if (!record || record.expiresAt <= this.now()) {
      if (record) this.sessions.delete(record.id);
      throw sessionError("SESSION_EXPIRED", "The anonymous session expired.");
    }
    return record;
  }

  async run(record, { idempotencyKey, fingerprint, operation }) {
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey || "")) {
      throw new AppError("IDEMPOTENCY_KEY_REQUIRED", "A valid idempotency key is required.", { status: 400 });
    }
    const existing = record.idempotency.get(idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new AppError("IDEMPOTENCY_CONFLICT", "The idempotency key was reused with different input.", { status: 409 });
      }
      return { ...(await existing.promise), replayed: true };
    }

    const promise = record.queue.then(async () => {
      if (record.remaining <= 0) throw sessionError("QUOTA_EXHAUSTED", "The anonymous session quota is exhausted.");
      const draft = { ...record, states: structuredClone(record.states) };
      const value = await operation(draft);
      record.states = draft.states;
      record.remaining -= 1;
      return { value, remaining: record.remaining, replayed: false };
    });
    record.queue = promise.then(() => undefined, () => undefined);
    record.idempotency.set(idempotencyKey, { fingerprint, promise });
    if (record.idempotency.size > MAX_IDEMPOTENCY_RECORDS) {
      record.idempotency.delete(record.idempotency.keys().next().value);
    }
    try {
      return await promise;
    } catch (error) {
      record.idempotency.delete(idempotencyKey);
      throw error;
    }
  }

  reset(record, demo) {
    delete record.states[demo];
  }

  sweep() {
    const now = this.now();
    for (const [id, record] of this.sessions) {
      if (record.expiresAt <= now) this.sessions.delete(id);
    }
  }

  sign(payload) {
    const body = encode(payload);
    return body + "." + createHmac("sha256", this.secret).update(body).digest("base64url");
  }

  verify(token) {
    if (!token || !token.includes(".")) throw sessionError("SESSION_INVALID", "The anonymous session is invalid.");
    const [body, signature] = token.split(".");
    const expected = createHmac("sha256", this.secret).update(body).digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw sessionError("SESSION_INVALID", "The anonymous session is invalid.");
    let payload;
    try {
      payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    } catch {
      throw sessionError("SESSION_INVALID", "The anonymous session is invalid.");
    }
    if (!payload.exp || payload.exp <= this.now()) throw sessionError("SESSION_EXPIRED", "The anonymous session expired.");
    return payload;
  }
}

export const sessionLimits = {
  ttlMs: TTL_MS,
  maxActions: MAX_ACTIONS,
  maxSessions: MAX_SESSIONS,
  maxIdempotencyRecords: MAX_IDEMPOTENCY_RECORDS
};
