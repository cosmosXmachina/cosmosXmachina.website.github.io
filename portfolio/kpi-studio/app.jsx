import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { getPreferredProvider, getProviders, runAction, setPreferredProvider } from "../shared/api.js";
import { disclosure, modeLabel } from "../shared/disclosure.js";
import { sendToContact } from "../shared/handoff.js";
import { getLanguage, setDocumentLanguage, withLanguage } from "../shared/i18n.js";
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
  it: { title: "KPI Studio", lead: "Numeri operativi leggibili, formule trasparenti e confronti riproducibili.", revenue: "Ricavi", margin: "Margine lordo", delivery: "Consegne puntuali", returns: "Resi", narrative: "Genera nota decisionale", export: "Esporta CSV", contact: "Costruiamo un reporting utile", sections: [["Problema", "Report manuali e definizioni incoerenti rendono ogni riunione una discussione sui numeri."], ["Workflow", "Selezione ambito, calcolo isolato, confronto periodo, controllo qualita, tabella accessibile ed export."], ["Architettura", "React, ECharts e calcoli deterministici in Web Worker; gateway provider per la sola narrazione."], ["Decisioni", "Ogni KPI espone formula, periodo e denominatore. Il grafico ha sempre un'alternativa tabellare."], ["Failure modes", "Divisione per zero, date mancanti, duplicati e filtri vuoti producono stati espliciti."], ["Test", "Formule, arrotondamento, replay, tabella equivalente, export, tastiera e viewport responsive."], ["Servizio rilevante", "Dashboard, data products e reporting operativo."]]},
  en: { title: "KPI Studio", lead: "Readable operational numbers, transparent formulas and reproducible comparisons.", revenue: "Revenue", margin: "Gross margin", delivery: "On-time delivery", returns: "Returns", narrative: "Generate decision note", export: "Export CSV", contact: "Build useful reporting", sections: [["Problem", "Manual reports and inconsistent definitions turn every meeting into a debate about the numbers."], ["Workflow", "Select scope, isolated calculation, period comparison, quality checks, accessible table and export."], ["Architecture", "React, ECharts and deterministic Web Worker calculations; provider gateway for narrative only."], ["Decisions", "Every KPI exposes formula, period and denominator. Every chart has a table alternative."], ["Failure modes", "Division by zero, missing dates, duplicates and empty filters produce explicit states."], ["Tests", "Formulas, rounding, replay, equivalent table, export, keyboard and responsive viewports."], ["Relevant service", "Dashboards, data products and operational reporting."]]}
};

function TrendChart({ rows }) {
  const ref = useRef(null);
  useEffect(() => {
    const chart = echarts.init(ref.current);
    chart.setOption({ animationDuration: 420, grid: { left: 48, right: 48, top: 30, bottom: 38 }, xAxis: { type: "category", data: rows.map((item) => item.month) }, yAxis: [{ type: "value", name: "EUR k" }, { type: "value", name: "%", min: 30, max: 45 }], tooltip: { trigger: "axis" }, series: [{ name: "Revenue", type: "line", data: rows.map((item) => item.revenue), symbolSize: 7, lineStyle: { width: 3, color: "#259fb1" }, itemStyle: { color: "#259fb1" }, areaStyle: { color: "rgba(37,159,177,.12)" } }, { name: "Gross margin", type: "line", yAxisIndex: 1, data: rows.map((item) => ((item.revenue - item.cogs) / item.revenue * 100).toFixed(1)), symbolSize: 7, lineStyle: { width: 3, color: "#ec5f3c" }, itemStyle: { color: "#ec5f3c" }, markLine: { silent: true, symbol: "none", data: [{ yAxis: 36, label: { formatter: "36% guardrail" } }] } }] });
    const resize = () => chart.resize(); addEventListener("resize", resize); return () => { removeEventListener("resize", resize); chart.dispose(); };
  }, [rows]);
  return <div ref={ref} className="chart" role="img" aria-label="Revenue bars and gross margin line for the selected period" />;
}

function App() {
  const language = getLanguage(); const text = copy[language];
  const [scope, setScope] = useState("all"); const [months, setMonths] = useState(6);
  const [result, setResult] = useState(() => calculateKpis(records, scope, months));
  const [provider, setProvider] = useState(getPreferredProvider()); const [providers, setProviders] = useState([]);
  const [narrative, setNarrative] = useState(null); const [scenario, setScenario] = useState(8); const [workerState, setWorkerState] = useState("ready");
  setDocumentLanguage(language, text.title + " | Creation Lab");

  useEffect(() => { getProviders().then((value) => setProviders(value.providers.filter((item) => item.selectable))); }, []);
  useEffect(() => {
    setWorkerState("calculating"); setNarrative(null);
    if (typeof Worker === "undefined") { setResult(calculateKpis(records, scope, months)); setWorkerState("fallback"); return; }
    const worker = new Worker(new URL("./kpi-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (event) => { setResult(event.data); setWorkerState("ready"); worker.terminate(); };
    worker.onerror = () => { setResult(calculateKpis(records, scope, months)); setWorkerState("fallback"); worker.terminate(); };
    worker.postMessage({ records, scope, months }); return () => worker.terminate();
  }, [scope, months]);

  const metrics = result.metrics; const rows = result.selected;
  const projection = useMemo(() => Math.round(metrics.revenue * (1 + scenario / 100)), [metrics.revenue, scenario]);
  function chooseProvider(value) { setProvider(value); setPreferredProvider(value); }
  async function generateNarrative() {
    const payload = await runAction("kpi-studio", "brief", { scope, months, metrics, quality: result.quality, scenarioGrowth: scenario }, provider);
    setNarrative(payload.result.execution || payload.result);
  }
  function exportCsv() {
    const lines = ["month,revenue_eur_k,cogs_eur_k,on_time,delivered,returned,shipped", ...rows.map((item) => [item.month, item.revenue, item.cogs, item.onTime, item.delivered, item.returned, item.shipped].join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); const link = document.createElement("a"); link.href = url; link.download = "orion-kpis-" + scope + ".csv"; link.click(); URL.revokeObjectURL(url);
  }

  return <><header className="topbar"><a href={withLanguage("/portfolio/", language)}>Back to Creation Lab</a><b>ORION / REPORTING / 06</b><span>{modeLabel(language)}</span></header><main>
    <section className="title"><div><p>ANALYTICS WORKSPACE / 06</p><h1>{text.title}</h1><h2>{text.lead}</h2><small>{disclosure(language)}</small></div><div className="controls"><label>Period<select value={months} onChange={(event) => setMonths(Number(event.target.value))}><option value="3">Last 3 months</option><option value="6">Last 6 months</option></select></label><label>Provider target<select value={provider} onChange={(event) => chooseProvider(event.target.value)}>{providers.map((item) => <option value={item.id} key={item.id}>{item.label} / simulated</option>)}</select></label><span>Calculation: {workerState === "ready" ? "Web Worker" : workerState}</span></div><div className="filter" role="group" aria-label="Data scope">{["all", "italy", "export"].map((value) => <button className={scope === value ? "active" : ""} onClick={() => setScope(value)} key={value}>{value}</button>)}</div></section>
    <section className="metrics"><article><div><span>{text.revenue}</span><button title="SUM of net invoice value">i</button></div><strong>EUR {metrics.revenue}k</strong><small>SUM(net invoice value)</small><em className="positive">{metrics.revenueDelta === null ? "no baseline" : (metrics.revenueDelta >= 0 ? "+" : "") + formatPercent(metrics.revenueDelta)} vs prior</em></article><article><div><span>{text.margin}</span><button title="(revenue minus cost of goods) divided by revenue">i</button></div><strong>{formatPercent(metrics.margin)}</strong><small>(revenue - COGS) / revenue</small><em className={metrics.margin >= 36 ? "positive" : "negative"}>{metrics.margin >= 36 ? "above" : "below"} 36% guardrail</em></article><article><div><span>{text.delivery}</span><button title="On-time orders divided by delivered orders">i</button></div><strong>{formatPercent(metrics.delivery)}</strong><small>on-time orders / delivered</small><em className="positive">target 92%</em></article><article><div><span>{text.returns}</span><button title="Returned units divided by shipped units">i</button></div><strong>{formatPercent(metrics.returns)}</strong><small>returned units / shipped units</small><em className={metrics.returns <= 2 ? "positive" : "negative"}>guardrail &lt; 2%</em></article></section>
    <section className="analysis"><div><div className="panel-head"><div><span>Primary analysis</span><h2>Revenue and margin trend</h2></div><div className="chart-key"><span><i />Revenue</span><span><i />Margin</span><em>{rows[0]?.month} - {rows.at(-1)?.month}</em></div></div><TrendChart rows={rows} /></div><aside><div className="panel-head"><div><span>Decision support</span><h2>Scenario</h2></div></div><label>Next-period growth <strong>{scenario}%</strong><input type="range" min="-10" max="25" step="1" value={scenario} onChange={(event) => setScenario(Number(event.target.value))} /></label><div className="projection"><span>Projected revenue</span><strong>EUR {projection}k</strong><small>transparent linear scenario, not a forecast</small></div><button onClick={generateNarrative}>{text.narrative}</button></aside></section>
    <section className="data-band"><article><div className="panel-head"><div><span>Data contract</span><h2>Quality checks</h2></div><strong>{result.quality.missingValues || result.quality.duplicates ? "review" : "passed"}</strong></div><dl><div><dt>Rows</dt><dd>{result.quality.records}</dd></div><div><dt>Missing</dt><dd>{result.quality.missingValues}</dd></div><div><dt>Duplicates</dt><dd>{result.quality.duplicates}</dd></div><div><dt>Refreshed</dt><dd>19 Jul / 08:30</dd></div></dl></article><article><div className="panel-head"><div><span>Metric governance</span><h2>Definitions</h2></div><strong>v1.4</strong></div><ul><li><strong>Revenue</strong><span>Posted net invoices, excluding VAT.</span></li><li><strong>On time</strong><span>Dispatch on or before confirmed date.</span></li><li><strong>Returns</strong><span>Units received back within period.</span></li></ul></article></section>
    {narrative && <section className="narrative"><div className="narrative-head"><div><span>Synthetic decision note / {narrative.trace?.targetProvider}</span><h2>{narrative.output.summary}</h2></div><button onClick={() => setNarrative(null)}>Close</button></div><div><section><h3>Signals</h3><ul>{narrative.output.signals.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Suggested checks</h3><ol>{narrative.output.actions.map((item) => <li key={item}>{item}</li>)}</ol></section><section><h3>Limitations</h3><ul>{narrative.output.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section></div><p>Numbers are calculated deterministically. The provider only writes this bounded narrative and cannot alter metrics.</p></section>}
    <details className="table-panel"><summary>Accessible data table <span>{rows.length} rows</span></summary><div><button onClick={exportCsv}>{text.export}</button><table><caption>Orion Works KPI source rows for {scope}, last {months} months</caption><thead><tr><th>Month</th><th>Revenue (EUR k)</th><th>COGS (EUR k)</th><th>Gross margin</th><th>On time / delivered</th><th>Returns / shipped</th></tr></thead><tbody>{rows.map((item) => <tr key={item.month}><td>{item.month}</td><td>{item.revenue}</td><td>{item.cogs}</td><td>{formatPercent((item.revenue - item.cogs) / item.revenue * 100)}</td><td>{item.onTime} / {item.delivered}</td><td>{item.returned} / {item.shipped}</td></tr>)}</tbody></table></div></details>
    <section className="evidence">{text.sections.map(([heading, body]) => <article key={heading}><h2>{heading}</h2><p>{body}</p></article>)}</section><button className="contact" onClick={() => sendToContact({ demo: text.title, summary: text.sections[0][1] + " " + text.sections[1][1], language })}>{text.contact} Next</button>
  </main></>;
}

createRoot(document.getElementById("root")).render(<App />);
