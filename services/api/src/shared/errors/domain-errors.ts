export class DomainError extends Error {
  readonly code: string;
  constructor(message: string, code = "domain_error") {
    super(message);
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, "validation_error");
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super(message, "unauthorized");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, "forbidden");
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Not Found") {
    super(message, "not_found");
  }
}

export class ConflictError extends DomainError {
  constructor(message = "Conflict") {
    super(message, "conflict");
  }
}

export const mapErrorToHttp = (err: unknown): { status: number; body: any } => {
  if (err instanceof ValidationError) {
    return { status: 400, body: { error: err.code, message: err.message } };
  }
  if (err instanceof UnauthorizedError) {
    return { status: 401, body: { error: err.code, message: err.message } };
  }
  if (err instanceof ForbiddenError) {
    return { status: 403, body: { error: err.code, message: err.message } };
  }
  if (err instanceof NotFoundError) {
    return { status: 404, body: { error: err.code, message: err.message } };
  }
  if (err instanceof ConflictError) {
    return { status: 409, body: { error: err.code, message: err.message } };
  }
  if (err instanceof DomainError) {
    return { status: 422, body: { error: err.code, message: err.message } };
  }
  return { status: 500, body: { error: "internal_error", message: "Internal Server Error" } };
};
