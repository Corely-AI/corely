import { HEADER_TENANT_ID, HEADER_WORKSPACE_ID } from "../request-context";
import type { ContextAwareRequest } from "../request-context/request-context.types";
import { TenantMismatchError, TenantNotResolvedError } from "./errors";
import type { TenantResolver, TenantResolution } from "./tenancy.types";

const pickHeader = (req: ContextAwareRequest, names: string[]): string | undefined => {
  for (const name of names) {
    const value = req.headers?.[name];
    if (Array.isArray(value)) {
      const first = value.find((v) => typeof v === "string" && v.length > 0);
      if (first) {
        return first;
      }
      continue;
    }
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
};

/**
 * OSS-only resolver that always returns the configured default tenant id.
 * Rejects mismatched inbound headers to prevent accidental cross-tenant leakage.
 */
export class SingleTenantResolver implements TenantResolver {
  constructor(private readonly defaultTenantId: string) {}

  async resolve(req: ContextAwareRequest): Promise<TenantResolution> {
    if (!this.defaultTenantId) {
      throw new TenantNotResolvedError("DEFAULT_TENANT_ID is not configured");
    }

    const headerTenant = pickHeader(req, [HEADER_WORKSPACE_ID, HEADER_TENANT_ID]);
    if (headerTenant && headerTenant !== this.defaultTenantId) {
      throw new TenantMismatchError(this.defaultTenantId, headerTenant);
    }

    return {
      tenantId: headerTenant ?? this.defaultTenantId,
      source: headerTenant ? "header" : "default",
      edition: "oss",
    };
  }
}
