import { describe, it, expect } from "vitest";
import { InMemoryTenantRoutingService } from "../routing.service";
import { MultiTenantResolver, TenantNotResolvedError } from "../multi-tenant.resolver";

describe("EE MultiTenantResolver", () => {
  const routing = new InMemoryTenantRoutingService(
    new Map([["acme", "tenant-acme"]]),
    new Map([["acme.example.com", "tenant-acme-host"]])
  );
  const resolver = new MultiTenantResolver(routing);

  it("resolves from route slug", async () => {
    const res = await resolver.resolve({
      params: { tenantSlug: "acme" },
      headers: {},
    } as any);
    expect(res.tenantId).toBe("tenant-acme");
    expect(res.source).toBe("route");
    expect(res.edition).toBe("ee");
  });

  it("resolves from host", async () => {
    const res = await resolver.resolve({
      params: {},
      hostname: "acme.example.com",
      headers: {},
    } as any);
    expect(res.tenantId).toBe("tenant-acme-host");
    expect(res.source).toBe("host");
  });

  it("falls back to header when mapping missing", async () => {
    const res = await resolver.resolve({
      params: {},
      headers: { "x-workspace-id": "tenant-header" },
    } as any);
    expect(res.tenantId).toBe("tenant-header");
    expect(res.source).toBe("header");
  });

  it("throws when not resolved", async () => {
    await expect(resolver.resolve({ headers: {}, params: {} } as any)).rejects.toBeInstanceOf(
      TenantNotResolvedError
    );
  });
});
