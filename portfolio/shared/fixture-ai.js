const DOCUMENTS = {
  "M-204": ["NW-8841", "2026-08-03", 4820, "high"],
  "M-205": ["AP-7712", "2026-08-12", 2430, "normal"],
  "M-206": ["AS-1907", "2026-08-06", 7350, "high"],
  "M-207": ["LC-5520", "2026-08-18", 1920, "normal"],
  "M-208": ["DA-4402", "", 5260, "high"],
  "M-209": ["VM-0088", "2026-08-25", 980, "normal"]
};

function documentFixture(input) {
  const italian = input.language === "it";
  const [orderReference, requestedDate, total, priority] = DOCUMENTS[input.messageId] || DOCUMENTS["M-204"];
  return {
    output: {
      category: "purchase_order", priority,
      fields: { orderReference, requestedDate, total, currency: "EUR" },
      checks: italian
        ? ["Riferimento ordine verificato", "Totale e valuta presenti", requestedDate ? "Data di consegna normalizzata" : "La data di consegna richiede una correzione umana"]
        : ["Order reference matched", "Total and currency present", requestedDate ? "Delivery date normalized" : "Delivery date requires human correction"]
    },
    evidence: [
      { source: "email", excerpt: italian ? `L'ordine ${orderReference} ha un totale di EUR ${total}.` : `Order ${orderReference} totals EUR ${total}.` },
      { source: "attachment", excerpt: requestedDate ? (italian ? `Data di consegna normalizzata: ${requestedDate}` : `Delivery date normalized: ${requestedDate}`) : (italian ? "La data non valida richiede una verifica" : "Invalid delivery date requires review") }
    ]
  };
}

function operationsBrief(input) {
  const italian = input.language === "it";
  const valueRisk = Number(input.order?.value) >= 7000;
  const stockRisk = input.inventory?.some((item) => item.onHand - item.reserved < item.reorder);
  return {
    output: italian ? {
      headline: "La promessa di consegna e esposta a un vincolo sulle scorte delle unita di controllo.", riskLevel: valueRisk || stockRisk ? "high" : "normal",
      reasons: [valueRisk ? "Il valore dell'ordine supera EUR 7.000" : "Il valore resta nella soglia operativa", stockRisk ? "Le scorte delle unita di controllo sono sotto la soglia di riordino" : "Le scorte non mostrano vincoli critici"],
      nextActions: ["Confermare le scorte riservate", "Chiedere a Sales di verificare la data promessa"]
    } : {
      headline: "Delivery promise is exposed to a control-unit stock constraint.", riskLevel: valueRisk || stockRisk ? "high" : "normal",
      reasons: [valueRisk ? "Order value exceeds EUR 7,000" : "Order value remains within the operating threshold", stockRisk ? "Control-unit stock is below the replenishment guardrail" : "Stock has no critical constraint"],
      nextActions: ["Confirm reserved stock", "Ask Sales to review the promised date"]
    }, evidence: []
  };
}

function evaluateFixture(input) {
  const italian = input.language === "it";
  const supported = Boolean(input.answer && input.citations?.length);
  return { output: {
    supported, citationCoverage: supported ? 1 : 0, policyPassed: supported,
    findings: supported
      ? (italian ? ["Ogni affermazione sostanziale e collegata a evidenze consentite", "Nessuna raccolta riservata e stata consultata"] : ["Every material claim maps to permitted evidence", "No restricted collection was accessed"])
      : [italian ? "La risposta non dispone di citazioni consentite sufficienti" : "The answer does not have sufficient permitted citations"]
  }, evidence: [] };
}

function kpiFixture(input) {
  const italian = input.language === "it";
  const metrics = input.metrics || {};
  const margin = Number(metrics.margin || 0).toFixed(1);
  const revenue = Number(metrics.revenue || 0);
  return { output: italian ? {
    summary: "I ricavi crescono mentre il margine resta sopra la soglia operativa.",
    signals: [`Il periodo selezionato registra EUR ${revenue}k di ricavi`, `Il margine lordo e ${margin}% rispetto alla soglia del 36%`],
    actions: ["Verificare le scorte delle unita di controllo prima del prossimo periodo", "Controllare ogni settimana i tempi di consegna export"],
    limitations: [`Campione sintetico di ${input.months} mesi`, "Nessuna correzione per la stagionalita"]
  } : {
    summary: "Revenue is rising while margin remains above the operating guardrail.",
    signals: [`The selected period records EUR ${revenue}k in revenue`, `Gross margin is ${margin}% against the 36% guardrail`],
    actions: ["Review control-unit stock before the next period", "Validate export lead times weekly"],
    limitations: [`Synthetic ${input.months}-month sample`, "No seasonality adjustment"]
  }, evidence: [] };
}

function responseFor(task, input, context) {
  if (context?.preparedOutput) return { output: context.preparedOutput, evidence: context.evidence || [] };
  if (task === "document_classify") return documentFixture(input);
  if (task === "operations_risk_brief") return operationsBrief(input);
  if (task === "knowledge_evaluate") return evaluateFixture(input);
  if (task === "kpi_narrative") return kpiFixture(input);
  return { output: { status: "completed", acceptedInputKeys: Object.keys(input || {}).sort() }, evidence: [] };
}

export class FixtureAIProvider {
  constructor(version = "fixtures-2026.2-browser") {
    this.version = version;
  }

  async execute({ task, schema, context, input, targetProvider = "openai" }) {
    const fixture = responseFor(task, input, context);
    const output = structuredClone(fixture.output);
    return {
      output,
      evidence: structuredClone(fixture.evidence),
      usage: { inputUnits: JSON.stringify({ schema, context, input }).length, outputUnits: JSON.stringify(output).length, estimatedCost: 0 },
      trace: { provider: "fixture", execution: "browser", targetProvider, version: this.version, task, schemaId: schema?.id || null, retrieval: context?.retrieval || null, deterministic: true },
      warnings: [input?.language === "it" ? `Dimostrazione sintetica: ${targetProvider} e simulato e nessun provider AI esterno e stato contattato.` : `Synthetic demonstration: ${targetProvider} is simulated and no external AI provider was called.`]
    };
  }
}
