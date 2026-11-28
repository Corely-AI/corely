import type { Request } from "express";
import type { RequestPrincipal } from "../../../../shared/request-context";

// Object identity cannot be forged by HTTP headers, body fields or a legacy test bypass.
const principals = new WeakMap<Request, RequestPrincipal>();
export function setSsoSessionPrincipal(request: Request, principal: RequestPrincipal): void {
  principals.set(request, principal);
}
export function getSsoSessionPrincipal(request: Request): RequestPrincipal | undefined {
  return principals.get(request);
}
