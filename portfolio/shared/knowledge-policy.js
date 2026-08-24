const ALLOWED_ROLES = new Set(["support", "sales", "guest"]);
const DISALLOWED_SUBJECT = /password|credential|credenziali|private key|chiave privata|salar(?:y|ies)|stipendi?|compensation|retribuzion[ei]|hr record|dati personale|customer note/i;
const INJECTION_PATTERN = /ignore (?:all |the )?(?:previous |system |permissions?)|ignora (?:tutti |i |le )?(?:precedenti |sistema |permessi)|reveal restricted|mostra (?:i )?dati riservati|bypass|aggira|jailbreak|hidden prompt|prompt nascosto/i;

export function evaluateKnowledgeRequest(input) {
  const role = String(input?.role || "support");
  const question = String(input?.question || "");
  const italian = input?.language === "it";
  if (!ALLOWED_ROLES.has(role)) {
    return { allowed: false, reason: italian ? "Il ruolo attivo non dispone di raccolte di evidenze consentite." : "The active role has no permitted evidence collection." };
  }
  if (INJECTION_PATTERN.test(question)) {
    return { allowed: false, reason: italian ? "La richiesta tenta di aggirare i permessi di ricerca." : "The request attempts to override retrieval permissions." };
  }
  if (DISALLOWED_SUBJECT.test(question)) {
    return { allowed: false, reason: italian ? "Nessuna evidenza consentita supporta questa risposta." : "No permitted evidence supports this answer." };
  }
  return { allowed: true, reason: "" };
}
