/**
 * @corely/api-ee - MultiTenantResolver
 *
 * EE resolver that supports route-based, host-based, and header fallbacks for tenant resolution.
 * Routing is delegated to TenantRoutingService to avoid hard-coded assumptions.
 */

// Define minimal types needed for EE resolver
// NOTE: The canonical types live in services/api/src/shared/tenancy
// We duplicate here to keep EE package self-contained and avoid circular dependencies
export type TenantResolutionSource = "default" | "header" | "route" | "host" | "principal";

export interface TenantResolution {
  tenantId: string;
  source: TenantResolutionSource;
  edition: "oss" | "ee";
}

export interface TenantResolver {
  resolve(req: any): Promise<TenantResolution>;
}

// Re-export the routing service interface so EE consumers have it
export interface TenantRoutingService {
  resolveSlug(slug: string): Promise<string | null>;
  resolveHost(host: string): Promise<string | null>;
}

// Constants for header names
const HEADER_TENANT_ID = "x-tenant-id";
const HEADER_WORKSPACE_ID = "x-workspace-id";

const pickHeader = (req: any, names: string[]): string | undefined => {
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
 * Error thrown when tenant cannot be resolved
 */
export class TenantNotResolvedError extends Error {
  constructor() {
    super("Tenant could not be resolved");
    this.name = "TenantNotResolvedError";
  }
}

export class MultiTenantResolver implements TenantResolver {
  constructor(private readonly routing: TenantRoutingService) {}

  async resolve(req: any): Promise<TenantResolution> {
    // 1. Try route-based resolution (e.g., /t/:tenantSlug)
    const params = (req.params ?? {}) as Record<string, string | undefined>;
    const slug =
      (params as any).tenantSlug ?? (params as any).workspaceId ?? (params as any).tenantId;
    if (slug) {
      const mapped = await this.routing.resolveSlug(slug);
      if (mapped) {
        return { tenantId: mapped, source: "route" as const, edition: "ee" as const };
      }
    }

    // 2. Try host-based resolution (e.g., acme.example.com)
    const host = typeof req.hostname === "string" ? req.hostname : undefined;
    if (host) {
      const mapped = await this.routing.resolveHost(host);
      if (mapped) {
        return { tenantId: mapped, source: "host" as const, edition: "ee" as const };
      }
    }

    // 3. Try header-based resolution (fallback)
    const headerTenant = pickHeader(req, [HEADER_WORKSPACE_ID, HEADER_TENANT_ID]);
    if (headerTenant) {
      return { tenantId: headerTenant, source: "header" as const, edition: "ee" as const };
    }

    throw new TenantNotResolvedError();
  }
}
