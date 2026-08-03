import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { getPreferredProvider, getProviders, runAction, setPreferredProvider } from "../shared/api.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { errorText, getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
import { calculateKpis, formatPercent } from "./kpi-engine.js";
import "./style.css";
import "./chart-key.css";

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const records = [
  ["Sep 25", 25, 15.6, 18, 17, 1, 18], ["Oct 25", 27, 16.6, 20, 18, 1, 20], ["Nov 25", 29, 17.7, 21, 20, 0, 21], ["Dec 25", 31, 19.2, 22, 20, 1, 22],
  ["Jan 26", 30, 18.7, 21, 20, 1, 21], ["Feb 26", 34, 20.5, 24, 22, 0, 24], ["Mar 26", 32, 19.8, 23, 21, 1, 23], ["Apr 26", 38, 23.4, 27, 25, 0, 27],
  ["May 26", 36, 22.1, 26, 24, 1, 26], ["Jun 26", 45, 27.6, 31, 29, 1, 31], ["Jul 26", 52, 31.9, 35, 33, 0, 35], ["Aug 26", 58, 35.6, 38, 36, 1, 38]
].map(([month, revenue, cogs, delivered, onTime, returned, shipped]) => ({
  month,
  all: { revenue, cogs, delivered, onTime, returned, shipped },
  italy: { revenue: Math.round(revenue * .66), cogs: Math.round(cogs * .67 * 10) / 10, delivered: Math.round(delivered * .68), onTime: Math.round(onTime * .69), returned: returned ? 1 : 0, shipped: Math.round(shipped * .68) },
  export: { revenue: Math.round(revenue * .34), cogs: Math.round(cogs * .33 * 10) / 10, delivered: Math.max(1, Math.round(delivered * .32)), onTime: Math.max(1, Math.round(onTime * .3)), returned: 0, shipped: Math.max(1, Math.round(shipped * .32)) }
}));

const copy = {
  it: {
    title: "KPI Studio", lead: "Numeri operativi leggibili, formule trasparenti e confronti riproducibili.", revenue: "Ricavi", margin: "Margine lordo", delivery: "Consegne puntuali", returns: "Resi", narrative: "Genera nota decisionale", export: "Esporta CSV", contact: "Costruiamo un reporting utile", back: "Torna al Creation Lab", period: "Periodo", last3: "Ultimi 3 mesi", last6: "Ultimi 6 mesi", provider: "Provider simulato", calculation: "Calcolo", worker: "Web Worker", fallback: "fallback locale", calculating: "in calcolo", scope: "Ambito dati", scopes: { all: "Tutto", italy: "Italia", export: "Export" }, noBaseline: "nessun confronto", vsPrior: "rispetto al periodo precedente", above: "sopra", below: "sotto", target: "obiettivo", guardrail: "soglia", primary: "Analisi principale", trend: "Andamento ricavi e margine", decision: "Supporto decisionale", scenario: "Scenario", growth: "Crescita del prossimo periodo", projected: "Ricavi del prossimo periodo", notForecast: "scenario lineare trasparente, non una previsione", dataContract: "Contratto dati", quality: "Controlli qualita", passed: "superati", review: "verifica", rows: "Righe", missing: "Mancanti", duplicates: "Duplicati", refreshed: "Aggiornati", governance: "Governance metriche", definitions: "Definizioni", revenueDef: "Fatture nette registrate, IVA esclusa.", onTimeDef: "Spedizione entro la data confermata.", returnsDef: "Unita rientrate nel periodo.", decisionNote: "Nota decisionale sintetica", close: "Chiudi", signals: "Segnali", checks: "Verifiche suggerite", limitations: "Limiti", boundedNarrative: "I numeri sono calcolati deterministicamente. Il provider scrive solo questa nota vincolata e non puo modificare le metriche.", accessibleTable: "Tabella dati accessibile", sourceRows: "Righe sorgente Orion Works", month: "Mese", cogs: "COGS", next: "Continua", chartLabel: "Linee dei ricavi e del margine lordo per il periodo selezionato", formulaRevenue: "SOMMA del valore netto fatturato", formulaMargin: "ricavi meno costo del venduto, diviso ricavi", formulaDelivery: "ordini puntuali diviso ordini consegnati", formulaReturns: "unita rese diviso unita spedite", error: "Impossibile completare la richiesta.",
    sections: [["Problema", "Report manuali e definizioni incoerenti rendono ogni riunione una discussione sui numeri."], ["Workflow", "Selezione ambito, calcolo isolato, confronto periodo, controllo qualita, tabella accessibile ed export."], ["Architettura", "React, ECharts e calcoli deterministici in Web Worker; gateway provider per la sola narrazione."], ["Decisioni", "Ogni KPI espone formula, periodo e denominatore. Il grafico ha sempre un'alternativa tabellare."], ["Modalita di errore", "Divisione per zero, date mancanti, duplicati e filtri vuoti producono stati espliciti."], ["Test", "Formule, arrotondamento, replay, tabella equivalente, export, tastiera e viewport responsive."], ["Servizio rilevante", "Dashboard, data products e reporting operativo."]]
  },
  en: {
    title: "KPI Studio", lead: "Readable operational numbers, transparent formulas and reproducible comparisons.", revenue: "Revenue", margin: "Gross margin", delivery: "On-time delivery", returns: "Returns", narrative: "Generate decision note", export: "Export CSV", contact: "Build useful reporting", back: "Back to Creation Lab", period: "Period", last3: "Last 3 months", last6: "Last 6 months", provider: "Simulated provider", calculation: "Calculation", worker: "Web Worker", fallback: "local fallback", calculating: "calculating", scope: "Data scope", scopes: { all: "All", italy: "Italy", export: "Export" }, noBaseline: "no baseline", vsPrior: "vs prior period", above: "above", below: "below", target: "target", guardrail: "guardrail", primary: "Primary analysis", trend: "Revenue and margin trend", decision: "Decision support", scenario: "Scenario", growth: "Next-period growth", projected: "Next-period revenue", notForecast: "transparent linear scenario, not a forecast", dataContract: "Data contract", quality: "Quality checks", passed: "passed", review: "review", rows: "Rows", missing: "Missing", duplicates: "Duplicates", refreshed: "Refreshed", governance: "Metric governance", definitions: "Definitions", revenueDef: "Posted net invoices, excluding VAT.", onTimeDef: "Dispatch on or before confirmed date.", returnsDef: "Units received back within the period.", decisionNote: "Synthetic decision note", close: "Close", signals: "Signals", checks: "Suggested checks", limitations: "Limitations", boundedNarrative: "Numbers are calculated deterministically. The provider only writes this bounded narrative and cannot alter metrics.", accessibleTable: "Accessible data table", sourceRows: "Orion Works KPI source rows", month: "Month", cogs: "COGS", next: "Next", chartLabel: "Revenue and gross-margin lines for the selected period", formulaRevenue: "SUM of net invoice value", formulaMargin: "revenue minus cost of goods, divided by revenue", formulaDelivery: "on-time orders divided by delivered orders", formulaReturns: "returned units divided by shipped units", error: "The request could not be completed.",
    sections: [["Problem", "Manual reports and inconsistent definitions turn every meeting into a debate about the numbers."], ["Workflow", "Select scope, isolated calculation, period comparison, quality checks, accessible table and export."], ["Architecture", "React, ECharts and deterministic Web Worker calculations; provider gateway for narrative only."], ["Decisions", "Every KPI exposes formula, period and denominator. Every chart has a table alternative."], ["Failure modes", "Division by zero, missing dates, duplicates and empty filters produce explicit states."], ["Tests", "Formulas, rounding, replay, equivalent table, export, keyboard and responsive viewports."], ["Relevant service", "Dashboards, data products and operational reporting."]]
  }
};

function TrendChart({ rows, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const chart = echarts.init(ref.current);
    chart.setOption({
      animation: !reduceMotion,
      animationDuration: reduceMotion ? 0 : 420,
      grid: { left: 48, right: 48, top: 30, bottom: 38 },
      xAxis: { type: "category", data: rows.map((item) => item.month) },
      yAxis: [{ type: "value", name: "EUR k" }, { type: "value", name: "%", min: 30, max: 45 }],
      tooltip: { trigger: "axis" },
      series: [
        { name: "Revenue", type: "line", data: rows.map((item) => item.revenue), symbolSize: 7, lineStyle: { width: 3, color: "#259fb1" }, itemStyle: { color: "#259fb1" }, areaStyle: { color: "rgba(37,159,177,.12)" } },
        { name: "Gross margin", type: "line", yAxisIndex: 1, data: rows.map((item) => ((item.revenue - item.cogs) / item.revenue * 100).toFixed(1)), symbolSize: 7, lineStyle: { width: 3, color: "#ec5f3c" }, itemStyle: { color: "#ec5f3c" }, markLine: { silent: true, symbol: "none", data: [{ yAxis: 36, label: { formatter: "36% guardrail" } }] } }
      ]
    });
    const resize = () => chart.resize();
    addEventListener("resize", resize);
    return () => { removeEventListener("resize", resize); chart.dispose(); };
  }, [rows]);
  return <div ref={ref} className="chart" role="img" aria-label={label} />;
}

function App() {
  const language = getLanguage();
  const text = copy[language];
  const [scope, setScope] = useState("all");
  const [months, setMonths] = useState(6);
  const [result, setResult] = useState(() => calculateKpis(records, scope, months));
  const [provider, setProvider] = useState(getPreferredProvider());
  const [providers, setProviders] = useState([]);
  const [narrative, setNarrative] = useState(null);
  const [scenario, setScenario] = useState(8);
  const [workerState, setWorkerState] = useState("ready");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  setDocumentLanguage(language, {
    title: text.title + " | Creation Lab",
    description: text.lead,
    path: "/portfolio/kpi-studio/",
    image: "/assets/portfolio/kpi-studio.jpg",
    imageAlt: text.title + " / cosmosXmachina Creation Lab"
  });

  useEffect(() => {
    getProviders()
      .then((value) => setProviders(value.providers.filter((item) => item.selectable)))
      .catch((failure) => setError(errorText(failure, language, text.error)));
  }, [language, text.error]);

  useEffect(() => {
    setWorkerState("calculating");
    setNarrative(null);
    setError("");
    if (typeof Worker === "undefined") {
      setResult(calculateKpis(records, scope, months));
      setWorkerState("fallback");
      return;
    }
    const worker = new Worker(new URL("./kpi-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (event) => { setResult(event.data); setWorkerState("ready"); worker.terminate(); };
    worker.onerror = () => { setResult(calculateKpis(records, scope, months)); setWorkerState("fallback"); worker.terminate(); };
    worker.postMessage({ records, scope, months });
    return () => worker.terminate();
  }, [scope, months]);

  const metrics = result.metrics;
  const rows = result.selected;
  const formulas = language === "it"
    ? ["SOMMA(valore netto fatturato)", "(ricavi - COGS) / ricavi", "ordini puntuali / ordini consegnati", "unita rese / unita spedite"]
    : ["SUM(net invoice value)", "(revenue - COGS) / revenue", "on-time orders / delivered", "returned units / shipped"];
  const projection = useMemo(() => Math.round((rows.at(-1)?.revenue || 0) * (1 + scenario / 100)), [rows, scenario]);
  function chooseProvider(value) { setProvider(value); setPreferredProvider(value); }

  async function generateNarrative() {
    setLoading(true);
    setError("");
    try {
      const payload = await runAction("kpi-studio", "brief", { scope, months, metrics, quality: result.quality, scenarioGrowth: scenario, language }, provider);
      setNarrative(payload.result.execution);
    } catch (failure) {
      setError(errorText(failure, language, text.error));
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const lines = ["month,revenue_eur_k,cogs_eur_k,on_time,delivered,returned,shipped", ...rows.map((item) => [item.month, item.revenue, item.cogs, item.onTime, item.delivered, item.returned, item.shipped].join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `orion-kpis-${scope}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return <><header className="topbar"><a href={withLanguage("/portfolio/", language)}>{text.back}</a><b>ORION / REPORTING / 06</b><span>{modeLabel(language)}</span></header><main>
    <section className="title"><div><p>ANALYTICS WORKSPACE / 06</p><h1>{text.title}</h1><h2>{text.lead}</h2><small>{disclosure(language)}</small></div><div className="controls"><label>{text.period}<select value={months} onChange={(event) => setMonths(Number(event.target.value))}><option value="3">{text.last3}</option><option value="6">{text.last6}</option></select></label><label>{text.provider}<select value={provider} onChange={(event) => chooseProvider(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.label} / {language === "it" ? "simulato" : "simulated"}</option>)}</select></label><span>{text.calculation}: {workerState === "ready" ? text.worker : workerState === "fallback" ? text.fallback : text.calculating}</span></div><div className="filter" role="group" aria-label={text.scope}>{Object.entries(text.scopes).map(([value, label]) => <button aria-pressed={scope === value} className={scope === value ? "active" : ""} onClick={() => setScope(value)} key={value}>{label}</button>)}</div></section>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="metrics"><article><div><span>{text.revenue}</span><button title={text.formulaRevenue} aria-label={text.formulaRevenue}>i</button></div><strong>EUR {metrics.revenue}k</strong><small>{formulas[0]}</small><em className="positive">{metrics.revenueDelta === null ? text.noBaseline : `${metrics.revenueDelta >= 0 ? "+" : ""}${formatPercent(metrics.revenueDelta)} ${text.vsPrior}`}</em></article><article><div><span>{text.margin}</span><button title={text.formulaMargin} aria-label={text.formulaMargin}>i</button></div><strong>{formatPercent(metrics.margin)}</strong><small>{formulas[1]}</small><em className={metrics.margin >= 36 ? "positive" : "negative"}>{metrics.margin >= 36 ? text.above : text.below} 36% {text.guardrail}</em></article><article><div><span>{text.delivery}</span><button title={text.formulaDelivery} aria-label={text.formulaDelivery}>i</button></div><strong>{formatPercent(metrics.delivery)}</strong><small>{formulas[2]}</small><em className="positive">{text.target} 92%</em></article><article><div><span>{text.returns}</span><button title={text.formulaReturns} aria-label={text.formulaReturns}>i</button></div><strong>{formatPercent(metrics.returns)}</strong><small>{formulas[3]}</small><em className={metrics.returns <= 2 ? "positive" : "negative"}>{text.guardrail} &lt; 2%</em></article></section>
    <section className="analysis"><div><div className="panel-head"><div><span>{text.primary}</span><h2>{text.trend}</h2></div><div className="chart-key"><span><i />{text.revenue}</span><span><i />{text.margin}</span><em>{rows[0]?.month} - {rows.at(-1)?.month}</em></div></div><TrendChart rows={rows} label={text.chartLabel} /></div><aside><div className="panel-head"><div><span>{text.decision}</span><h2>{text.scenario}</h2></div></div><label>{text.growth} <strong>{scenario}%</strong><input type="range" min="-10" max="25" step="1" value={scenario} onChange={(event) => setScenario(Number(event.target.value))} /></label><div className="projection"><span>{text.projected}</span><strong>EUR {projection}k</strong><small>{text.notForecast}</small></div><button onClick={generateNarrative} disabled={loading}>{text.narrative}</button></aside></section>
    <section className="data-band"><article><div className="panel-head"><div><span>{text.dataContract}</span><h2>{text.quality}</h2></div><strong>{result.quality.missingValues || result.quality.duplicates ? text.review : text.passed}</strong></div><dl><div><dt>{text.rows}</dt><dd>{result.quality.records}</dd></div><div><dt>{text.missing}</dt><dd>{result.quality.missingValues}</dd></div><div><dt>{text.duplicates}</dt><dd>{result.quality.duplicates}</dd></div><div><dt>{text.refreshed}</dt><dd>19 Jul / 08:30</dd></div></dl></article><article><div className="panel-head"><div><span>{text.governance}</span><h2>{text.definitions}</h2></div><strong>v1.4</strong></div><ul><li><strong>{text.revenue}</strong><span>{text.revenueDef}</span></li><li><strong>{text.delivery}</strong><span>{text.onTimeDef}</span></li><li><strong>{text.returns}</strong><span>{text.returnsDef}</span></li></ul></article></section>
    {narrative && <section className="narrative"><div className="narrative-head"><div><span>{text.decisionNote} / {narrative.trace?.targetProvider}</span><h2>{narrative.output.summary}</h2></div><button onClick={() => setNarrative(null)}>{text.close}</button></div><div><section><h3>{text.signals}</h3><ul>{narrative.output.signals.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>{text.checks}</h3><ol>{narrative.output.actions.map((item) => <li key={item}>{item}</li>)}</ol></section><section><h3>{text.limitations}</h3><ul>{narrative.output.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section></div><p>{text.boundedNarrative}</p></section>}
    <details className="table-panel"><summary>{text.accessibleTable} <span>{rows.length} {text.rows.toLowerCase()}</span></summary><div><button onClick={exportCsv}>{text.export}</button><table><caption>{text.sourceRows}: {text.scopes[scope]}, {months} {language === "it" ? "mesi" : "months"}</caption><thead><tr><th>{text.month}</th><th>{text.revenue} (EUR k)</th><th>{text.cogs} (EUR k)</th><th>{text.margin}</th><th>{text.delivery}</th><th>{text.returns}</th></tr></thead><tbody>{rows.map((item) => <tr key={item.month}><td>{item.month}</td><td>{item.revenue}</td><td>{item.cogs}</td><td>{formatPercent((item.revenue - item.cogs) / item.revenue * 100)}</td><td>{item.onTime} / {item.delivered}</td><td>{item.returned} / {item.shipped}</td></tr>)}</tbody></table></div></details>
    <section className="evidence">{text.sections.map(([heading, body]) => <article key={heading}><h2>{heading}</h2><p>{body}</p></article>)}</section><button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} {text.next}</button>
  </main></>;
}

createRoot(document.getElementById("root")).render(<App />);
