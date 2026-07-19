const SUPPORTED = new Set(["it", "en"]);

export function getLanguage() {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (SUPPORTED.has(query)) {
    localStorage.setItem("cosmos-lang", query);
    return query;
  }

  const saved = localStorage.getItem("cosmos-lang");
  if (SUPPORTED.has(saved)) return saved;

  const browser = (navigator.language || "").toLowerCase();
  return browser.startsWith("en") ? "en" : "it";
}

export function withLanguage(path, language) {
  const separator = path.includes("?") ? "&" : "?";
  return path + separator + "lang=" + language;
}

export function setDocumentLanguage(language, title) {
  document.documentElement.lang = language;
  document.title = title;
}
