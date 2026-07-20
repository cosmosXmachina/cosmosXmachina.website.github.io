const PROVIDERS = {
  openai: {
    label: "OpenAI",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-5.2",
    endpoint: "https://api.openai.com/v1/responses"
  },
  google: {
    label: "Google Gemini",
    keyEnv: "GOOGLE_AI_API_KEY",
    modelEnv: "GOOGLE_AI_MODEL",
    defaultModel: "gemini-3.5-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
  },
  anthropic: {
    label: "Anthropic Claude",
    keyEnv: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_MODEL",
    defaultModel: "claude-sonnet-4-6",
    endpoint: "https://api.anthropic.com/v1/messages"
  },
  xai: {
    label: "xAI Grok",
    keyEnv: "XAI_API_KEY",
    modelEnv: "XAI_MODEL",
    defaultModel: "grok-4.5",
    endpoint: "https://api.x.ai/v1/responses"
  },
  openrouter: {
    label: "OpenRouter",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "openai/gpt-5.2",
    endpoint: "https://openrouter.ai/api/v1/chat/completions"
  }
};

export const providerIds = Object.freeze(Object.keys(PROVIDERS));

export function providerConfig(environment, id) {
  const definition = PROVIDERS[id];
  if (!definition) throw new Error("Unsupported AI provider: " + id);
  return {
    id,
    ...definition,
    model: environment[definition.modelEnv] || definition.defaultModel,
    apiKey: environment[definition.keyEnv] || ""
  };
}

export function allowedProviderIds(environment) {
  const configured = String(environment.AI_ALLOWED_PROVIDERS || providerIds.join(","))
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(configured)];
  if (!unique.length || unique.some((id) => !providerIds.includes(id))) {
    throw new Error("AI_ALLOWED_PROVIDERS contains an unsupported provider");
  }
  return unique;
}

export function publicProviderCatalog(environment, mode) {
  const allowed = new Set(allowedProviderIds(environment));
  return providerIds.map((id) => {
    const config = providerConfig(environment, id);
    return {
      id,
      label: config.label,
      model: config.model,
      selectable: allowed.has(id),
      simulated: mode === "fixture",
      liveReady: mode === "live" && allowed.has(id) && Boolean(config.apiKey)
    };
  });
}
