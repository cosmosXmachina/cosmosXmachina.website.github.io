const KEY = "cosmos-lab-handoff";
const TTL_MS = 15 * 60 * 1000;

export function createHandoff({ demo, summary, language }) {
  const payload = {
    demo,
    summary,
    language,
    createdAt: Date.now(),
    expiresAt: Date.now() + TTL_MS
  };
  sessionStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export function sendToContact(payload) {
  createHandoff(payload);
  window.location.href = "/?lang=" + payload.language + "#contact";
}

export function readHandoff() {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    if (payload.expiresAt <= Date.now()) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return payload;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}
