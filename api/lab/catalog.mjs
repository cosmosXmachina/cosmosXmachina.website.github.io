export const actionCatalog = {
  "document-operations": ["classify", "approve", "reject"],
  "operations-hub": ["advance", "assign", "flag"],
  "knowledge-assistant": ["search", "evaluate"],
  "catalog-intelligence": ["enrich", "approve", "rollback"],
  "lead-appointment": ["availability", "book", "confirm"],
  "kpi-studio": ["calculate", "compare"],
  "integration-control": ["process", "retry", "replay"],
  "architecture-rescue": ["inspect", "verify"],
  "workflow-audit": ["calculate", "prioritize"],
  "opportunity-scout": ["analyze", "draft"]
};

export const pythonDemos = new Set([
  "document-operations",
  "knowledge-assistant",
  "catalog-intelligence"
]);

export function validateAction(demo, action) {
  return Boolean(actionCatalog[demo] && actionCatalog[demo].includes(action));
}
