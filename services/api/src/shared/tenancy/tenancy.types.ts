import type { ContextAwareRequest } from "../request-context";

export type TenantResolutionSource = "default" | "header" | "route" | "host" | "principal";

export interface TenantResolution {
  tenantId: string;
  source: TenantResolutionSource;
  edition: "oss" | "ee";
}

export interface TenantResolver {
  resolve(req: ContextAwareRequest): Promise<TenantResolution>;
}
