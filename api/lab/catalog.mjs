export const actionCatalog = {
  "document-operations": ["classify", "approve", "reject"],
  "operations-hub": ["advance", "assign", "flag"],
  "knowledge-assistant": ["search", "evaluate"],
  "kpi-studio": ["calculate", "compare"]
};

export const pythonDemos = new Set([
  "document-operations",
  "knowledge-assistant"
]);

export function validateAction(demo, action) {
  return Boolean(actionCatalog[demo] && actionCatalog[demo].includes(action));
}
