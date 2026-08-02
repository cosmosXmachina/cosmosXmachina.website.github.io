import { AppError } from "../errors.mjs";

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function fail(path, message) {
  throw new AppError("PROVIDER_OUTPUT_INVALID", `Provider output ${path} ${message}.`, {
    status: 502,
    retryable: false
  });
}

export function validateSchema(value, schema, path = "$") {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (schema.type && !types.some((type) => matchesType(value, type))) {
    fail(path, `must be ${types.join(" or ")}`);
  }
  if (schema.enum && !schema.enum.includes(value)) fail(path, "contains an unsupported value");

  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) fail(path, "is too short");
    if (schema.maxLength != null && value.length > schema.maxLength) fail(path, "is too long");
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail(path, "has an invalid format");
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) fail(path, "is below its minimum");
    if (schema.maximum != null && value > schema.maximum) fail(path, "is above its maximum");
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) fail(path, "has too few items");
    if (schema.maxItems != null && value.length > schema.maxItems) fail(path, "has too many items");
    if (schema.items) value.forEach((item, index) => validateSchema(item, schema.items, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required || []) {
      if (!(required in value)) fail(`${path}.${required}`, "is required");
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!schema.properties?.[key]) fail(`${path}.${key}`, "is not allowed");
      }
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (key in value) validateSchema(value[key], child, `${path}.${key}`);
    }
  }
  return value;
}
