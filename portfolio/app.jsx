import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { demos } from "./shared/catalog.js";
import { disclosure } from "./shared/disclosure.js";
import { getLanguage, setDocumentLanguage, withLanguage } from "./shared/i18n.js";
import "./style.css";

const copy = {
  it: {
    title: "Creation Lab",
    eyebrow: "cosmosXmachina / portfolio pubblico",
    lead: "Dieci sistemi ispezionabili per trasformare problemi operativi ambigui in workflow, decisioni e prove verificabili.",
    all: "Tutti",
    commercial: "Impatto commerciale",
    technical: "Profondita tecnica",
    open: "Apri il sistema",
    home: "Torna al sito",
    note: "Ogni demo ha una propria identita professionale. Condivide solo dati sintetici, contratti e criteri di sicurezza.",
    footer: "Progettato e costruito da Vash, Davide Deon."
  },
  en: {
    title: "Creation Lab",
    eyebrow: "cosmosXmachina / public portfolio",
    lead: "Ten inspectable systems that turn ambiguous operational problems into workflows, decisions and verifiable evidence.",
    all: "All",
    commercial: "Commercial impact",
    technical: "Technical depth",
    open: "Open system",
    home: "Back to site",
    note: "Every demo has its own professional identity. Only synthetic data, contracts and safety criteria are shared.",
    footer: "Designed and built by Vash, Davide Deon."
  }
};

function App() {
  const initialLanguage = getLanguage();
  const [language, setLanguage] = useState(initialLanguage);
  const [filter, setFilter] = useState("all");
  const text = copy[language];
  setDocumentLanguage(language, "Creation Lab | cosmosXmachina");

  const visible = useMemo(() => {
    if (filter === "all") return demos;
    if (filter === "commercial") return demos.filter((demo) => [1, 2, 4, 5, 6, 9].includes(demo.rank));
    return demos.filter((demo) => [1, 2, 3, 7, 8, 10].includes(demo.rank));
  }, [filter]);

  function changeLanguage(next) {
    localStorage.setItem("cosmos-lang", next);
    setLanguage(next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    history.replaceState({}, "", url);
  }

  return (
    <>
      <header className="lab-header">
        <a className="brand" href={withLanguage("/", language)} aria-label={text.home}>
          <img src="/assets/cxm-logo.svg" alt="" />
          <span>cosmosXmachina</span>
        </a>
        <div className="language" role="group" aria-label="Language">
          <button className={language === "it" ? "active" : ""} onClick={() => changeLanguage("it")}>IT</button>
          <button className={language === "en" ? "active" : ""} onClick={() => changeLanguage("en")}>EN</button>
        </div>
      </header>

      <main>
        <section className="intro">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="lead">{text.lead}</p>
          <p className="disclosure">{disclosure(language)}</p>
        </section>

        <section className="catalog" aria-labelledby="systems-title">
          <div className="catalog-head">
            <h2 id="systems-title">{language === "en" ? "Published systems" : "Sistemi pubblicati"}</h2>
            <div className="filters" role="group" aria-label={language === "en" ? "Filter demonstrations" : "Filtra dimostrazioni"}>
              {[
                ["all", text.all],
                ["commercial", text.commercial],
                ["technical", text.technical]
              ].map(([value, label]) => (
                <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="demo-grid">
            {visible.map((demo) => (
              <article className={"demo-card tone-" + demo.tone} key={demo.slug}>
                <div className="rank" aria-hidden="true">{String(demo.rank).padStart(2, "0")}</div>
                <p className="service">{demo.service[language]}</p>
                <h3>{demo.title[language]}</h3>
                <p>{demo.summary[language]}</p>
                <a href={withLanguage("/portfolio/" + demo.slug + "/", language)}>
                  {text.open}<span aria-hidden="true"> Next</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="manifesto">
          <p>{text.note}</p>
          <a href={withLanguage("/", language)}>{text.home}</a>
        </section>
      </main>

      <footer>{text.footer}</footer>
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
