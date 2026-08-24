import { BrowserLabRuntime, LabClientError } from "./browser-runtime.js";

const runtime = new BrowserLabRuntime();
const providerKey = "cosmos-lab-provider";

export { LabClientError };

export function getPreferredProvider() {
  return sessionStorage.getItem(providerKey) || "openai";
}

export function setPreferredProvider(provider) {
  sessionStorage.setItem(providerKey, provider);
}

export function getProviders() {
  return runtime.getProviders();
}

export function runAction(demo, action, input = {}, provider = getPreferredProvider(), options = {}) {
  return runtime.runAction(demo, action, input, provider, options);
}

export function resetSession(role) {
  runtime.reset(role);
}

export const clientInternals = { runtime, browserFixturesEnabled: true, roleFor: BrowserLabRuntime.roleFor };
