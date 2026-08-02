export class AppError extends Error {
  constructor(code, message, { status = 400, retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function normalizeError(error) {
  if (error instanceof AppError) return error;
  return new AppError("REQUEST_FAILED", "The request could not be completed.", {
    status: 500,
    retryable: true,
    cause: error
  });
}

export function errorPayload(error, requestId) {
  const normalized = normalizeError(error);
  return {
    ok: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      retryable: normalized.retryable,
      requestId: requestId || null
    }
  };
}
