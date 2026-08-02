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

const italianFixtures = {
  operations_risk_brief: {
    headline: "La promessa di consegna e esposta a un vincolo sulle scorte delle unita di controllo.",
    riskLevel: "high",
    reasons: ["Il valore dell'ordine supera EUR 7.000", "Le scorte delle unita di controllo sono sotto la soglia di riordino"],
    nextActions: ["Confermare le scorte riservate", "Chiedere a Sales di verificare la data promessa"]
  },
  knowledge_search: {
    answer: "I clienti Gold possono richiedere una sostituzione accelerata dopo la verifica del numero di serie.",
    confidence: 0.91,
    citations: ["Policy assistenza v3.2, sezione 4.1", "Manuale supporto, verifica identita"],
    abstained: false,
    reason: null
  },
  knowledge_evaluate: {
    supported: true,
    citationCoverage: 1,
    policyPassed: true,
    findings: ["Ogni affermazione sostanziale e collegata a evidenze consentite", "Nessuna raccolta riservata e stata consultata"]
  },
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

function outputFor(task, input) {
  const italian = input?.language === "it";
  if (task === "knowledge_evaluate") {
    const citations = Array.isArray(input?.citations) ? input.citations.filter(Boolean) : [];
    const supported = Boolean(input?.answer && citations.length);
    return {
      supported,
      citationCoverage: supported ? 1 : 0,
      policyPassed: supported,
      findings: supported
        ? (italian ? italianFixtures.knowledge_evaluate.findings : fixtures.knowledge_evaluate.findings)
        : [italian ? "La risposta proposta non dispone di citazioni consentite sufficienti" : "The proposed answer does not have sufficient permitted citations"]
    };
  }
  if (task !== "document_classify" || !documentFixtures[input?.messageId]) return italian ? italianFixtures[task] || fixtures[task] : fixtures[task];
  const [orderReference, requestedDate, total, priority] = documentFixtures[input.messageId];
  return {
    category: "purchase_order",
    priority,
    fields: { orderReference, requestedDate, total, currency: "EUR" },
    checks: italian
      ? ["Riferimento ordine verificato", "Totale e valuta presenti", requestedDate ? "Data di consegna normalizzata" : "La data di consegna richiede una correzione umana"]
      : ["Order reference matched", "Total and currency present", requestedDate ? "Delivery date normalized" : "Delivery date requires human correction"]
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
      evidence: structuredClone(context?.evidence || evidenceFor(task, input?.language)),
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
      warnings: [input?.language === "it"
        ? "Dimostrazione sintetica: " + targetProvider + " e simulato e non e stato contattato alcun provider AI esterno."
        : "Synthetic demonstration: " + targetProvider + " is simulated and no external AI provider was called."]
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

function evidenceFor(task, language) {
  const italian = language === "it";
  const evidence = {
    document_classify: [
      { source: "email", excerpt: "Please confirm order NW-8841 for EUR 4,820." },
      { source: "attachment", excerpt: "Requested delivery: 03/08/2026" }
    ],
    knowledge_search: [
      { source: italian ? "Policy assistenza v3.2" : "Service policy v3.2", section: "4.1" },
      { source: italian ? "Manuale supporto" : "Support handbook", section: italian ? "Verifica identita" : "Identity validation" }
    ]
  };
  return structuredClone(evidence[task] || []);
}
