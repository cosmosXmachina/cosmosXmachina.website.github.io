import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const TTL_MS = 30 * 60 * 1000;
const MAX_ACTIONS = 25;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export class SessionStore {
  constructor(secret, now = () => Date.now()) {
    if (!secret || secret.length < 24) {
      throw new Error("LAB_SESSION_SECRET must contain at least 24 characters");
    }
    this.secret = secret;
    this.now = now;
    this.sessions = new Map();
  }

  create() {
    this.sweep();
    const record = {
      id: randomUUID(),
      createdAt: this.now(),
      expiresAt: this.now() + TTL_MS,
      remaining: MAX_ACTIONS,
      states: {}
    };
    this.sessions.set(record.id, record);
    return {
      token: this.sign({ id: record.id, exp: record.expiresAt }),
      expiresAt: record.expiresAt,
      remaining: record.remaining
    };
  }

  get(token) {
    const payload = this.verify(token);
    const record = this.sessions.get(payload.id);
    if (!record || record.expiresAt <= this.now()) {
      if (record) this.sessions.delete(record.id);
      throw new Error("Session expired");
    }
    return record;
  }

  consume(record) {
    if (record.remaining <= 0) throw new Error("Session quota exhausted");
    record.remaining -= 1;
    return record.remaining;
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
    if (!token || !token.includes(".")) throw new Error("Invalid session");
    const [body, signature] = token.split(".");
    const expected = createHmac("sha256", this.secret).update(body).digest("base64url");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid session");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp <= this.now()) throw new Error("Session expired");
    return payload;
  }
}

export const sessionLimits = { ttlMs: TTL_MS, maxActions: MAX_ACTIONS };
