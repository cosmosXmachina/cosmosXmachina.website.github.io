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
  },
  operations_risk_brief: {
    output: {
      headline: "Delivery promise is exposed to a control-unit stock constraint.", riskLevel: "high",
      reasons: ["Order value exceeds EUR 7,000", "Control-unit stock is below the replenishment guardrail"],
      nextActions: ["Confirm reserved stock", "Ask Sales to review the promised date"]
    }, evidence: []
  },
  knowledge_evaluate: {
    output: { supported: true, citationCoverage: 1, policyPassed: true, findings: ["Every material claim maps to permitted evidence", "No restricted collection was accessed"] }, evidence: []
  },
  kpi_narrative: {
    output: {
      summary: "Revenue is rising while margin remains above the operating guardrail.",
      signals: ["Export revenue added EUR 8k since March", "Gross margin is 2.4 points above guardrail"],
      actions: ["Review control-unit stock before September", "Validate export lead times weekly"],
      limitations: ["Synthetic six-month sample", "No seasonality adjustment"]
    }, evidence: []
  }
};

const italian = {
  knowledge_search: {
    answer: "I clienti Gold possono richiedere una sostituzione accelerata dopo la verifica del numero di serie.",
    citations: ["Policy assistenza v3.2, sezione 4.1", "Manuale supporto, verifica identita"]
  },
  operations_risk_brief: {
    headline: "La promessa di consegna e esposta a un vincolo sulle scorte delle unita di controllo.",
    reasons: ["Il valore dell'ordine supera EUR 7.000", "Le scorte delle unita di controllo sono sotto la soglia di riordino"],
    nextActions: ["Confermare le scorte riservate", "Chiedere a Sales di verificare la data promessa"]
  },
  knowledge_evaluate: { findings: ["Ogni affermazione sostanziale e collegata a evidenze consentite", "Nessuna raccolta riservata e stata consultata"] },
  kpi_narrative: {
    summary: "I ricavi crescono mentre il margine resta sopra la soglia operativa.",
    signals: ["I ricavi export sono cresciuti di EUR 8k da marzo", "Il margine lordo e 2,4 punti sopra la soglia"],
    actions: ["Verificare le scorte delle unita di controllo prima di settembre", "Controllare ogni settimana i tempi di consegna export"],
    limitations: ["Campione sintetico di sei mesi", "Nessuna correzione per la stagionalita"]
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
  if (task !== "document_classify") {
    const response = structuredClone(responses[task]);
    if (input?.language === "it" && italian[task]) Object.assign(response.output, italian[task]);
    return response;
  }
  if (!documentFixtures[input?.messageId]) return responses[task];
  const [orderReference, requestedDate, total, priority] = documentFixtures[input.messageId];
  return {
    output: {
      category: "purchase_order",
      priority,
      fields: { orderReference, requestedDate, total, currency: "EUR" },
      checks: input.language === "it"
        ? ["Riferimento ordine verificato", "Totale e valuta presenti", requestedDate ? "Data di consegna normalizzata" : "La data di consegna richiede una correzione umana"]
        : ["Order reference matched", "Total and currency present", requestedDate ? "Delivery date normalized" : "Delivery date requires human correction"]
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
      warnings: [input?.language === "it"
        ? "Dimostrazione sintetica: " + targetProvider + " e simulato e non e stato contattato alcun provider AI esterno."
        : "Synthetic demonstration: " + targetProvider + " is simulated and no external AI provider was called."]
    };
  }
}
