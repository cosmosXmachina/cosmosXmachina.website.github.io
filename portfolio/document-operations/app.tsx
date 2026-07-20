import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getPreferredProvider, getProviders, runAction, setPreferredProvider } from "../shared/api.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
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
    sections: [["Problema", "Le richieste arrivano tra email e allegati, richiedono reinserimento manuale e nascondono le eccezioni."], ["Workflow", "Acquisizione controllata, classificazione, estrazione tipizzata, validazione e approvazione umana."], ["Architettura", "React e TypeScript nel client; gateway provider neutrale; pipeline FastAPI/Pydantic privata."], ["Decisioni", "Schema e regole restano fuori dal provider. Nessun allegato arbitrario e nessuna azione automatica."], ["Failure modes", "Campi mancanti, date incoerenti, documenti ambigui e servizi non disponibili producono stati espliciti."], ["Test", "Contratti provider, replay, limiti richiesta, HTML ostile, transizioni e zero chiamate esterne in fixture mode."], ["Servizio rilevante", "Automazione AI e workflow documentali con supervisione."]]
  },
  en: {
    title: "Document Operations", subtitle: "Incoming mail, extracted data and human decisions in one workstation.",
    inbox: "Document queue", inspect: "Document and controls", classify: "Classify and extract", approve: "Approve", reject: "Reject", reopen: "Reopen review",
    result: "Proposed result", evidence: "Evidence", checks: "Validation checks", activity: "Decision log", contact: "Transfer this case to contact",
    all: "All", priority: "High priority", pending: "Unprocessed", noResults: "No documents match these filters.", saveHint: "Fields stay editable until a human approves the record.",
    sections: [["Problem", "Requests arrive across email and attachments, require manual re-entry and hide exceptions."], ["Workflow", "Controlled intake, classification, typed extraction, validation and human approval."], ["Architecture", "React and TypeScript client; provider-neutral gateway; private FastAPI/Pydantic pipeline."], ["Decisions", "Schemas and rules stay outside the provider. No arbitrary attachments and no automatic actions."], ["Failure modes", "Missing fields, invalid dates, ambiguous documents and unavailable services produce explicit states."], ["Tests", "Provider contracts, replay, request limits, hostile HTML, transitions and zero external calls in fixture mode."], ["Relevant service", "Supervised AI automation and document workflows."]]
  }
};

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
  setDocumentLanguage(language, text.title + " | Creation Lab");

  useEffect(() => {
    getProviders().then((catalog) => {
      setProviders(catalog.providers.filter((item: Provider) => item.selectable));
      setMode(catalog.mode);
    });
  }, []);

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

  function chooseMessage(message: Message) {
    setSelectedId(message.id);
    setExecution(null);
    setFields(null);
    setError("");
  }

  function addActivity(messageId: string, label: string) {
    setActivity((current) => ({ ...current, [messageId]: [label, ...(current[messageId] || [])].slice(0, 6) }));
  }

  async function classify() {
    setStatuses((current) => ({ ...current, [selected.id]: "running" }));
    setError("");
    try {
      const payload = await runAction("document-operations", "classify", { messageId: selected.id, body: selected.body }, provider);
      const result = payload.result.execution || payload.result;
      setExecution(result.output ? result : result.execution || result);
      setFields(result.output?.fields || null);
      setStatuses((current) => ({ ...current, [selected.id]: "classified" }));
      addActivity(selected.id, (language === "en" ? "Extracted with " : "Estratto con ") + provider + " (simulated)");
    } catch (failure) {
      setStatuses((current) => ({ ...current, [selected.id]: "error" }));
      setError(failure instanceof Error ? failure.message : "Pipeline failed");
    }
  }

  async function decide(action: "approve" | "reject" | "reopen") {
    try {
      await runAction("document-operations", action, { messageId: selected.id, fields }, provider);
      const next = action === "reopen" ? "classified" : action === "approve" ? "approved" : "rejected";
      setStatuses((current) => ({ ...current, [selected.id]: next }));
      addActivity(selected.id, action + " / human review");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Decision failed");
    }
  }

  const output = execution?.output;
  const decisionLocked = status === "approved" || status === "rejected";
  const checks = output?.checks || ["Schema fields typed", "Source excerpts retained", "Human decision required"];

  return (
    <>
      <header className="topbar">
        <a href={withLanguage("/portfolio/", language)}>Back / Creation Lab</a>
        <strong>ORION / OPS-01</strong>
        <span className="mode">{modeLabel(language)}</span>
      </header>
      <main>
        <section className="hero">
          <div><p className="kicker">cosmosXmachina Creation Lab / 01</p><h1>{text.title}</h1><p>{text.subtitle}</p></div>
          <div className="run-config">
            <label>Provider target<select value={provider} onChange={(event) => chooseProvider(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.label} / {item.model}</option>)}</select></label>
            <span>{mode === "live" ? "Live provider mode" : "Synthetic provider simulation"}</span>
          </div>
          <small>{disclosure(language)}</small>
        </section>

        <section className="queue-summary" aria-label="Queue summary">
          <article><span>Received today</span><strong>24</strong><small>6 in this fixture</small></article>
          <article><span>Needs review</span><strong>{messages.filter((message) => !statuses[message.id] || statuses[message.id] === "classified").length}</strong><small>human checkpoint</small></article>
          <article><span>High priority</span><strong>{messages.filter((message) => message.priority === "high").length}</strong><small>delivery or value risk</small></article>
          <article><span>Median handling</span><strong>02:14</strong><small>synthetic minutes</small></article>
        </section>

        <section className="workstation" aria-label={text.title}>
          <aside className="inbox">
            <div className="panel-title"><h2>{text.inbox}</h2><span>{visible.length}</span></div>
            <label className="search"><span>Search queue</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, sender, subject" /></label>
            <div className="segments" role="group" aria-label="Queue filter">
              {[["all", text.all], ["priority", text.priority], ["pending", text.pending]].map(([value, label]) => <button className={filter === value ? "active" : ""} onClick={() => setFilter(value)} key={value}>{label}</button>)}
            </div>
            <div className="message-list">
              {!visible.length && <p className="empty-list">{text.noResults}</p>}
              {visible.map((message) => (
                <button key={message.id} className={selected.id === message.id ? "selected" : ""} onClick={() => chooseMessage(message)}>
                  <span className={"priority-dot " + message.priority} aria-label={message.priority + " priority"} />
                  <span className="sender">{message.sender}</span><time>{message.time}</time>
                  <strong>{message.subject}</strong>
                  <small>{message.attachment}</small><em>{statuses[message.id] || "unprocessed"}</em>
                </button>
              ))}
            </div>
          </aside>

          <div className="document">
            <div className="document-head">
              <div><span>{selected.id} / {selected.date} / {selected.attachment}</span><h2>{text.inspect}</h2></div>
              <button className="primary" onClick={classify} disabled={status === "running"}>{status === "running" ? "Running deterministic pipeline..." : text.classify}</button>
            </div>
            {error && <div className="error" role="alert"><strong>Pipeline error</strong><span>{error}</span><button onClick={classify}>Retry</button></div>}
            <div className="review-grid">
              <article className="paper">
                <div className="mail-meta"><span>From</span><strong>{selected.sender}</strong><span>Subject</span><strong>{selected.subject}</strong></div>
                <p>{selected.body}</p>
                <div className="attachment"><span>PDF</span><div><strong>{selected.attachment}</strong><small>2 pages / synthetic fixture</small></div></div>
              </article>
              <section className="result" aria-live="polite">
                <div className="result-head"><div><span>Human review gate</span><h3>{text.result}</h3></div><em className={"state " + status}>{status}</em></div>
                {!output || !fields ? <div className="idle-state"><strong>Ready for deterministic replay</strong><p>Select a queue item and run classification. Nothing is persisted and no downstream action is automatic.</p></div> : <>
                  <div className="field-grid">
                    <label>Category<input value={output.category} readOnly /></label>
                    <label>Priority<input value={output.priority} readOnly /></label>
                    <label>Order reference<input value={fields.orderReference} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, orderReference: event.target.value })} /></label>
                    <label>Requested date<input type="date" value={fields.requestedDate} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, requestedDate: event.target.value })} /></label>
                    <label>Total<input type="number" value={fields.total} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, total: Number(event.target.value) })} /></label>
                    <label>Currency<input value={fields.currency} maxLength={3} disabled={decisionLocked} onChange={(event) => setFields({ ...fields, currency: event.target.value.toUpperCase() })} /></label>
                  </div>
                  <p className="edit-hint">{text.saveHint}</p>
                  <div className="actions">{decisionLocked ? <button onClick={() => decide("reopen")}>{text.reopen}</button> : <><button onClick={() => decide("reject")}>{text.reject}</button><button className="primary" onClick={() => decide("approve")}>{text.approve}</button></>}</div>
                </>}
              </section>
            </div>

            <div className="inspection-panels">
              <section><div className="mini-head"><h3>{text.checks}</h3><span>{checks.length}/{checks.length}</span></div><ul className="checks">{checks.map((check: string) => <li key={check}><span>PASS</span>{check}</li>)}</ul></section>
              <section><div className="mini-head"><h3>{text.evidence}</h3><span>source-bound</span></div><ul className="evidence-list">{(execution?.evidence || []).map((item: any, index: number) => <li key={index}><strong>{item.source}</strong><q>{item.excerpt || item.section}</q></li>)}{!execution?.evidence?.length && <li>Evidence appears after extraction.</li>}</ul></section>
              <section><div className="mini-head"><h3>{text.activity}</h3><span>session only</span></div><ol className="timeline">{(activity[selected.id] || ["Queue item opened"]).map((item, index) => <li key={index}><time>{index ? "earlier" : "now"}</time>{item}</li>)}</ol></section>
            </div>
            {execution && <details className="trace"><summary>Technical trace</summary><pre>{JSON.stringify(execution.trace, null, 2)}</pre></details>}
          </div>
        </section>

        <section className="evidence-grid">{text.sections.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}</section>
        <button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} Next</button>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
