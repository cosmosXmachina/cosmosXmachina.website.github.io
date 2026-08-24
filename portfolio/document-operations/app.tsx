import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { getPreferredProvider, getProviders, resetSession, runAction, setPreferredProvider } from "../shared/api.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { errorText, getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
import "./style.css";

type Message = {
  id: string;
  sender: string;
  subject: string;
  time: string;
  date: string;
  priority: "high" | "normal";
  attachment: string;
  body: string;
};

type Provider = { id: string; label: string; model: string; selectable: boolean; simulated: boolean };
type Fields = { orderReference: string; requestedDate: string; total: number; currency: string };

const messages: Message[] = [
  { id: "M-204", sender: "Nordline Impianti", subject: "Ordine NW-8841 / consegna urgente", time: "09:42", date: "19 Jul", priority: "high", attachment: "NW-8841.pdf", body: "Please confirm order NW-8841 for EUR 4,820. Requested delivery: 03/08/2026. Attached reference: Orion S7 field sensor, quantity 20." },
  { id: "M-205", sender: "Alpina Processi", subject: "Ordine AP-7712 / conferma disponibilita", time: "10:17", date: "19 Jul", priority: "normal", attachment: "AP-7712.pdf", body: "Please register order AP-7712 for EUR 2,430. Requested delivery: 12/08/2026. Orion T2 service kit, quantity 25." },
  { id: "M-206", sender: "Adria Systems", subject: "Acquisto AS-1907 / linea sensori", time: "11:03", date: "19 Jul", priority: "high", attachment: "AS-1907.pdf", body: "Purchase reference AS-1907 totals EUR 7,350. Delivery requested by 06/08/2026. Please validate stock before confirmation." },
  { id: "M-207", sender: "Livenza Controls", subject: "Ordine LC-5520 / kit assistenza", time: "11:38", date: "19 Jul", priority: "normal", attachment: "LC-5520.pdf", body: "Order LC-5520 for EUR 1,920. Requested delivery: 18/08/2026. Standard service conditions apply." },
  { id: "M-208", sender: "Dolomiti Automation", subject: "PO DA-4402 / data da verificare", time: "12:06", date: "19 Jul", priority: "high", attachment: "DA-4402.pdf", body: "Purchase order DA-4402 totals EUR 5,260. The requested delivery date appears as 32/08/2026 and requires human validation." },
  { id: "M-209", sender: "Veneta Motion", subject: "Ordine VM-0088 / conferma standard", time: "12:41", date: "19 Jul", priority: "normal", attachment: "VM-0088.pdf", body: "Please confirm order VM-0088 for EUR 980. Requested delivery: 25/08/2026. Orion T2 service kits." }
];

const copy = {
  it: {
    title: "Document Operations", subtitle: "Posta in ingresso, dati estratti e decisioni umane nello stesso banco di lavoro.",
    inbox: "Coda documenti", inspect: "Documento e controlli", classify: "Classifica ed estrai", approve: "Approva", reject: "Rifiuta", reopen: "Riapri revisione",
    result: "Risultato proposto", evidence: "Evidenze", checks: "Controlli di validazione", activity: "Registro decisioni", contact: "Porta questo caso nel modulo contatti",
    all: "Tutti", priority: "Priorita alta", pending: "Da elaborare", noResults: "Nessun documento corrisponde ai filtri.", saveHint: "I campi restano modificabili finche un operatore non approva.",
    back: "Torna al Creation Lab", providerTarget: "Provider simulato", liveMode: "Modalita provider live", syntheticMode: "Simulazione provider sintetica", queueAria: "Riepilogo coda", searchQueue: "Cerca nella coda", searchPlaceholder: "ID, mittente, oggetto", filterAria: "Filtro coda", running: "Pipeline deterministica in esecuzione...", pipelineError: "Errore pipeline", retry: "Riprova", from: "Da", subjectLabel: "Oggetto", pdfMeta: "2 pagine / documento sintetico", humanGate: "Verifica umana", idleTitle: "Pronto per un replay deterministico", idleBody: "Seleziona un elemento e avvia la classificazione. Nulla viene salvato e nessuna azione a valle e automatica.", correctFields: "Correggi i campi evidenziati prima di approvare.", fieldError: "Riferimento, data ISO valida, totale positivo e valuta a tre lettere sono obbligatori.", sourceBound: "legato alla fonte", sessionOnly: "solo sessione", evidencePending: "Le evidenze appaiono dopo l'estrazione.", queueOpened: "Elemento della coda aperto", technicalTrace: "Traccia tecnica", next: "Continua", earlier: "prima", now: "ora", pass: "OK", statusIdle: "non elaborato", statusRunning: "in esecuzione", statusClassified: "classificato", statusApproved: "approvato", statusRejected: "rifiutato", statusError: "errore",
    stats: [["Ricevuti oggi", "6 in questa simulazione"], ["Da verificare", "passaggio umano"], ["Priorita alta", "rischio consegna o valore"], ["Gestione mediana", "minuti sintetici"]],
    fields: ["Categoria", "Priorita", "Riferimento ordine", "Data richiesta", "Totale", "Valuta"],
    sections: [["Problema", "Le richieste arrivano tra email e allegati, richiedono reinserimento manuale e nascondono le eccezioni."], ["Workflow", "Acquisizione controllata, classificazione, estrazione tipizzata, validazione e approvazione umana."], ["Architettura", "React e TypeScript con pipeline deterministica, validazione e stato eseguiti interamente nel browser."], ["Decisioni", "Schema e regole restano separati dal provider simulato. Nessun allegato arbitrario e nessuna azione automatica."], ["Failure modes", "Campi mancanti, date incoerenti, documenti ambigui e input non validi producono stati espliciti."], ["Test", "Contratti provider, replay, limiti richiesta, HTML ostile, transizioni e zero chiamate esterne."], ["Servizio rilevante", "Automazione AI e workflow documentali con supervisione."]]
  },
  en: {
    title: "Document Operations", subtitle: "Incoming mail, extracted data and human decisions in one workstation.",
    inbox: "Document queue", inspect: "Document and controls", classify: "Classify and extract", approve: "Approve", reject: "Reject", reopen: "Reopen review",
    result: "Proposed result", evidence: "Evidence", checks: "Validation checks", activity: "Decision log", contact: "Transfer this case to contact",
    all: "All", priority: "High priority", pending: "Unprocessed", noResults: "No documents match these filters.", saveHint: "Fields stay editable until a human approves the record.",
    back: "Back to Creation Lab", providerTarget: "Simulated provider", liveMode: "Live provider mode", syntheticMode: "Synthetic provider simulation", queueAria: "Queue summary", searchQueue: "Search queue", searchPlaceholder: "ID, sender, subject", filterAria: "Queue filter", running: "Running deterministic pipeline...", pipelineError: "Pipeline error", retry: "Retry", from: "From", subjectLabel: "Subject", pdfMeta: "2 pages / synthetic fixture", humanGate: "Human review gate", idleTitle: "Ready for deterministic replay", idleBody: "Select a queue item and run classification. Nothing is persisted and no downstream action is automatic.", correctFields: "Correct the highlighted fields before approval.", fieldError: "Reference, valid ISO date, positive total and three-letter currency are required.", sourceBound: "source-bound", sessionOnly: "session only", evidencePending: "Evidence appears after extraction.", queueOpened: "Queue item opened", technicalTrace: "Technical trace", next: "Next", earlier: "earlier", now: "now", pass: "PASS", statusIdle: "unprocessed", statusRunning: "running", statusClassified: "classified", statusApproved: "approved", statusRejected: "rejected", statusError: "error",
    stats: [["Received today", "6 in this fixture"], ["Needs review", "human checkpoint"], ["High priority", "delivery or value risk"], ["Median handling", "synthetic minutes"]],
    fields: ["Category", "Priority", "Order reference", "Requested date", "Total", "Currency"],
    sections: [["Problem", "Requests arrive across email and attachments, require manual re-entry and hide exceptions."], ["Workflow", "Controlled intake, classification, typed extraction, validation and human approval."], ["Architecture", "React and TypeScript with deterministic pipeline, validation and state running entirely in the browser."], ["Decisions", "Schemas and rules stay separate from the simulated provider. No arbitrary attachments and no automatic actions."], ["Failure modes", "Missing fields, invalid dates, ambiguous documents and invalid inputs produce explicit states."], ["Tests", "Provider contracts, replay, request limits, hostile HTML, transitions and zero external calls."], ["Relevant service", "Supervised AI automation and document workflows."]]
  }
};

function validateFields(fields: Fields | null) {
  if (!fields) return false;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(fields.requestedDate) && !Number.isNaN(Date.parse(fields.requestedDate + "T00:00:00Z"));
  return Boolean(fields.orderReference.trim() && date && fields.total > 0 && /^[A-Z]{3}$/.test(fields.currency));
}

function App() {
  const language = getLanguage();
  const text = copy[language];
  const [selectedId, setSelectedId] = useState(messages[0].id);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState(getPreferredProvider());
  const [providers, setProviders] = useState<Provider[]>([]);
  const [mode, setMode] = useState("fixture");
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [execution, setExecution] = useState<any>(null);
  const [fields, setFields] = useState<Fields | null>(null);
  const [activity, setActivity] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const actionController = useRef<AbortController | null>(null);
  setDocumentLanguage(language, {
    title: text.title + " | Creation Lab",
    description: text.subtitle,
    path: "/portfolio/document-operations/",
    image: "/assets/portfolio/document-operations.jpg",
    imageAlt: text.title + " / cosmosXmachina Creation Lab"
  });

  useEffect(() => {
    getProviders().then((catalog) => {
      setProviders(catalog.providers.filter((item: Provider) => item.selectable));
      setMode(catalog.mode);
    }).catch((failure) => setError(errorText(failure, language, text.pipelineError)));
  }, [text.pipelineError]);

  useEffect(() => () => actionController.current?.abort(), []);

  const visible = useMemo(() => messages.filter((message) => {
    const matchesFilter = filter === "all" || (filter === "priority" && message.priority === "high") || (filter === "pending" && !statuses[message.id]);
    const haystack = (message.id + " " + message.sender + " " + message.subject).toLowerCase();
    return matchesFilter && haystack.includes(query.trim().toLowerCase());
  }), [filter, query, statuses]);
  const selected = messages.find((message) => message.id === selectedId) || messages[0];
  const status = statuses[selected.id] || "idle";

  function chooseProvider(value: string) {
    setProvider(value);
    setPreferredProvider(value);
  }

  function beginAction() {
    actionController.current?.abort();
    const controller = new AbortController();
    actionController.current = controller;
    return controller;
  }

  function resetDemo() {
    actionController.current?.abort();
    actionController.current = null;
    resetSession();
    setSelectedId(messages[0].id);
    setFilter("all");
    setQuery("");
    setStatuses({});
    setExecution(null);
    setFields(null);
    setActivity({});
    setError("");
    setBusyAction("");
  }

  function chooseMessage(message: Message) {
    actionController.current?.abort();
    actionController.current = null;
    setStatuses((current) => current[selected.id] === "running" ? { ...current, [selected.id]: "idle" } : current);
    setSelectedId(message.id);
    setExecution(null);
    setFields(null);
    setError("");
  }

  function addActivity(messageId: string, label: string) {
    setActivity((current) => ({ ...current, [messageId]: [label, ...(current[messageId] || [])].slice(0, 6) }));
  }

  async function classify() {
    const controller = beginAction();
    const message = selected;
    setStatuses((current) => ({ ...current, [message.id]: "running" }));
    setError("");
    try {
      const payload = await runAction("document-operations", "classify", { messageId: message.id, body: message.body, language }, provider, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const result = payload.result.execution || payload.result;
      setExecution(result.output ? result : result.execution || result);
      setFields(result.output?.fields || null);
      setStatuses((current) => ({ ...current, [message.id]: "classified" }));
      addActivity(message.id, (language === "en" ? "Extracted with " : "Estratto con ") + provider + (language === "en" ? " (simulated)" : " (simulato)"));
    } catch (failure) {
      if (!controller.signal.aborted) {
        setStatuses((current) => ({ ...current, [message.id]: "error" }));
        setError(errorText(failure, language, text.pipelineError));
      }
    } finally {
      if (actionController.current === controller) actionController.current = null;
    }
  }

  async function decide(action: "approve" | "reject" | "reopen") {
    if (action === "approve" && !validateFields(fields)) {
      setError(text.correctFields);
      return;
    }
    const controller = beginAction();
    setBusyAction(action);
    setError("");
    try {
      await runAction("document-operations", action, { messageId: selected.id, fields, language }, provider, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const next = action === "reopen" ? "classified" : action === "approve" ? "approved" : "rejected";
      setStatuses((current) => ({ ...current, [selected.id]: next }));
      const actionLabel = language === "it" ? { approve: "approvato", reject: "rifiutato", reopen: "riaperto" }[action] : action;
      addActivity(selected.id, actionLabel + (language === "it" ? " / verifica umana" : " / human review"));
    } catch (failure) {
      if (!controller.signal.aborted) setError(errorText(failure, language, text.pipelineError));
    } finally {
      if (actionController.current === controller) {
        actionController.current = null;
        setBusyAction("");
      }
    }
  }

  const output = execution?.output;
  const decisionLocked = status === "approved" || status === "rejected";
  const fieldsValid = validateFields(fields);
  const rawChecks = output?.checks || ["Schema fields typed", "Source excerpts retained", "Human decision required"];
  const checkTranslations: Record<string, string> = {
    "Order reference matched": "Riferimento ordine verificato",
    "Total and currency present": "Totale e valuta presenti",
    "Delivery date normalized": "Data di consegna normalizzata",
    "Delivery date requires human correction": "La data di consegna richiede una correzione umana",
    "Schema fields typed": "Campi dello schema tipizzati",
    "Source excerpts retained": "Estratti delle fonti conservati",
    "Human decision required": "Decisione umana obbligatoria"
  };
  const checks = rawChecks.map((check: string) => language === "it" ? checkTranslations[check] || check : check);
  const statusLabel = { idle: text.statusIdle, running: text.statusRunning, classified: text.statusClassified, approved: text.statusApproved, rejected: text.statusRejected, error: text.statusError }[status] || status;

  return (
    <>
      <header className="topbar">
        <a href={withLanguage("/portfolio/", language)}>{text.back}</a>
        <strong>ORION / OPS-01</strong>
        <span className="mode">{modeLabel(language)}</span>
      </header>
      <main>
        <section className="hero">
          <div><p className="kicker">cosmosXmachina Creation Lab / 01</p><h1>{text.title}</h1><p>{text.subtitle}</p></div>
          <div className="run-config">
            <label>{text.providerTarget}<select value={provider} onChange={(event) => chooseProvider(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.label} / {item.model}</option>)}</select></label>
            <span>{mode === "live" ? text.liveMode : text.syntheticMode}</span>
            <button type="button" onClick={resetDemo}>{language === "it" ? "Ripristina demo" : "Reset demo"}</button>
          </div>
          <small>{disclosure(language)}</small>
        </section>

        <section className="queue-summary" aria-label={text.queueAria}>
          <article><span>{text.stats[0][0]}</span><strong>24</strong><small>{text.stats[0][1]}</small></article>
          <article><span>{text.stats[1][0]}</span><strong>{messages.filter((message) => !statuses[message.id] || statuses[message.id] === "classified").length}</strong><small>{text.stats[1][1]}</small></article>
          <article><span>{text.stats[2][0]}</span><strong>{messages.filter((message) => message.priority === "high").length}</strong><small>{text.stats[2][1]}</small></article>
          <article><span>{text.stats[3][0]}</span><strong>02:14</strong><small>{text.stats[3][1]}</small></article>
        </section>

        <section className="workstation" aria-label={text.title}>
          <aside className="inbox">
            <div className="panel-title"><h2>{text.inbox}</h2><span>{visible.length}</span></div>
            <label className="search"><span>{text.searchQueue}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchPlaceholder} /></label>
            <div className="segments" role="group" aria-label={text.filterAria}>
              {[["all", text.all], ["priority", text.priority], ["pending", text.pending]].map(([value, label]) => <button aria-pressed={filter === value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}
            </div>
            <div className="message-list">
              {!visible.length && <p className="empty-list">{text.noResults}</p>}
              {visible.map((message) => (
                <button key={message.id} aria-current={selected.id === message.id ? "true" : undefined} className={selected.id === message.id ? "selected" : ""} onClick={() => chooseMessage(message)}>
                  <span className={"priority-dot " + message.priority} aria-label={message.priority === "high" ? text.priority : text.statusIdle} />
                  <span className="sender">{message.sender}</span><time>{message.time}</time>
                  <strong>{message.subject}</strong>
                  <small>{message.attachment}</small><em>{statuses[message.id] ? ({ classified: text.statusClassified, approved: text.statusApproved, rejected: text.statusRejected, running: text.statusRunning, error: text.statusError }[statuses[message.id]] || statuses[message.id]) : text.statusIdle}</em>
                </button>
              ))}
            </div>
          </aside>

          <div className="document">
            <div className="document-head">
              <div><span>{selected.id} / {selected.date} / {selected.attachment}</span><h2>{text.inspect}</h2></div>
              <button className="primary" onClick={classify} disabled={status === "running"}>{status === "running" ? text.running : text.classify}</button>
            </div>
            {error && <div className="error" role="alert"><strong>{text.pipelineError}</strong><span>{error}</span><button onClick={classify}>{text.retry}</button></div>}
            <div className="review-grid">
              <article className="paper">
                <div className="mail-meta"><span>{text.from}</span><strong>{selected.sender}</strong><span>{text.subjectLabel}</span><strong>{selected.subject}</strong></div>
                <p>{selected.body}</p>
                <div className="attachment"><span>PDF</span><div><strong>{selected.attachment}</strong><small>{text.pdfMeta}</small></div></div>
              </article>
              <section className="result" aria-live="polite">
                <div className="result-head"><div><span>{text.humanGate}</span><h3>{text.result}</h3></div><em className={"state " + status}>{statusLabel}</em></div>
                {!output || !fields ? <div className="idle-state"><strong>{text.idleTitle}</strong><p>{text.idleBody}</p></div> : <>
                  <div className="field-grid">
                    <label>{text.fields[0]}<input value={output.category} readOnly /></label>
                    <label>{text.fields[1]}<input value={output.priority} readOnly /></label>
                    <label>{text.fields[2]}<input value={fields.orderReference} aria-invalid={!fields.orderReference.trim()} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, orderReference: event.target.value })} /></label>
                    <label>{text.fields[3]}<input type="date" value={fields.requestedDate} aria-invalid={!fieldsValid} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, requestedDate: event.target.value })} /></label>
                    <label>{text.fields[4]}<input type="number" min="0.01" value={fields.total} aria-invalid={fields.total <= 0} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, total: Number(event.target.value) })} /></label>
                    <label>{text.fields[5]}<input value={fields.currency} aria-invalid={!/^[A-Z]{3}$/.test(fields.currency)} maxLength={3} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, currency: event.target.value.toUpperCase() })} /></label>
                  </div>
                  {!fieldsValid && <p className="edit-hint" role="status">{text.fieldError}</p>}
                  <p className="edit-hint">{text.saveHint}</p>
                  <div className="actions">{decisionLocked ? <button onClick={() => decide("reopen")} disabled={Boolean(busyAction)}>{text.reopen}</button> : <><button onClick={() => decide("reject")} disabled={Boolean(busyAction)}>{text.reject}</button><button className="primary" onClick={() => decide("approve")} disabled={!fieldsValid || Boolean(busyAction)}>{text.approve}</button></>}</div>
                </>}
              </section>
            </div>

            <div className="inspection-panels">
              <section><div className="mini-head"><h3>{text.checks}</h3><span>{checks.length}/{checks.length}</span></div><ul className="checks">{checks.map((check: string) => <li key={check}><span>{text.pass}</span>{check}</li>)}</ul></section>
              <section><div className="mini-head"><h3>{text.evidence}</h3><span>{text.sourceBound}</span></div><ul className="evidence-list">{(execution?.evidence || []).map((item: any, index: number) => <li key={index}><strong>{item.source}</strong><q>{item.excerpt || item.section}</q></li>)}{!execution?.evidence?.length && <li>{text.evidencePending}</li>}</ul></section>
              <section><div className="mini-head"><h3>{text.activity}</h3><span>{text.sessionOnly}</span></div><ol className="timeline">{(activity[selected.id] || [text.queueOpened]).map((item, index) => <li key={index}><time>{index ? text.earlier : text.now}</time>{item}</li>)}</ol></section>
            </div>
            {execution && <details className="trace"><summary>{text.technicalTrace}</summary><pre>{JSON.stringify(execution.trace, null, 2)}</pre></details>}
          </div>
        </section>

        <section className="evidence-grid">{text.sections.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}</section>
        <button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} {text.next}</button>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
