const fixtures = {
  document_classify: {
    category: "purchase_order",
    priority: "high",
    fields: {
      orderReference: "NW-8841",
      requestedDate: "2026-08-03",
      total: 4820,
      currency: "EUR"
    },
    checks: ["Order reference matched", "Total and currency present", "Delivery date normalized"]
  },
  operations_risk_brief: {
    headline: "Delivery promise is exposed to a control-unit stock constraint.",
    riskLevel: "high",
    reasons: ["Order value exceeds EUR 7,000", "Control-unit stock is below the replenishment guardrail"],
    nextActions: ["Confirm reserved stock", "Ask Sales to review the promised date"]
  },
  knowledge_search: {
    answer: "Gold customers may request an expedited replacement after serial-number validation.",
    confidence: 0.91,
    citations: ["Service policy v3.2, section 4.1", "Support handbook, identity validation"],
    abstained: false,
    reason: null
  },
  knowledge_evaluate: {
    supported: true,
    citationCoverage: 1,
    policyPassed: true,
    findings: ["Every material claim maps to permitted evidence", "No restricted collection was accessed"]
  },
  kpi_narrative: {
    summary: "Revenue is rising while margin remains above the operating guardrail.",
    signals: ["Export revenue added EUR 8k since March", "Gross margin is 2.4 points above guardrail"],
    actions: ["Review control-unit stock before September", "Validate export lead times weekly"],
    limitations: ["Synthetic six-month sample", "No seasonality adjustment"]
  }
};

const documentFixtures = {
  "M-205": ["AP-7712", "2026-08-12", 2430, "normal"],
  "M-206": ["AS-1907", "2026-08-06", 7350, "high"],
  "M-207": ["LC-5520", "2026-08-18", 1920, "normal"],
  "M-208": ["DA-4402", "", 5260, "high"],
  "M-209": ["VM-0088", "2026-08-25", 980, "normal"]
};

function outputFor(task, input) {
  if (task !== "document_classify" || !documentFixtures[input?.messageId]) return fixtures[task];
  const [orderReference, requestedDate, total, priority] = documentFixtures[input.messageId];
  return {
    category: "purchase_order",
    priority,
    fields: { orderReference, requestedDate, total, currency: "EUR" },
    checks: requestedDate
      ? ["Order reference matched", "Total and currency present", "Delivery date normalized"]
      : ["Order reference matched", "Total and currency present", "Delivery date requires human correction"]
  };
}

function normalizeTask(demo, action) {
  const aliases = {
    "document-operations:classify": "document_classify",
    "knowledge-assistant:search": "knowledge_search"
  };
  return aliases[demo + ":" + action] || demo.replaceAll("-", "_") + "_" + action;
}

export class FixtureAIProvider {
  constructor(version = "fixtures-2026.1") {
    this.version = version;
  }

  async execute({ task, schema, schemaId, context, input, targetProvider = "openai" }) {
    const output = structuredClone(context?.preparedOutput || outputFor(task, input) || {
      status: "completed",
      acceptedInputKeys: Object.keys(input || {}).sort()
    });

    return {
      output,
      evidence: structuredClone(context?.evidence || evidenceFor(task)),
      usage: {
        inputUnits: JSON.stringify(input || {}).length,
        outputUnits: JSON.stringify(output).length,
        estimatedCost: 0
      },
      trace: {
        provider: "fixture",
        targetProvider,
        providerVersion: this.version,
        task,
        schemaId: schemaId || (schema && schema.id ? schema.id : null),
        contextId: context && context.demo ? context.demo : null,
        deterministic: true
      },
      warnings: ["Synthetic demonstration: " + targetProvider + " is simulated and no external AI provider was called."]
    };
  }

  async executeDemo(demo, action, input) {
    return this.execute({
      task: normalizeTask(demo, action),
      schema: { id: demo + "." + action, type: "object" },
      context: { demo, action },
      input
    });
  }
}

function evidenceFor(task) {
  const evidence = {
    document_classify: [
      { source: "email", excerpt: "Please confirm order NW-8841 for EUR 4,820." },
      { source: "attachment", excerpt: "Requested delivery: 03/08/2026" }
    ],
    knowledge_search: [
      { source: "Service policy v3.2", section: "4.1" },
      { source: "Support handbook", section: "Identity validation" }
    ]
  };
  return structuredClone(evidence[task] || []);
}
