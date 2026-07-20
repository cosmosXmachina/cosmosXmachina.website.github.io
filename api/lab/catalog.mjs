export const actionCatalog = {
  "document-operations": ["classify", "approve", "reject", "reopen"],
  "operations-hub": ["advance", "assign", "flag", "brief"],
  "knowledge-assistant": ["search", "evaluate", "feedback"],
  "kpi-studio": ["calculate", "compare", "brief"]
};

export const aiActionTasks = new Map([
  ["document-operations:classify", "document_classify"],
  ["operations-hub:brief", "operations_risk_brief"],
  ["knowledge-assistant:search", "knowledge_search"],
  ["knowledge-assistant:evaluate", "knowledge_evaluate"],
  ["kpi-studio:brief", "kpi_narrative"]
]);

export const pythonDemos = new Set([
  "document-operations",
  "knowledge-assistant"
]);

export function validateAction(demo, action) {
  return Boolean(actionCatalog[demo] && actionCatalog[demo].includes(action));
}
