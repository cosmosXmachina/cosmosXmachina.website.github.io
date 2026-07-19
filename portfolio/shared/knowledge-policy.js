const ALLOWED_ROLES = new Set(["support", "sales"]);
const DISALLOWED_SUBJECT = /password|credential|private key|salary|compensation/i;
const INJECTION_PATTERN = /ignore (?:all |the )?(?:previous |permissions?)|reveal restricted|bypass/i;

export function evaluateKnowledgeRequest(input) {
  const role = String(input?.role || "support");
  const question = String(input?.question || "");
  if (!ALLOWED_ROLES.has(role)) {
    return { allowed: false, reason: "The active role has no permitted evidence collection." };
  }
  if (DISALLOWED_SUBJECT.test(question) || INJECTION_PATTERN.test(question)) {
    return { allowed: false, reason: "No permitted evidence supports this answer." };
  }
  return { allowed: true, reason: "" };
}
