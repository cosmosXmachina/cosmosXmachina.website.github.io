import { evaluateKnowledgeRequest } from "./knowledge-policy.js";

export { evaluateKnowledgeRequest };
const STOP = new Set("a an and are can come cosa do durante e for gli i il in is la le of o per prima quali the to un una va what when which with".split(" "));

export const KNOWLEDGE_DOCUMENTS = [
  ["Service policy v3.2", "4.1 Expedited replacement", ["support", "sales"], "Gold customers may request an expedited replacement after customer identity, serial-number and warranty validation.", "I clienti Gold possono richiedere una sostituzione accelerata dopo la verifica di identita, numero di serie e garanzia.", "gold customer replacement sostituzione cliente oro guasto sensor sensore production produzione"],
  ["Support handbook", "Identity and serial validation", ["support"], "Support validates identity, product serial number, warranty state and failure symptoms before authorizing replacement.", "Il supporto verifica identita, numero di serie, garanzia e sintomi prima di autorizzare la sostituzione.", "identity serial warranty symptoms verifica identita serie garanzia sintomi"],
  ["Commercial handbook", "Gold service coverage", ["sales"], "Sales explains Gold coverage and transfers technical replacement decisions to a support specialist.", "Le vendite illustrano la copertura Gold e affidano le decisioni tecniche di sostituzione al supporto.", "gold coverage sales vendite copertura support replacement sostituzione"],
  ["Product manuals", "Dispatch preflight", ["support", "sales"], "Before dispatch, verify model, serial number, firmware compatibility, accessories and the destination record.", "Prima della spedizione, verificare modello, seriale, compatibilita firmware, accessori e destinazione.", "dispatch checks spedizione controlli model serial firmware accessories accessori destination"],
  ["Support handbook", "Sensor escalation", ["support"], "Escalate a sensor failure when diagnostics repeat after restart, production is stopped, or a safety signal is present.", "Escalare un guasto al sensore quando la diagnostica si ripete dopo il riavvio, la produzione e ferma o compare un segnale di sicurezza.", "sensor failure escalation escalate guasto sensore escalato diagnostica restart riavvio safety sicurezza production"],
  ["Product manuals", "S7 diagnostic sequence", ["support"], "Capture the S7 status code, isolate power, inspect the connector and repeat the diagnostic once before escalation.", "Registrare il codice S7, isolare l'alimentazione, controllare il connettore e ripetere una volta la diagnostica prima dell'escalation.", "s7 diagnostic sensor failure status code connector diagnostica sensore guasto connettore"],
  ["Commercial handbook", "Dispatch commitments", ["sales"], "Promised dates must be checked against available stock and confirmed warehouse capacity.", "Le date promesse devono essere verificate rispetto alle scorte disponibili e alla capacita confermata del magazzino.", "dispatch promised date stock warehouse spedizione data promessa scorte magazzino"],
  ["Public product manuals", "Safe installation", ["guest"], "Public installation guidance covers mounting, power isolation and environmental limits; account procedures are excluded.", "La guida pubblica copre montaggio, isolamento elettrico e limiti ambientali; le procedure cliente sono escluse.", "public installation mounting power safety installazione montaggio alimentazione sicurezza"],
  ["Public product manuals", "Public diagnostics", ["guest"], "External users may inspect public status-code definitions and contact authorized support for account-specific service.", "Gli utenti esterni possono consultare i codici di stato pubblici e rivolgersi al supporto per servizi legati all'account.", "public diagnostics status code support diagnostica codici stato"],
  ["Quality procedure", "Returned sensor inspection", ["support"], "Returned sensors are quarantined, photographed and matched to the approved replacement record before inspection.", "I sensori restituiti vengono isolati, fotografati e associati alla sostituzione approvata prima dell'ispezione.", "returned sensor inspection replacement reso sensore ispezione sostituzione"],
  ["People operations", "Compensation", ["hr"], "Employee compensation records are confidential.", "I dati retributivi dei dipendenti sono riservati.", "salary salaries compensation stipendio stipendi retribuzione"],
  ["Infrastructure runbook", "Credentials", ["admin"], "Production credentials and private keys are restricted.", "Le credenziali di produzione e le chiavi private sono riservate.", "password credentials private key credenziali chiave privata"]
].map(([source, section, roles, en, it, keywords], id) => ({ id, source, section, roles, en, it, keywords }));

const tokens = (value) => [...new Set((String(value).toLowerCase().match(/[a-z0-9\u00c0-\u017f]+/g) || []).filter((token) => token.length > 2 && !STOP.has(token)))];
const INDEX = KNOWLEDGE_DOCUMENTS.map((document) => ({ document, terms: new Set(tokens(`${document.source} ${document.section} ${document.en} ${document.it} ${document.keywords}`)) }));

export function abstention(reason) {
  return { answer: null, confidence: 0, citations: [], abstained: true, reason };
}

export function searchKnowledge(question, role, language = "en", limit = 2) {
  const query = tokens(question);
  if (!query.length) return [];
  return INDEX
    .filter(({ document }) => document.roles.includes(role))
    .map(({ document, terms }) => ({ document, score: query.reduce((sum, term) => sum + (terms.has(term) ? 1 : 0), 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.document.id - b.document.id)
    .slice(0, Math.max(1, Math.min(5, limit)))
    .map(({ document, score }) => ({ source: document.source, section: document.section, excerpt: language === "it" ? document.it : document.en, answer: language === "it" ? document.it : document.en, score }));
}

export const knowledgeInternals = { tokens };
