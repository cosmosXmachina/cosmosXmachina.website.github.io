const ALLOWED_ROLES = new Set(["support", "sales"]);
const DISALLOWED_SUBJECT = /password|credential|private key|salar(?:y|ies)|stipendi?|compensation/i;
const INJECTION_PATTERN = /ignore (?:all |the )?(?:previous |permissions?)|reveal restricted|bypass/i;

export function evaluateKnowledgeRequest(input) {
  const role = String(input?.role || "support");
  const question = String(input?.question || "");
  const italian = input?.language === "it";
  if (!ALLOWED_ROLES.has(role)) {
    return { allowed: false, reason: italian ? "Il ruolo attivo non dispone di raccolte di evidenze consentite." : "The active role has no permitted evidence collection." };
  }
  if (DISALLOWED_SUBJECT.test(question) || INJECTION_PATTERN.test(question)) {
    return { allowed: false, reason: italian ? "Nessuna evidenza consentita supporta questa risposta." : "No permitted evidence supports this answer." };
  }
  return { allowed: true, reason: "" };
}
