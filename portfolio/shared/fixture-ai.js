const responses = {
  document_classify: {
    output: {
      category: "purchase_order",
      priority: "high",
      fields: {
        orderReference: "NW-8841",
        requestedDate: "2026-08-03",
        total: 4820,
        currency: "EUR"
      }
    },
    evidence: [
      { source: "email", excerpt: "Please confirm order NW-8841 for EUR 4,820." },
      { source: "attachment", excerpt: "Requested delivery: 03/08/2026" }
    ]
  },
  knowledge_search: {
    output: {
      answer: "Gold customers may request an expedited replacement after serial-number validation.",
      confidence: 0.91
    },
    evidence: [
      { source: "Service policy v3.2", section: "4.1 Expedited replacement" },
      { source: "Support handbook", section: "Identity and serial validation" }
    ]
  }
};

function stableUsage(input) {
  return {
    inputUnits: JSON.stringify(input || {}).length,
    outputUnits: 0,
    estimatedCost: 0
  };
}

export class FixtureAIProvider {
  constructor(version = "fixtures-2026.1") {
    this.version = version;
  }

  async execute({ task, schema, context, input }) {
    const fixture = responses[task] || {
      output: { status: "completed", echo: input },
      evidence: []
    };

    const output = structuredClone(fixture.output);
    const usage = stableUsage({ schema, context, input });
    usage.outputUnits = JSON.stringify(output).length;

    return {
      output,
      evidence: structuredClone(fixture.evidence),
      usage,
      trace: {
        provider: "fixture",
        version: this.version,
        task,
        deterministic: true
      },
      warnings: ["Synthetic demonstration: no external AI provider was called."]
    };
  }
}
