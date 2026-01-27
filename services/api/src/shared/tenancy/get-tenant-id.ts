import type { ContextAwareRequest } from "../request-context/request-context.types";

export const getTenantId = (req: ContextAwareRequest): string | undefined => {
  return req.tenantId ?? req.context?.tenantId ?? req.user?.tenantId ?? undefined;
};
