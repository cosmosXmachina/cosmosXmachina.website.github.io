import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { runAction } from "../shared/api.js";
import { orion } from "../shared/catalog.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
import "./style.css";

const content = {
  it: {
    title: "Operations Hub", subtitle: "Un punto operativo comune per ordini, blocchi e responsabilita.",
    orders: "Ordini attivi", queue: "Coda di oggi", advance: "Avanza stato", contact: "Discuti un hub operativo",
    sections: [
      ["Problema", "Ordini, note e responsabilita sono frammentati tra fogli, email e memoria del team."],
      ["Workflow", "Ogni ordine attraversa stati consentiti, con proprietario, blocchi e storico azioni."],
      ["Architettura", "React nel client, gateway Node/Fastify e stato dimostrativo in sessione; schema pronto per SQLite."],
      ["Decisioni", "Vista densa per lavoro ripetuto, transizioni esplicite e nessun salvataggio dei contenuti visitatore."],
      ["Failure modes", "Transizioni illegali, sessioni scadute, duplicati e input sovradimensionati vengono respinti."],
      ["Test", "State machine, idempotenza, scadenza sessione, ruoli, responsive e percorsi tastiera."],
      ["Servizio rilevante", "Prodotti full-stack e sistemi operativi interni per PMI."]
    ]
  },
  en: {
    title: "Operations Hub", subtitle: "One operational workspace for orders, blockers and ownership.",
    orders: "Active orders", queue: "Today's queue", advance: "Advance state", contact: "Discuss an operations hub",
    sections: [
      ["Problem", "Orders, notes and ownership are fragmented across sheets, email and team memory."],
      ["Workflow", "Every order moves through allowed states with an owner, blockers and action history."],
      ["Architecture", "React client, Node/Fastify gateway and session-scoped demo state; schema prepared for SQLite."],
      ["Decisions", "A dense view for repeated work, explicit transitions and no visitor-content persistence."],
      ["Failure modes", "Illegal transitions, expired sessions, duplicates and oversized input are rejected."],
      ["Tests", "State machine, idempotency, session expiry, roles, responsive behavior and keyboard paths."],
      ["Relevant service", "Full-stack products and internal operational systems for SMEs."]
    ]
  }
};

function App() {
  const language = getLanguage();
  const text = content[language];
  const [orders, setOrders] = useState(orion.orders);
  const [selected, setSelected] = useState(orion.orders[0].id);
  const [role, setRole] = useState("operations");
  const [notice, setNotice] = useState("");
  setDocumentLanguage(language, text.title + " | Creation Lab");
  const current = orders.find((order) => order.id === selected);

  async function advance() {
    const next = current.status === "review" ? "packing" : current.status === "packing" ? "shipped" : "review";
    await runAction("operations-hub", "advance", { orderId: current.id, next });
    setOrders((items) => items.map((item) => item.id === current.id ? { ...item, status: next } : item));
    setNotice(current.id + " ? " + next);
  }

  return (
    <div className="shell">
      <aside className="nav">
        <a href={withLanguage("/portfolio/", language)}>CX / Creation Lab</a>
        <div className="company"><span>OW</span><strong>Orion Works</strong><small>Treviso</small></div>
        <nav aria-label="Operations"><button className="active">? {text.orders}</button><button>? Tasks</button><button>? Inventory</button><button>? Customers</button></nav>
        <p>{modeLabel(language)}</p>
      </aside>
      <main>
        <header>
          <div><p>Workspace / Operations</p><h1>{text.title}</h1></div>
          <label>Owner<select value={role} onChange={(event) => setRole(event.target.value)}><option value="operations">Elena / Operations</option><option value="sales">Marco / Sales</option><option value="warehouse">Luca / Warehouse</option></select></label>
        </header>
        <p className="subtitle">{text.subtitle}</p>
        <div className="synthetic">{disclosure(language)}</div>
        <section className="metrics" aria-label="Operations summary">
          <article><span>Open orders</span><strong>18</strong><small>EUR 42,830</small></article>
          <article><span>Blocked</span><strong>3</strong><small>2 need review</small></article>
          <article><span>On-time rate</span><strong>94%</strong><small>+2.1%</small></article>
          <article><span>Inventory alerts</span><strong>4</strong><small>1 critical</small></article>
        </section>
        <section className="workspace">
          <div className="table-wrap">
            <div className="section-head"><h2>{text.orders}</h2><span>3 / 18</span></div>
            <table><thead><tr><th>ID</th><th>Customer</th><th>Value</th><th>State</th></tr></thead><tbody>
              {orders.map((order) => <tr key={order.id} className={selected === order.id ? "selected" : ""}><td><button onClick={() => setSelected(order.id)}>{order.id}</button></td><td>{order.customer}</td><td>EUR {order.value.toLocaleString("it-IT")}</td><td><span className={"status " + order.status}>{order.status}</span></td></tr>)}
            </tbody></table>
          </div>
          <aside className="detail">
            <div className="section-head"><h2>{text.queue}</h2><span>{role}</span></div>
            <h3>{current.id}</h3><p>{current.customer}</p>
            <dl><div><dt>Next check</dt><dd>Delivery window</dd></div><div><dt>Owner</dt><dd>{role}</dd></div></dl>
            <label>Internal note<textarea defaultValue="Verify availability before confirming dispatch." /></label>
            <button className="advance" onClick={advance}>{text.advance} Next</button><output aria-live="polite">{notice}</output>
          </aside>
        </section>
        <section className="evidence">{text.sections.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}</section>
        <button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} Next</button>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
