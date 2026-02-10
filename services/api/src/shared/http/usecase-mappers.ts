import { type Result, type UseCaseError, isErr, type LoggerPort } from "@corely/kernel";
import { toHttpException } from "./usecase-error.mapper";
import { NestLoggerAdapter } from "../adapters/logger/nest-logger.adapter";
import { HEADER_TENANT_ID, toUseCaseContext } from "../request-context";
import type { ContextAwareRequest } from "../request-context";

const logger: LoggerPort = new NestLoggerAdapter();

export const buildUseCaseContext = (req: ContextAwareRequest) => {
  const ctx = toUseCaseContext(req);

  // Tenant is required for most use cases; log once if absent
  if (ctx.tenantId === undefined) {
    logger.warn("Missing tenantId on request", {
      hasAuthHeader: Boolean(req.headers["authorization"]),
      hasTenantHeader: Boolean(req.headers[HEADER_TENANT_ID]),
      path: req.path,
      method: req.method,
    });
  }

  return ctx;
};

export const mapResultToHttp = <T>(result: Result<T, UseCaseError>): T => {
  if (isErr(result)) {
    throw toHttpException(result.error);
  }
  return result.value;
};

export const resolveIdempotencyKey = (req: ContextAwareRequest): string | undefined => {
  const raw = req.headers?.["idempotency-key"] ?? req.headers?.["x-idempotency-key"];
  if (Array.isArray(raw)) {
    return raw.find((value) => typeof value === "string" && value.length > 0);
  }
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
};
