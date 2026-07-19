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
    rank: 6,
    slug: "kpi-studio",
    title: { it: "Studio KPI e reporting", en: "KPI & Reporting Studio" },
    summary: {
      it: "Analisi riproducibili, filtri e formule leggibili per decisioni operative.",
      en: "Reproducible analysis, filters and readable formulas for operational decisions."
    },
    service: { it: "Data products", en: "Data products" },
    tone: "sky"
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
