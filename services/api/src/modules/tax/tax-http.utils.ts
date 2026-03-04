import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import type { Result } from "@corely/kernel";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@corely/kernel";
import { toUseCaseContext } from "../../shared/request-context";
import type { UseCaseContext } from "./application/use-cases/use-case-context";

export function unwrap<T>(result: Result<T, unknown>): T {
  if ("error" in result) {
    const error = result.error;
    if (error instanceof ConflictError) {
      throw new ConflictException(error.message);
    }
    if (error instanceof NotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof ValidationError) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof ForbiddenError) {
      throw new ForbiddenException(error.message);
    }
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedException(error.message);
    }
    throw new InternalServerErrorException(
      error instanceof Error ? error.message : "Unexpected tax module error"
    );
  }
  return result.value;
}

export function unwrapWithProblemCode<T>(result: Result<T, unknown>): T {
  if ("error" in result) {
    const error = result.error;
    if (error instanceof ConflictError) {
      throw new ConflictException({ message: error.message, code: error.code });
    }
    if (error instanceof NotFoundError) {
      throw new NotFoundException({ message: error.message, code: error.code });
    }
    if (error instanceof ValidationError) {
      throw new BadRequestException({ message: error.message, code: error.code });
    }
    if (error instanceof ForbiddenError) {
      throw new ForbiddenException({ message: error.message, code: error.code });
    }
    if (error instanceof UnauthorizedError) {
      throw new UnauthorizedException({ message: error.message, code: error.code });
    }
    throw new InternalServerErrorException({
      message: error instanceof Error ? error.message : "Unexpected tax module error",
      code: "Common:UnexpectedError",
    });
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
