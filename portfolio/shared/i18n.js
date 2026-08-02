const SUPPORTED = new Set(["it", "en"]);

export function getLanguage() {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (SUPPORTED.has(query)) {
    localStorage.setItem("cosmos-lang", query);
    return query;
  }

  const saved = localStorage.getItem("cosmos-lang");
  if (SUPPORTED.has(saved)) return saved;

  const browser = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
  return browser.startsWith("en") ? "en" : "it";
}

const ERROR_COPY = {
  it: {
    ACTION_NOT_FOUND: "Questa azione non e disponibile.", DEMO_NOT_FOUND: "Questa dimostrazione non e disponibile.",
    HOSTILE_INPUT: "Il contenuto inserito non e accettato.", INPUT_INVALID: "Controlla i dati inseriti e riprova.",
    IDEMPOTENCY_CONFLICT: "La stessa richiesta e stata riutilizzata con dati diversi.", PIPELINE_FAILED: "La pipeline ha rifiutato la richiesta.",
    PIPELINE_UNAVAILABLE: "La pipeline deterministica non e disponibile. Riprova tra poco.", PROVIDER_OUTPUT_INVALID: "Il provider ha restituito un risultato non valido.",
    PROVIDER_REQUEST_FAILED: "Il provider simulato non ha completato la richiesta.", PROVIDER_UNAVAILABLE: "Il provider non e disponibile. Riprova tra poco.",
    QUOTA_EXCEEDED: "Il limite della sessione e stato raggiunto. Ricarica la pagina per iniziare una nuova sessione.", RATE_LIMITED: "Troppe richieste. Attendi e riprova.",
    REQUEST_TOO_LARGE: "La richiesta supera il limite della dimostrazione.", ROLE_FORBIDDEN: "Il ruolo selezionato non puo eseguire questa azione.",
    ROLE_MISMATCH: "Il ruolo non corrisponde alla sessione attiva.", SERVICE_UNAVAILABLE: "Il servizio Creation Lab non e disponibile.",
    SESSION_EXPIRED: "La sessione e scaduta. Riprova per crearne una nuova.", SESSION_INVALID: "La sessione non e valida. Riprova.",
    STATE_TRANSITION_INVALID: "Questa transizione non e consentita dallo stato corrente."
  },
  en: {
    ACTION_NOT_FOUND: "This action is unavailable.", DEMO_NOT_FOUND: "This demonstration is unavailable.",
    HOSTILE_INPUT: "The submitted content is not accepted.", INPUT_INVALID: "Check the submitted data and try again.",
    IDEMPOTENCY_CONFLICT: "The same request was reused with different data.", PIPELINE_FAILED: "The pipeline rejected the request.",
    PIPELINE_UNAVAILABLE: "The deterministic pipeline is unavailable. Try again shortly.", PROVIDER_OUTPUT_INVALID: "The provider returned an invalid result.",
    PROVIDER_REQUEST_FAILED: "The simulated provider could not complete the request.", PROVIDER_UNAVAILABLE: "The provider is unavailable. Try again shortly.",
    QUOTA_EXCEEDED: "The session limit has been reached. Reload to begin a new session.", RATE_LIMITED: "Too many requests. Wait and try again.",
    REQUEST_TOO_LARGE: "The request exceeds the demonstration limit.", ROLE_FORBIDDEN: "The selected role cannot perform this action.",
    ROLE_MISMATCH: "The role does not match the active session.", SERVICE_UNAVAILABLE: "The Creation Lab service is unavailable.",
    SESSION_EXPIRED: "The session expired. Try again to create a new one.", SESSION_INVALID: "The session is invalid. Try again.",
    STATE_TRANSITION_INVALID: "This transition is not allowed from the current state."
  }
};

export function errorText(error, language, fallback) {
  return ERROR_COPY[language]?.[error?.code] || fallback || ERROR_COPY[language]?.SERVICE_UNAVAILABLE;
}

export function withLanguage(path, language) {
  const separator = path.includes("?") ? "&" : "?";
  return path + separator + "lang=" + language;
}

export function setDocumentLanguage(language, title) {
  document.documentElement.lang = language;
  document.title = title;
}
