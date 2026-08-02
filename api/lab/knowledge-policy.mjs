const RESTRICTED = /password|credential|credenziali|private key|chiave privata|salar(?:y|ies)|stipendi?|compensation|retribuzion[ei]|hr record|dati personale|customer note/i;
const INJECTION = /ignore (?:all |the )?(?:previous |system |permissions?)|ignora (?:tutti |i |le )?(?:precedenti |sistema |permessi)|reveal restricted|mostra (?:i )?dati riservati|bypass|aggira|jailbreak|hidden prompt|prompt nascosto/i;

export function evaluateKnowledgeRequest(input) {
  const question = String(input?.question || "");
  const italian = input?.language === "it";
  if (INJECTION.test(question)) return { allowed: false, reason: italian ? "La richiesta tenta di aggirare i permessi di ricerca." : "The request attempts to override retrieval permissions." };
  if (RESTRICTED.test(question)) return { allowed: false, reason: italian ? "Nessuna evidenza consentita supporta questa risposta." : "No permitted evidence supports this answer." };
  return { allowed: true, reason: null };
}

export function abstention(reason) {
  return { answer: null, confidence: 0, citations: [], abstained: true, reason };
}
