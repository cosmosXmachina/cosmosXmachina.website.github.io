import { allowedProviderIds, providerConfig, publicProviderCatalog } from "./catalog.mjs";
import { LiveAIProvider } from "./adapters.mjs";
import { taskDefinition } from "./tasks.mjs";
import { FixtureAIProvider } from "../lab/fixture-provider.mjs";
import { AppError } from "../errors.mjs";
import { validateSchema } from "./schema-validator.mjs";

export class AIGateway {
  constructor(environment, { fetchImpl = globalThis.fetch } = {}) {
    this.environment = environment;
    this.mode = String(environment.AI_MODE || "fixture").toLowerCase();
    if (!["fixture", "live"].includes(this.mode)) throw new Error("AI_MODE must be fixture or live");
    if (this.mode === "live" && String(environment.AI_LIVE_ENABLED).toLowerCase() !== "true") {
      throw new AppError("LIVE_AI_DISABLED", "Live AI mode requires the explicit AI_LIVE_ENABLED safety switch.", { status: 503 });
    }
    this.allowed = allowedProviderIds(environment);
    this.defaultProvider = String(environment.AI_DEFAULT_PROVIDER || this.allowed[0]).toLowerCase();
    if (!this.allowed.includes(this.defaultProvider)) throw new Error("AI_DEFAULT_PROVIDER must be allowed");
    this.fixture = new FixtureAIProvider();
    this.fetchImpl = fetchImpl;
  }

  providers() {
    return publicProviderCatalog(this.environment, this.mode);
  }

  async execute({ provider, task, context = {}, input = {} }) {
    const selected = String(provider || this.defaultProvider).toLowerCase();
    if (!this.allowed.includes(selected)) throw new Error("AI provider is not allowed");
    const definition = taskDefinition(task);
    const request = {
      task,
      description: definition.description,
      schema: definition.schema,
      schemaId: definition.id,
      context,
      input
    };

    if (this.mode === "fixture") {
      const result = await this.fixture.execute({ ...request, targetProvider: selected });
      validateSchema(result.output, definition.schema);
      result.trace.model = providerConfig(this.environment, selected).model;
      return result;
    }
    const result = await new LiveAIProvider(selected, this.environment, this.fetchImpl).execute(request);
    validateSchema(result.output, definition.schema);
    return result;
  }
}
