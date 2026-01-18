import { describe, it, expect } from "vitest";
import { SingleTenantResolver } from "../single-tenant.resolver";
import { TenantMismatchError } from "../errors";

describe("SingleTenantResolver", () => {
  const resolver = new SingleTenantResolver("default_tenant", "default_workspace");

  it("returns default tenant when no header", async () => {
    const res = await resolver.resolve({ headers: {} } as any);
    expect(res.tenantId).toBe("default_tenant");
    expect(res.source).toBe("default");
  });

  it("accepts matching header", async () => {
    const res = await resolver.resolve({
      headers: { "x-tenant-id": "default_tenant" },
    } as any);
    expect(res.tenantId).toBe("default_tenant");
    expect(res.source).toBe("header");
  });

  it("rejects mismatched header", async () => {
    await expect(
      resolver.resolve({ headers: { "x-tenant-id": "other" } } as any)
    ).rejects.toBeInstanceOf(TenantMismatchError);
  });
});
