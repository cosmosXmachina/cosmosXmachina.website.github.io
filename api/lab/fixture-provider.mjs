const fixtures = {
  document_classify: {
    category: "purchase_order",
    priority: "high",
    fields: {
      orderReference: "NW-8841",
      requestedDate: "2026-08-03",
      total: 4820,
      currency: "EUR"
    }
  },
  knowledge_search: {
    answer: "Gold customers may request an expedited replacement after serial-number validation.",
    confidence: 0.91,
    citations: ["Service policy v3.2, section 4.1", "Support handbook, identity validation"]
  }
};

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

  async execute({ task, schema, context, input }) {
    const output = structuredClone(fixtures[task] || {
      status: "completed",
      acceptedInputKeys: Object.keys(input || {}).sort()
    });

    return {
      output,
      evidence: evidenceFor(task),
      usage: {
        inputUnits: JSON.stringify(input || {}).length,
        outputUnits: JSON.stringify(output).length,
        estimatedCost: 0
      },
      trace: {
        provider: "fixture",
        providerVersion: this.version,
        task,
        schemaId: schema && schema.id ? schema.id : null,
        contextId: context && context.demo ? context.demo : null,
        deterministic: true
      },
      warnings: ["Synthetic demonstration: no external AI provider was called."]
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
