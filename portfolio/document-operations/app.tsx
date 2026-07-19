import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { runAction } from "../shared/api.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
import "./style.css";

const samples = [
  { id: "M-204", sender: "Nordline Impianti", subject: "Ordine NW-8841 / consegna urgente", time: "09:42" },
  { id: "M-205", sender: "Alpina Processi", subject: "Aggiornamento anagrafica fornitore", time: "10:17" },
  { id: "M-206", sender: "Adria Systems", subject: "Richiesta sostituzione S7", time: "11:03" }
];

const copy = {
  it: {
    title: "Document Operations",
    subtitle: "Posta in ingresso, dati estratti e decisioni umane nello stesso banco di lavoro.",
    inbox: "Posta in ingresso", inspect: "Documento e controlli", classify: "Classifica ed estrai",
    approve: "Approva", reject: "Rifiuta", idle: "Seleziona un messaggio ed esegui la pipeline deterministica.",
    result: "Risultato proposto", evidence: "Evidenze", contact: "Porta questo caso nel modulo contatti",
    back: "Creation Lab",
    sections: [
      ["Problema", "Le richieste arrivano tra email e allegati, richiedono reinserimento manuale e nascondono le eccezioni."],
      ["Workflow", "Acquisizione controllata, classificazione, estrazione tipizzata, validazione e approvazione umana."],
      ["Architettura", "React e TypeScript nel client; contratto provider neutrale; pipeline FastAPI/Pydantic privata con fallback fixture."],
      ["Decisioni", "Schema e regole restano fuori dal provider. Nessun allegato arbitrario e nessuna azione automatica."],
      ["Failure modes", "Campi mancanti, importi incoerenti, documenti ambigui e servizio Python non disponibile producono warning o fallback."],
      ["Test", "Contract test, replay deterministico, limiti richiesta, HTML ostile, transizioni e zero chiamate AI esterne."],
      ["Servizio rilevante", "Automazione AI e workflow documentali con supervisione."]
    ]
  },
  en: {
    title: "Document Operations",
    subtitle: "Incoming mail, extracted data and human decisions in one workstation.",
    inbox: "Incoming mail", inspect: "Document and controls", classify: "Classify and extract",
    approve: "Approve", reject: "Reject", idle: "Select a message and run the deterministic pipeline.",
    result: "Proposed result", evidence: "Evidence", contact: "Transfer this case to contact",
    back: "Creation Lab",
    sections: [
      ["Problem", "Requests arrive across email and attachments, require manual re-entry and hide exceptions."],
      ["Workflow", "Controlled intake, classification, typed extraction, validation and human approval."],
      ["Architecture", "React and TypeScript in the client; provider-neutral contract; private FastAPI/Pydantic pipeline with fixture fallback."],
      ["Decisions", "Schemas and rules stay outside the provider. No arbitrary attachments and no automatic actions."],
      ["Failure modes", "Missing fields, inconsistent amounts, ambiguous documents and Python downtime produce warnings or fixture fallback."],
      ["Tests", "Contract tests, deterministic replay, request limits, hostile HTML, transitions and zero external AI calls."],
      ["Relevant service", "Supervised AI automation and document workflows."]
    ]
  }
};

function App() {
  const language = getLanguage();
  const text = copy[language];
  const [selected, setSelected] = useState(samples[0]);
  const [status, setStatus] = useState("idle");
  const [execution, setExecution] = useState<any>(null);
  setDocumentLanguage(language, text.title + " | Creation Lab");

  async function classify() {
    setStatus("running");
    const payload = await runAction("document-operations", "classify", { messageId: selected.id });
    const result = payload.result.execution || payload.result;
    setExecution(result.output ? result : result.execution || result);
    setStatus("classified");
  }

  async function decide(action: "approve" | "reject") {
    await runAction("document-operations", action, { messageId: selected.id });
    setStatus(action === "approve" ? "approved" : "rejected");
  }

  const output = execution?.output || null;
  const evidence = execution?.evidence || [];

  return (
    <>
      <header>
        <a href={withLanguage("/portfolio/", language)}>Back / {text.back}</a>
        <strong>ORION / OPS-01</strong>
        <span className="mode">{modeLabel(language)}</span>
      </header>
      <main>
        <section className="hero">
          <p className="kicker">cosmosXmachina Creation Lab</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
          <small>{disclosure(language)}</small>
        </section>
        <section className="workstation" aria-label={text.title}>
          <aside>
            <div className="panel-title"><h2>{text.inbox}</h2><span>3</span></div>
            {samples.map((message) => (
              <button key={message.id} className={selected.id === message.id ? "selected" : ""} onClick={() => { setSelected(message); setExecution(null); setStatus("idle"); }}>
                <span>{message.sender}</span><time>{message.time}</time><strong>{message.subject}</strong>
              </button>
            ))}
          </aside>
          <div className="document">
            <div className="document-head">
              <div><span>{selected.id}</span><h2>{text.inspect}</h2></div>
              <button className="primary" onClick={classify} disabled={status === "running"}>{text.classify}</button>
            </div>
            <div className="paper">
              <p><strong>From:</strong> {selected.sender}</p>
              <p><strong>Subject:</strong> {selected.subject}</p><hr />
              <p>Please confirm order NW-8841 for EUR 4,820. Requested delivery: 03/08/2026.</p>
              <p>Attached reference: Orion S7 field sensor, quantity 20.</p>
            </div>
            <div className="result" aria-live="polite">
              {!output ? <p>{status === "running" ? "Running fixture-2026.1..." : text.idle}</p> : (
                <>
                  <div className="result-head"><h3>{text.result}</h3><span>{status}</span></div>
                  <dl>
                    <div><dt>Category</dt><dd>{output.category}</dd></div>
                    <div><dt>Priority</dt><dd>{output.priority}</dd></div>
                    <div><dt>Reference</dt><dd>{output.fields?.orderReference}</dd></div>
                    <div><dt>Total</dt><dd>EUR {output.fields?.total}</dd></div>
                  </dl>
                  <h4>{text.evidence}</h4>
                  <ul>{evidence.map((item, index) => <li key={index}>{item.source}: {item.excerpt || item.section}</li>)}</ul>
                  <div className="actions">
                    <button onClick={() => decide("reject")}>{text.reject}</button>
                    <button className="primary" onClick={() => decide("approve")}>{text.approve}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
        <section className="evidence-grid">
          {text.sections.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}
        </section>
        <button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} Next</button>
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
