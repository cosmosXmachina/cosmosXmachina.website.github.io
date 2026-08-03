import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { getPreferredProvider, getProviders, runAction, setPreferredProvider } from "../shared/api.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { errorText, getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
import "./style.css";
import "./mobile-disclosure.css";

const initialOrders = [
  { id: "OW-2418", customer: "Nordline Impianti", value: 4820, status: "review", owner: "operations", due: "03 Aug", items: "20 x Orion S7", blocker: "Delivery window not confirmed", flagged: false, note: "Verify availability and delivery promise before confirmation." },
  { id: "OW-2419", customer: "Adria Systems", value: 1690, status: "packing", owner: "warehouse", due: "28 Jul", items: "2 x Orion C4 + kit", blocker: null, flagged: false, note: "" },
  { id: "OW-2420", customer: "Alpina Processi", value: 7350, status: "blocked", owner: "sales", due: "06 Aug", items: "10 x Orion C4", blocker: "Stock below reservation threshold", flagged: true, note: "Confirm reserved units with warehouse." },
  { id: "OW-2421", customer: "Livenza Controls", value: 1920, status: "review", owner: "operations", due: "18 Aug", items: "20 x Orion T2", blocker: null, flagged: false, note: "" },
  { id: "OW-2422", customer: "Dolomiti Automation", value: 5260, status: "packing", owner: "warehouse", due: "09 Aug", items: "25 x Orion S7", blocker: "Quality sample pending", flagged: true, note: "" },
  { id: "OW-2423", customer: "Veneta Motion", value: 980, status: "shipped", owner: "warehouse", due: "24 Jul", items: "8 x Orion T2", blocker: null, flagged: false, note: "" }
];

const inventory = [
  { sku: "OR-S7", name: "Orion S7 Field Sensor", onHand: 64, reserved: 45, reorder: 30, state: "healthy" },
  { sku: "OR-C4", name: "Orion C4 Control Unit", onHand: 18, reserved: 15, reorder: 20, state: "critical" },
  { sku: "OR-T2", name: "Orion T2 Service Kit", onHand: 112, reserved: 36, reorder: 45, state: "healthy" },
  { sku: "OR-P9", name: "Orion P9 Mounting Plate", onHand: 31, reserved: 27, reorder: 18, state: "watch" }
];

const copy = {
  it: {
    title: "Operations Hub", subtitle: "Un punto operativo comune per ordini, blocchi e responsabilita.", orders: "Ordini", tasks: "Attivita", stock: "Inventario", advance: "Avanza stato", brief: "Genera briefing rischio", contact: "Discuti un hub operativo", back: "CX / Creation Lab", workspace: "Spazio di lavoro", currentRole: "Ruolo corrente", provider: "Provider simulato", summary: "Riepilogo operativo", openOrders: "Ordini aperti", blocked: "Bloccati", onTime: "Puntualita", stockAlerts: "Allarmi scorte", followUps: "follow-up segnalati", belowReorder: "1 sotto il punto di riordino", search: "Cerca ordini", searchHint: "ID o cliente", state: "Stato", active: "Attivi", all: "Tutti", customer: "Cliente", due: "Scadenza", owner: "Responsabile", value: "Valore", noOrders: "Nessun ordine corrisponde a questa vista.", dossier: "Dossier ordine", flag: "Segnala", clearFlag: "Rimuovi segnalazione", gold: "Cliente Gold / Veneto", items: "Articoli", promised: "Promessa", activeBlocker: "Blocco attivo", note: "Nota interna", saveNote: "Salva nota", noteSaved: "Nota salvata nella sessione", complete: "Workflow completato", roleBlocked: "Il ruolo non puo avanzare", preparing: "Preparazione briefing sintetico...", exceptionQueue: "Coda eccezioni", ownership: "Follow-up che richiedono un responsabile", open: "aperti", inventoryControl: "Controllo inventario", pressure: "Pressione prenotazioni", snapshot: "Dati sintetici / 19 lug", product: "Prodotto", onHand: "Disponibili", reserved: "Prenotati", available: "Liberi", reorder: "Punto riordino", signal: "Segnale", syntheticBrief: "Dimostrazione sintetica", why: "Perche conta", bounded: "Azioni successive vincolate", boundary: "Confine di controllo", boundaryText: "Il briefing non puo modificare stato, inventario o responsabilita. Deve agire un operatore autorizzato.", trace: "Traccia provider", audit: "Audit di sessione", activity: "attivita", notPersisted: "non salvato", opened: "Ordine aperto", next: "Continua", now: "ora", people: "persone", roleNames: { operations: "Elena / Operazioni", sales: "Marco / Vendite", warehouse: "Luca / Magazzino" }, statusNames: { review: "verifica", packing: "preparazione", blocked: "bloccato", shipped: "spedito" }, stockNames: { healthy: "regolare", critical: "critico", watch: "attenzione" },
    sections: [["Problema", "Ordini, note e responsabilita sono frammentati tra fogli, email e memoria del team."], ["Workflow", "Ogni ordine attraversa stati consentiti, con proprietario, blocchi e storico azioni."], ["Architettura", "React nel client, gateway Node/Fastify, SQLite e stato dimostrativo per sessione."], ["Decisioni", "Vista densa per lavoro ripetuto, transizioni esplicite e briefing separato dalle regole."], ["Failure modes", "Transizioni illegali, ruoli insufficienti, sessioni scadute e input sovradimensionati vengono respinti."], ["Test", "State machine per ordine, permessi, scadenza, replay, responsive e percorsi tastiera."], ["Servizio rilevante", "Prodotti full-stack e sistemi operativi interni per PMI."]]
  },
  en: {
    title: "Operations Hub", subtitle: "One operational workspace for orders, blockers and ownership.", orders: "Orders", tasks: "Tasks", stock: "Inventory", advance: "Advance state", brief: "Generate risk brief", contact: "Discuss an operations hub", back: "CX / Creation Lab", workspace: "Workspace", currentRole: "Current role", provider: "Simulated provider", summary: "Operations summary", openOrders: "Open orders", blocked: "Blocked", onTime: "On-time rate", stockAlerts: "Stock alerts", followUps: "follow-ups flagged", belowReorder: "1 below reorder point", search: "Search orders", searchHint: "ID or customer", state: "State", active: "Active", all: "All", customer: "Customer", due: "Due", owner: "Owner", value: "Value", noOrders: "No orders match this view.", dossier: "Order dossier", flag: "Flag", clearFlag: "Clear flag", gold: "Gold account / Veneto", items: "Items", promised: "Promised", activeBlocker: "Active blocker", note: "Internal note", saveNote: "Save note", noteSaved: "Note saved in this session", complete: "Workflow complete", roleBlocked: "Role cannot advance", preparing: "Preparing synthetic brief...", exceptionQueue: "Exception queue", ownership: "Follow-ups requiring ownership", open: "open", inventoryControl: "Inventory control", pressure: "Reservation pressure", snapshot: "Fixture snapshot / 19 Jul", product: "Product", onHand: "On hand", reserved: "Reserved", available: "Available", reorder: "Reorder point", signal: "Signal", syntheticBrief: "Synthetic demonstration", why: "Why it matters", bounded: "Bounded next actions", boundary: "Control boundary", boundaryText: "This brief cannot change order state, inventory or ownership. A permitted operator must act.", trace: "Provider trace", audit: "Session audit", activity: "activity", notPersisted: "not persisted", opened: "Order opened", next: "Next", now: "now", people: "people", roleNames: { operations: "Elena / Operations", sales: "Marco / Sales", warehouse: "Luca / Warehouse" }, statusNames: { review: "review", packing: "packing", blocked: "blocked", shipped: "shipped" }, stockNames: { healthy: "healthy", critical: "critical", watch: "watch" },
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
  const [note, setNote] = useState(initialOrders[0].note);
  const [busy, setBusy] = useState("");
  setDocumentLanguage(language, {
    title: text.title + " | Creation Lab",
    description: text.subtitle,
    path: "/portfolio/operations-hub/",
    image: "/assets/portfolio/operations-hub.jpg",
    imageAlt: text.title + " / cosmosXmachina Creation Lab"
  });

  useEffect(() => {
    getProviders()
      .then((value) => setProviders(value.providers.filter((item) => item.selectable)))
      .catch((failure) => setError(errorText(failure, language)));
  }, [language]);

  const current = orders.find((order) => order.id === selected) || orders[0];
  useEffect(() => setNote(current.note || ""), [current.id, current.note]);
  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && order.status !== "shipped") || order.status === statusFilter;
    return matchesStatus && (order.id + " " + order.customer).toLowerCase().includes(query.trim().toLowerCase());
  }), [orders, query, statusFilter]);
  const openOrders = orders.filter((order) => order.status !== "shipped");
  const openValue = openOrders.reduce((sum, order) => sum + order.value, 0);
  const locale = language === "it" ? "it-IT" : "en-GB";

  function log(orderId, message) {
    setLogs((state) => ({
      ...state,
      [orderId]: [{ message, at: new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) }, ...(state[orderId] || [])].slice(0, 8)
    }));
  }

  function actionInput(extra = {}) {
    return { orderId: current.id, currentStatus: current.status, role, language, ...extra };
  }

  async function mutate(action, extra, apply, logMessage) {
    setBusy(action);
    setError("");
    try {
      const payload = await runAction("operations-hub", action, actionInput(extra), provider);
      const state = payload.result.state;
      setOrders((items) => items.map((item) => item.id === current.id ? apply(item, state) : item));
      if (logMessage) log(current.id, logMessage(state));
      return state;
    } catch (failure) {
      setError(errorText(failure, language));
      return null;
    } finally {
      setBusy("");
    }
  }

  async function advance() {
    const next = nextState[current.status];
    if (!next) return;
    const state = await mutate("advance", { next }, (item, confirmed) => ({
      ...item,
      status: confirmed.step,
      blocker: confirmed.step === "review" ? null : item.blocker
    }), (confirmed) => `${role} ${language === "it" ? "ha spostato l'ordine a" : "moved order to"} ${text.statusNames[confirmed.step]}`);
    if (state) setNotice(`${current.id} -> ${text.statusNames[state.step]}`);
  }

  async function assign(owner) {
    await mutate("assign", { owner }, (item, state) => ({ ...item, owner: state.owner }), (state) => language === "it" ? `Responsabile assegnato: ${state.owner}` : `Owner assigned to ${state.owner}`);
  }

  async function toggleFlag() {
    const flagged = !current.flagged;
    await mutate("flag", { flagged, reason: current.blocker || "Manual follow-up" }, (item, state) => ({ ...item, flagged: state.flagged }), (state) => language === "it" ? (state.flagged ? "Segnalazione aggiunta" : "Segnalazione rimossa") : (state.flagged ? "Follow-up flag added" : "Follow-up flag cleared"));
  }

  async function saveNote() {
    const state = await mutate("note", { note }, (item, confirmed) => ({ ...item, note: confirmed.note }), () => text.noteSaved);
    if (state) setNotice(text.noteSaved);
  }

  async function generateBrief() {
    setBusy("brief");
    setError("");
    setNotice(text.preparing);
    try {
      const payload = await runAction("operations-hub", "brief", actionInput({ order: current, inventory }), provider);
      setBrief(payload.result.execution);
      setNotice("");
      log(current.id, language === "it" ? `Briefing rischio generato con simulazione ${provider}` : `Risk brief generated with ${provider} simulation`);
    } catch (failure) {
      setError(errorText(failure, language));
      setNotice("");
    } finally {
      setBusy("");
    }
  }

  function chooseProvider(value) { setProvider(value); setPreferredProvider(value); }
  const canAdvance = Boolean(nextState[current.status]) && !(nextState[current.status] === "shipped" && role === "sales");

  return <div className="shell">
    <aside className="nav">
      <a href={withLanguage("/portfolio/", language)}>{text.back}</a>
      <div className="company"><span>OW</span><strong>Orion Works</strong><small>Treviso / 48 {text.people}</small></div>
      <nav aria-label={language === "it" ? "Viste operative" : "Operations views"}>
        {[["orders", text.orders, openOrders.length], ["tasks", text.tasks, orders.filter((order) => order.flagged).length], ["inventory", text.stock, inventory.filter((item) => item.state !== "healthy").length]].map(([id, label, count]) => <button aria-pressed={view === id} className={view === id ? "active" : ""} onClick={() => setView(id)} key={id}><span>{label}</span><em>{count}</em></button>)}
      </nav>
      <div className="nav-foot"><span>{modeLabel(language)}</span></div>
    </aside>

    <main>
      <header>
        <div><p>{text.workspace} / {view === "orders" ? text.orders : view === "tasks" ? text.tasks : text.stock}</p><h1>{text.title}</h1><span>{text.subtitle}</span></div>
        <div className="header-controls">
          <label>{text.currentRole}<select value={role} onChange={(event) => { setRole(event.target.value); setBrief(null); setError(""); }}>{Object.entries(text.roleNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>{text.provider}<select value={provider} onChange={(event) => chooseProvider(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.label} / {language === "it" ? "simulato" : "simulated"}</option>)}</select></label>
        </div>
      </header>
      <p className="synthetic-strip">{disclosure(language)}</p>

      <section className="metrics" aria-label={text.summary}>
        <article><span>{text.openOrders}</span><strong>{openOrders.length}</strong><small>EUR {openValue.toLocaleString(locale)}</small></article>
        <article><span>{text.blocked}</span><strong>{orders.filter((order) => order.status === "blocked").length}</strong><small>{orders.filter((order) => order.flagged).length} {text.followUps}</small></article>
        <article><span>{text.onTime}</span><strong>94.1%</strong><small>+2.1 {language === "it" ? "punti" : "points"} / 30d</small></article>
        <article><span>{text.stockAlerts}</span><strong>{inventory.filter((item) => item.state !== "healthy").length}</strong><small>{text.belowReorder}</small></article>
      </section>

      {view === "orders" && <section className="workspace">
        <div className="table-wrap">
          <div className="toolbar"><label><span>{text.search}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.searchHint} /></label><label><span>{text.state}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">{text.active}</option><option value="all">{text.all}</option>{Object.entries(text.statusNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
          <table><thead><tr><th>{text.orders}</th><th>{text.customer}</th><th>{text.due}</th><th>{text.owner}</th><th>{text.value}</th><th>{text.state}</th></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.id} className={selected === order.id ? "selected" : ""}><td><button onClick={() => { setSelected(order.id); setBrief(null); setError(""); }}>{order.flagged && <span className="flag" title={text.flag}>!</span>}{order.id}</button></td><td>{order.customer}</td><td>{order.due}</td><td>{text.roleNames[order.owner]?.split(" / ").at(-1) || order.owner}</td><td>EUR {order.value.toLocaleString(locale)}</td><td><span className={"status " + order.status}>{text.statusNames[order.status]}</span></td></tr>)}</tbody></table>
          {!visibleOrders.length && <p className="empty">{text.noOrders}</p>}
        </div>

        <aside className="detail">
          <div className="section-head"><div><span>{text.dossier}</span><h2>{current.id}</h2></div><button className={current.flagged ? "flagged" : ""} onClick={toggleFlag} disabled={Boolean(busy)}>{current.flagged ? text.clearFlag : text.flag}</button></div>
          <div className="customer"><strong>{current.customer}</strong><span>{text.gold}</span></div>
          <dl><div><dt>{text.items}</dt><dd>{current.items}</dd></div><div><dt>{text.promised}</dt><dd>{current.due}</dd></div><div><dt>{text.value}</dt><dd>EUR {current.value.toLocaleString(locale)}</dd></div><div><dt>{text.state}</dt><dd>{text.statusNames[current.status]}</dd></div></dl>
          {current.blocker && <div className="blocker"><span>{text.activeBlocker}</span><strong>{current.blocker}</strong></div>}
          <label className="owner">{text.owner}<select value={current.owner} onChange={(event) => assign(event.target.value)} disabled={Boolean(busy)}>{Object.entries(text.roleNames).map(([value, label]) => <option value={value} key={value}>{label.split(" / ").at(-1)}</option>)}</select></label>
          <label className="note">{text.note}<textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} /></label>
          <button onClick={saveNote} disabled={Boolean(busy) || !note.trim()}>{text.saveNote}</button>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions"><button onClick={generateBrief} disabled={Boolean(busy)}>{text.brief}</button><button className="advance" onClick={advance} disabled={!canAdvance || Boolean(busy)}>{canAdvance ? `${text.advance} -> ${text.statusNames[nextState[current.status]]}` : current.status === "shipped" ? text.complete : text.roleBlocked}</button></div>
          <output aria-live="polite">{notice}</output>
        </aside>
      </section>}

      {view === "tasks" && <section className="task-view"><div className="view-head"><div><span>{text.exceptionQueue}</span><h2>{text.ownership}</h2></div><strong>{orders.filter((order) => order.flagged).length} {text.open}</strong></div>{orders.filter((order) => order.flagged).map((order) => <article key={order.id}><button onClick={() => { setSelected(order.id); setView("orders"); }}>{order.id}</button><div><strong>{order.blocker || "Manual follow-up"}</strong><span>{order.customer} / {text.due.toLowerCase()} {order.due}</span></div><em>{order.owner}</em><span className={"status " + order.status}>{text.statusNames[order.status]}</span></article>)}</section>}

      {view === "inventory" && <section className="inventory-view"><div className="view-head"><div><span>{text.inventoryControl}</span><h2>{text.pressure}</h2></div><strong>{text.snapshot}</strong></div><table><thead><tr><th>SKU</th><th>{text.product}</th><th>{text.onHand}</th><th>{text.reserved}</th><th>{text.available}</th><th>{text.reorder}</th><th>{text.signal}</th></tr></thead><tbody>{inventory.map((item) => <tr key={item.sku}><td><strong>{item.sku}</strong></td><td>{item.name}</td><td>{item.onHand}</td><td>{item.reserved}</td><td>{item.onHand - item.reserved}</td><td>{item.reorder}</td><td><span className={"stock " + item.state}>{text.stockNames[item.state]}</span></td></tr>)}</tbody></table></section>}

      {brief && <section className="brief" aria-live="polite"><div className="brief-head"><div><span>{text.syntheticBrief} / {brief.trace?.targetProvider}</span><h2>{brief.output.headline}</h2></div><em className={brief.output.riskLevel}>{brief.output.riskLevel} risk</em></div><div><section><h3>{text.why}</h3><ul>{brief.output.reasons.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>{text.bounded}</h3><ol>{brief.output.nextActions.map((item) => <li key={item}>{item}</li>)}</ol></section><section><h3>{text.boundary}</h3><p>{text.boundaryText}</p></section></div><details><summary>{text.trace}</summary><pre>{JSON.stringify(brief.trace, null, 2)}</pre></details></section>}

      <section className="audit"><div className="view-head"><div><span>{text.audit}</span><h2>{current.id} {text.activity}</h2></div><strong>{text.notPersisted}</strong></div>{(logs[current.id] || [{ message: text.opened, at: text.now }]).map((item, index) => <p key={index}><time>{item.at}</time><span>{item.message}</span></p>)}</section>
      <section className="evidence">{text.sections.map(([title, body]) => <article key={title}><h2>{title}</h2><p>{body}</p></article>)}</section>
      <button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} {text.next}</button>
    </main>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
