import { Result, UseCaseContext, UseCaseError, isErr } from "@kerniflow/kernel";
import { Request } from "express";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";

export const buildUseCaseContext = (req: Request): UseCaseContext => ({
  tenantId:
    ((req as any).tenantId as string | undefined) ||
    (req.headers["x-tenant-id"] as string | undefined),
  userId:
    ((req as any).user?.userId as string | undefined) ||
    ((req as any).user?.id as string | undefined),
  correlationId:
    (req.headers["x-correlation-id"] as string | undefined) ||
    (req.headers["x-request-id"] as string | undefined),
  requestId: (req.headers["x-request-id"] as string | undefined) ?? undefined,
});

export const mapResultToHttp = <T>(result: Result<T, UseCaseError>): T => {
  if (isErr(result)) {
    throw toHttpException(result.error);
  }
  return result.value;
};
