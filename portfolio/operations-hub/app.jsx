import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getPreferredProvider, getProviders, runAction, setPreferredProvider } from "../shared/api.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
import "./style.css";
import "./mobile-disclosure.css";

const initialOrders = [
  { id: "OW-2418", customer: "Nordline Impianti", value: 4820, status: "review", owner: "operations", due: "03 Aug", items: "20 x Orion S7", blocker: "Delivery window not confirmed", flagged: false },
  { id: "OW-2419", customer: "Adria Systems", value: 1690, status: "packing", owner: "warehouse", due: "28 Jul", items: "2 x Orion C4 + kit", blocker: null, flagged: false },
  { id: "OW-2420", customer: "Alpina Processi", value: 7350, status: "blocked", owner: "sales", due: "06 Aug", items: "10 x Orion C4", blocker: "Stock below reservation threshold", flagged: true },
  { id: "OW-2421", customer: "Livenza Controls", value: 1920, status: "review", owner: "operations", due: "18 Aug", items: "20 x Orion T2", blocker: null, flagged: false },
  { id: "OW-2422", customer: "Dolomiti Automation", value: 5260, status: "packing", owner: "warehouse", due: "09 Aug", items: "25 x Orion S7", blocker: "Quality sample pending", flagged: true },
  { id: "OW-2423", customer: "Veneta Motion", value: 980, status: "shipped", owner: "warehouse", due: "24 Jul", items: "8 x Orion T2", blocker: null, flagged: false }
];

const inventory = [
  { sku: "OR-S7", name: "Orion S7 Field Sensor", onHand: 64, reserved: 45, reorder: 30, state: "healthy" },
  { sku: "OR-C4", name: "Orion C4 Control Unit", onHand: 18, reserved: 15, reorder: 20, state: "critical" },
  { sku: "OR-T2", name: "Orion T2 Service Kit", onHand: 112, reserved: 36, reorder: 45, state: "healthy" },
  { sku: "OR-P9", name: "Orion P9 Mounting Plate", onHand: 31, reserved: 27, reorder: 18, state: "watch" }
];

const copy = {
  it: {
    title: "Operations Hub", subtitle: "Un punto operativo comune per ordini, blocchi e responsabilita.", orders: "Ordini", tasks: "Attivita", stock: "Inventario", advance: "Avanza stato", brief: "Genera briefing rischio", contact: "Discuti un hub operativo",
    sections: [["Problema", "Ordini, note e responsabilita sono frammentati tra fogli, email e memoria del team."], ["Workflow", "Ogni ordine attraversa stati consentiti, con proprietario, blocchi e storico azioni."], ["Architettura", "React nel client, gateway Node/Fastify, SQLite e stato dimostrativo per sessione."], ["Decisioni", "Vista densa per lavoro ripetuto, transizioni esplicite e briefing separato dalle regole."], ["Failure modes", "Transizioni illegali, ruoli insufficienti, sessioni scadute e input sovradimensionati vengono respinti."], ["Test", "State machine per ordine, permessi, scadenza, replay, responsive e percorsi tastiera."], ["Servizio rilevante", "Prodotti full-stack e sistemi operativi interni per PMI."]]
  },
  en: {
    title: "Operations Hub", subtitle: "One operational workspace for orders, blockers and ownership.", orders: "Orders", tasks: "Tasks", stock: "Inventory", advance: "Advance state", brief: "Generate risk brief", contact: "Discuss an operations hub",
    sections: [["Problem", "Orders, notes and ownership are fragmented across sheets, email and team memory."], ["Workflow", "Every order moves through allowed states with an owner, blockers and action history."], ["Architecture", "React client, Node/Fastify gateway, SQLite and session-scoped demonstration state."], ["Decisions", "A dense view for repeated work, explicit transitions and briefings separated from business rules."], ["Failure modes", "Illegal transitions, insufficient roles, expired sessions and oversized input are rejected."], ["Tests", "Per-order state machine, permissions, expiry, replay, responsive behavior and keyboard paths."], ["Relevant service", "Full-stack products and internal operational systems for SMEs."]]
  }
};

const nextState = { review: "packing", packing: "shipped", blocked: "review" };

function App() {
  const language = getLanguage();
  const text = copy[language];
  const [orders, setOrders] = useState(initialOrders);
  const [selected, setSelected] = useState(initialOrders[0].id);
  const [view, setView] = useState("orders");
  const [role, setRole] = useState("operations");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [provider, setProvider] = useState(getPreferredProvider());
  const [providers, setProviders] = useState([]);
  const [brief, setBrief] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState({});
  setDocumentLanguage(language, text.title + " | Creation Lab");

  useEffect(() => { getProviders().then((value) => setProviders(value.providers.filter((item) => item.selectable))); }, []);
  const current = orders.find((order) => order.id === selected) || orders[0];
  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && order.status !== "shipped") || order.status === statusFilter;
    return matchesStatus && (order.id + " " + order.customer).toLowerCase().includes(query.trim().toLowerCase());
  }), [orders, query, statusFilter]);
  const openOrders = orders.filter((order) => order.status !== "shipped");
  const openValue = openOrders.reduce((sum, order) => sum + order.value, 0);

  function log(orderId, message) {
    setLogs((state) => ({ ...state, [orderId]: [{ message, at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }, ...(state[orderId] || [])].slice(0, 8) }));
  }

  async function advance() {
    const next = nextState[current.status];
    if (!next) return;
    setError("");
    try {
      await runAction("operations-hub", "advance", { orderId: current.id, currentStatus: current.status, next, role }, provider);
      setOrders((items) => items.map((item) => item.id === current.id ? { ...item, status: next, blocker: next === "review" ? null : item.blocker } : item));
      setNotice(current.id + " -> " + next);
      log(current.id, role + " moved order to " + next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Transition failed");
    }
  }

  async function assign(owner) {
    setError("");
    try {
      await runAction("operations-hub", "assign", { orderId: current.id, owner }, provider);
      setOrders((items) => items.map((item) => item.id === current.id ? { ...item, owner } : item));
      log(current.id, "Owner assigned to " + owner);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Assignment failed"); }
  }

  async function toggleFlag() {
    const flagged = !current.flagged;
    await runAction("operations-hub", "flag", { orderId: current.id, flagged, reason: current.blocker || "Manual follow-up" }, provider);
    setOrders((items) => items.map((item) => item.id === current.id ? { ...item, flagged } : item));
    log(current.id, flagged ? "Follow-up flag added" : "Follow-up flag cleared");
  }

  async function generateBrief() {
    setNotice("Preparing synthetic brief...");
    const payload = await runAction("operations-hub", "brief", { order: current, inventory }, provider);
    const execution = payload.result.execution || payload.result;
    setBrief(execution);
    setNotice("");
    log(current.id, "Risk brief generated with " + provider + " simulation");
  }

  function chooseProvider(value) { setProvider(value); setPreferredProvider(value); }
  const canAdvance = Boolean(nextState[current.status]) && !(nextState[current.status] === "shipped" && role === "sales");

  return (
    <div className="shell">
      <aside className="nav">
        <a href={withLanguage("/portfolio/", language)}>CX / Creation Lab</a>
        <div className="company"><span>OW</span><strong>Orion Works</strong><small>Treviso / 48 people</small></div>
        <nav aria-label="Operations views">
          {[["orders", text.orders, openOrders.length], ["tasks", text.tasks, orders.filter((order) => order.flagged).length], ["inventory", text.stock, inventory.filter((item) => item.state !== "healthy").length]].map(([id, label, count]) => <button className={view === id ? "active" : ""} onClick={() => setView(id)} key={id}><span>{label}</span><em>{count}</em></button>)}
        </nav>
        <div className="nav-foot"><span>{modeLabel(language)}</span></div>
      </aside>

      <main>
        <header>
          <div><p>Workspace / {view}</p><h1>{text.title}</h1><span>{text.subtitle}</span></div>
          <div className="header-controls">
            <label>Current role<select value={role} onChange={(event) => setRole(event.target.value)}><option value="operations">Elena / Operations</option><option value="sales">Marco / Sales</option><option value="warehouse">Luca / Warehouse</option></select></label>
            <label>Provider target<select value={provider} onChange={(event) => chooseProvider(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.label} / simulated</option>)}</select></label>
          </div>
        </header>
        <p className="synthetic-strip">{disclosure(language)}</p>

        <section className="metrics" aria-label="Operations summary">
          <article><span>Open orders</span><strong>{openOrders.length}</strong><small>EUR {openValue.toLocaleString("it-IT")}</small></article>
          <article><span>Blocked</span><strong>{orders.filter((order) => order.status === "blocked").length}</strong><small>{orders.filter((order) => order.flagged).length} follow-ups flagged</small></article>
          <article><span>On-time rate</span><strong>94.1%</strong><small>+2.1 points / 30d</small></article>
          <article><span>Stock alerts</span><strong>{inventory.filter((item) => item.state !== "healthy").length}</strong><small>1 below reorder point</small></article>
        </section>

        {view === "orders" && <section className="workspace">
          <div className="table-wrap">
            <div className="toolbar"><label><span>Search orders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID or customer" /></label><label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Active</option><option value="all">All</option><option value="review">Review</option><option value="packing">Packing</option><option value="blocked">Blocked</option><option value="shipped">Shipped</option></select></label></div>
            <table><thead><tr><th>Order</th><th>Customer</th><th>Due</th><th>Owner</th><th>Value</th><th>State</th></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.id} className={selected === order.id ? "selected" : ""}><td><button onClick={() => { setSelected(order.id); setBrief(null); setError(""); }}>{order.flagged && <span className="flag" title="Follow-up flagged">!</span>}{order.id}</button></td><td>{order.customer}</td><td>{order.due}</td><td>{order.owner}</td><td>EUR {order.value.toLocaleString("it-IT")}</td><td><span className={"status " + order.status}>{order.status}</span></td></tr>)}</tbody></table>
            {!visibleOrders.length && <p className="empty">No orders match this view.</p>}
          </div>

          <aside className="detail">
            <div className="section-head"><div><span>Order dossier</span><h2>{current.id}</h2></div><button className={current.flagged ? "flagged" : ""} onClick={toggleFlag}>{current.flagged ? "Clear flag" : "Flag"}</button></div>
            <div className="customer"><strong>{current.customer}</strong><span>Gold account / Veneto</span></div>
            <dl><div><dt>Items</dt><dd>{current.items}</dd></div><div><dt>Promised</dt><dd>{current.due}</dd></div><div><dt>Value</dt><dd>EUR {current.value.toLocaleString("it-IT")}</dd></div><div><dt>State</dt><dd>{current.status}</dd></div></dl>
            {current.blocker && <div className="blocker"><span>Active blocker</span><strong>{current.blocker}</strong></div>}
            <label className="owner">Owner<select value={current.owner} onChange={(event) => assign(event.target.value)}><option value="operations">Operations</option><option value="sales">Sales</option><option value="warehouse">Warehouse</option></select></label>
            <label className="note">Internal note<textarea defaultValue="Verify availability and delivery promise before confirmation." /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="actions"><button onClick={generateBrief}>{text.brief}</button><button className="advance" onClick={advance} disabled={!canAdvance}>{canAdvance ? text.advance + " -> " + nextState[current.status] : current.status === "shipped" ? "Workflow complete" : "Role cannot advance"}</button></div>
            <output aria-live="polite">{notice}</output>
          </aside>
        </section>}

        {view === "tasks" && <section className="task-view"><div className="view-head"><div><span>Exception queue</span><h2>Follow-ups requiring ownership</h2></div><strong>{orders.filter((order) => order.flagged).length} open</strong></div>{orders.filter((order) => order.flagged).map((order) => <article key={order.id}><button onClick={() => { setSelected(order.id); setView("orders"); }}>{order.id}</button><div><strong>{order.blocker || "Manual follow-up"}</strong><span>{order.customer} / due {order.due}</span></div><em>{order.owner}</em><span className={"status " + order.status}>{order.status}</span></article>)}</section>}

        {view === "inventory" && <section className="inventory-view"><div className="view-head"><div><span>Inventory control</span><h2>Reservation pressure</h2></div><strong>Fixture snapshot / 19 Jul</strong></div><table><thead><tr><th>SKU</th><th>Product</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Reorder point</th><th>Signal</th></tr></thead><tbody>{inventory.map((item) => <tr key={item.sku}><td><strong>{item.sku}</strong></td><td>{item.name}</td><td>{item.onHand}</td><td>{item.reserved}</td><td>{item.onHand - item.reserved}</td><td>{item.reorder}</td><td><span className={"stock " + item.state}>{item.state}</span></td></tr>)}</tbody></table></section>}

        {brief && <section className="brief" aria-live="polite"><div className="brief-head"><div><span>Synthetic demonstration / {brief.trace?.targetProvider}</span><h2>{brief.output.headline}</h2></div><em className={brief.output.riskLevel}>{brief.output.riskLevel} risk</em></div><div><section><h3>Why it matters</h3><ul>{brief.output.reasons.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Bounded next actions</h3><ol>{brief.output.nextActions.map((item) => <li key={item}>{item}</li>)}</ol></section><section><h3>Control boundary</h3><p>This brief cannot change order state, inventory or ownership. A permitted operator must act.</p></section></div><details><summary>Provider trace</summary><pre>{JSON.stringify(brief.trace, null, 2)}</pre></details></section>}

        <section className="audit"><div className="view-head"><div><span>Session audit</span><h2>{current.id} activity</h2></div><strong>not persisted</strong></div>{(logs[current.id] || [{ message: "Order opened", at: "now" }]).map((item, index) => <p key={index}><time>{item.at}</time><span>{item.message}</span></p>)}</section>
        <section className="evidence">{text.sections.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}</section>
        <button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} Next</button>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
