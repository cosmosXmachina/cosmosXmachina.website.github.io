export const aiTasks = Object.freeze({
  document_classify: {
    id: "document.classification.v1",
    description: "Classify an operational message and extract typed order fields.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["category", "priority", "fields", "checks"],
      properties: {
        category: { type: "string" },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        fields: {
          type: "object",
          additionalProperties: false,
          required: ["orderReference", "requestedDate", "total", "currency"],
          properties: {
            orderReference: { type: "string" },
            requestedDate: { type: "string" },
            total: { type: "number" },
            currency: { type: "string" }
          }
        },
        checks: { type: "array", items: { type: "string" } }
      }
    }
  },
  operations_risk_brief: {
    id: "operations.risk-brief.v1",
    description: "Summarize operational risk from the supplied order facts without changing state.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "riskLevel", "reasons", "nextActions"],
      properties: {
        headline: { type: "string" },
        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
        reasons: { type: "array", items: { type: "string" } },
        nextActions: { type: "array", items: { type: "string" } }
      }
    }
  },
  knowledge_search: {
    id: "knowledge.answer.v1",
    description: "Compose a bounded answer using only the supplied permitted evidence.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["answer", "confidence", "citations", "abstained", "reason"],
      properties: {
        answer: { type: ["string", "null"] },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        citations: { type: "array", items: { type: "string" } },
        abstained: { type: "boolean" },
        reason: { type: ["string", "null"] }
      }
    }
  },
  knowledge_evaluate: {
    id: "knowledge.evaluation.v1",
    description: "Evaluate citation support and policy compliance for a proposed answer.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["supported", "citationCoverage", "policyPassed", "findings"],
      properties: {
        supported: { type: "boolean" },
        citationCoverage: { type: "number", minimum: 0, maximum: 1 },
        policyPassed: { type: "boolean" },
        findings: { type: "array", items: { type: "string" } }
      }
    }
  },
  kpi_narrative: {
    id: "reporting.narrative.v1",
    description: "Explain supplied KPI facts and propose bounded follow-up actions.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "signals", "actions", "limitations"],
      properties: {
        summary: { type: "string" },
        signals: { type: "array", items: { type: "string" } },
        actions: { type: "array", items: { type: "string" } },
        limitations: { type: "array", items: { type: "string" } }
      }
    }
  }
});

export function taskDefinition(task) {
  const definition = aiTasks[task];
  if (!definition) throw new Error("Unsupported AI task: " + task);
  return definition;
}
