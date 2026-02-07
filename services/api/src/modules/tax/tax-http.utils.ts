import { BadRequestException } from "@nestjs/common";
import type { Request } from "express";
import type { Result } from "@corely/kernel";
import { toUseCaseContext } from "../../shared/request-context";
import type { UseCaseContext } from "./application/use-cases/use-case-context";

export function unwrap<T>(result: Result<T, unknown>): T {
  if ("error" in result) {
    throw result.error;
  }
  return result.value;
}

export function buildTaxUseCaseContext(req: Request): UseCaseContext {
  const ctx = toUseCaseContext(req as any);

  if (!ctx.tenantId) {
    throw new BadRequestException("Missing tenantId in request context");
  }
  if (!ctx.userId) {
    throw new BadRequestException("Missing userId in request context");
  }
  if (!ctx.workspaceId) {
    throw new BadRequestException("Missing workspaceId in request context");
  }
  if (ctx.tenantId === "default-tenant") {
    throw new BadRequestException("Invalid tenantId in request context");
  }

  return {
    tenantId: ctx.tenantId,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    correlationId: ctx.correlationId,
    idempotencyKey: req.headers["x-idempotency-key"] as string | undefined,
  };
}
