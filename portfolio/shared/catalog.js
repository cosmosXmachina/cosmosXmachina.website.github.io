export const demos = [
  {
    rank: 1,
    slug: "document-operations",
    title: { it: "Operazioni documentali ed email", en: "AI Document & Email Operations" },
    summary: {
      it: "Classificazione, estrazione e approvazione di richieste operative con prove ispezionabili.",
      en: "Classify, extract and approve operational requests with inspectable evidence."
    },
    service: { it: "Automazione AI", en: "AI automation" },
    tone: "ivory",
    featured: true
  },
  {
    rank: 2,
    slug: "operations-hub",
    title: { it: "Orion Operations Hub", en: "Orion Operations Hub" },
    summary: {
      it: "Ordini, attivita e passaggi di stato in uno spazio operativo per PMI.",
      en: "Orders, tasks and controlled state transitions in an SME operations workspace."
    },
    service: { it: "Prodotti full-stack", en: "Full-stack products" },
    tone: "mint",
    featured: true
  },
  {
    rank: 3,
    slug: "knowledge-assistant",
    title: { it: "Assistente di conoscenza sicuro", en: "Secure Knowledge Assistant" },
    summary: {
      it: "Ricerca deterministica con permessi, citazioni e astensione verificabile.",
      en: "Deterministic retrieval with permissions, citations and verifiable abstention."
    },
    service: { it: "Architettura AI", en: "AI architecture" },
    tone: "paper",
    featured: true
  },
  {
    rank: 4,
    slug: "catalog-intelligence",
    title: { it: "Intelligenza per cataloghi e-commerce", en: "E-commerce Catalog Intelligence" },
    summary: {
      it: "Normalizzazione e arricchimento controllato di schede prodotto multicanale.",
      en: "Controlled normalization and enrichment of multichannel product records."
    },
    service: { it: "Sistemi e-commerce", en: "E-commerce systems" },
    tone: "coral",
    featured: true
  },
  {
    rank: 5,
    slug: "lead-appointment",
    title: { it: "Dal contatto all'appuntamento", en: "Lead-to-Appointment System" },
    summary: {
      it: "Esperienza hospitality e console staff collegate da un flusso prenotazioni.",
      en: "A hospitality experience and staff console joined by a booking workflow."
    },
    service: { it: "Esperienze web", en: "Web experiences" },
    tone: "vine"
  },
  {
    rank: 6,
    slug: "kpi-studio",
    title: { it: "Studio KPI e reporting", en: "KPI & Reporting Studio" },
    summary: {
      it: "Analisi riproducibili, filtri e formule leggibili per decisioni operative.",
      en: "Reproducible analysis, filters and readable formulas for operational decisions."
    },
    service: { it: "Data products", en: "Data products" },
    tone: "sky"
  },
  {
    rank: 7,
    slug: "integration-control",
    title: { it: "Control room delle integrazioni", en: "Integration Reliability Control Room" },
    summary: {
      it: "Idempotenza, retry, dead letter e replay resi visibili e testabili.",
      en: "Idempotency, retries, dead letters and replay made visible and testable."
    },
    service: { it: "Backend affidabili", en: "Reliable backends" },
    tone: "night"
  },
  {
    rank: 8,
    slug: "architecture-rescue",
    title: { it: "Laboratorio di recupero architetturale", en: "Architecture Rescue Lab" },
    summary: {
      it: "Refactoring guidato da ADR, test eseguibili e confronti prima/dopo.",
      en: "ADR-led refactoring with executable tests and before/after comparisons."
    },
    service: { it: "Modernizzazione", en: "Modernization" },
    tone: "code"
  },
  {
    rank: 9,
    slug: "workflow-audit",
    title: { it: "Audit dei workflow e ROI", en: "Workflow Audit & ROI Architect" },
    summary: {
      it: "Mappa il processo e rende trasparenti ipotesi, costi e priorita.",
      en: "Maps the process and makes assumptions, costs and priorities transparent."
    },
    service: { it: "Consulenza operativa", en: "Operational consulting" },
    tone: "linen"
  },
  {
    rank: 10,
    slug: "opportunity-scout",
    title: { it: "Browser Opportunity Scout", en: "Browser Opportunity Scout" },
    summary: {
      it: "Analisi spiegabile di opportunit? e preparazione controllata di proposte.",
      en: "Explainable opportunity analysis and controlled proposal preparation."
    },
    service: { it: "Product engineering", en: "Product engineering" },
    tone: "chrome"
  }
];

export const orion = {
  company: {
    name: "Orion Works S.r.l.",
    location: "Treviso, Veneto",
    employees: 48,
    sector: "Industrial sensing and field equipment"
  },
  customers: [
    { id: "CL-104", name: "Nordline Impianti", tier: "Gold" },
    { id: "CL-118", name: "Alpina Processi", tier: "Standard" },
    { id: "CL-127", name: "Adria Systems", tier: "Gold" }
  ],
  products: [
    { sku: "OR-S7", name: "Orion S7 Field Sensor", price: 189, stock: 64 },
    { sku: "OR-C4", name: "Orion C4 Control Unit", price: 740, stock: 18 },
    { sku: "OR-T2", name: "Orion T2 Service Kit", price: 96, stock: 112 }
  ],
  orders: [
    { id: "OW-2418", customer: "Nordline Impianti", value: 4820, status: "review" },
    { id: "OW-2419", customer: "Adria Systems", value: 1690, status: "packing" },
    { id: "OW-2420", customer: "Alpina Processi", value: 7350, status: "blocked" }
  ]
};
