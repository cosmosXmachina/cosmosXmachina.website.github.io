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
      },
      checks: ["Order reference matched", "Total and currency present", "Delivery date normalized"]
    },
    evidence: [
      { source: "email", excerpt: "Please confirm order NW-8841 for EUR 4,820." },
      { source: "attachment", excerpt: "Requested delivery: 03/08/2026" }
    ]
  },
  knowledge_search: {
    output: {
      answer: "Gold customers may request an expedited replacement after serial-number validation.",
      confidence: 0.91,
      citations: ["Service policy v3.2, section 4.1", "Support handbook, identity validation"],
      abstained: false,
      reason: null
    },
    evidence: [
      { source: "Service policy v3.2", section: "4.1 Expedited replacement" },
      { source: "Support handbook", section: "Identity and serial validation" }
    ]
  }
};

const documentFixtures = {
  "M-205": ["AP-7712", "2026-08-12", 2430, "normal"],
  "M-206": ["AS-1907", "2026-08-06", 7350, "high"],
  "M-207": ["LC-5520", "2026-08-18", 1920, "normal"],
  "M-208": ["DA-4402", "", 5260, "high"],
  "M-209": ["VM-0088", "2026-08-25", 980, "normal"]
};

function responseFor(task, input) {
  if (task !== "document_classify" || !documentFixtures[input?.messageId]) return responses[task];
  const [orderReference, requestedDate, total, priority] = documentFixtures[input.messageId];
  return {
    output: {
      category: "purchase_order",
      priority,
      fields: { orderReference, requestedDate, total, currency: "EUR" },
      checks: requestedDate
        ? ["Order reference matched", "Total and currency present", "Delivery date normalized"]
        : ["Order reference matched", "Total and currency present", "Delivery date requires human correction"]
    },
    evidence: [
      { source: "email", excerpt: "Order " + orderReference + " totals EUR " + total + "." },
      { source: "attachment", excerpt: requestedDate ? "Delivery date normalized: " + requestedDate : "Invalid delivery date requires review" }
    ]
  };
}

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

  async execute({ task, schema, context, input, targetProvider = "openai" }) {
    const fixture = responseFor(task, input) || {
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
        targetProvider,
        version: this.version,
        task,
        deterministic: true
      },
      warnings: ["Synthetic demonstration: " + targetProvider + " is simulated and no external AI provider was called."]
    };
  }
}
