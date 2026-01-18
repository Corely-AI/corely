import { describe, it, expect } from "vitest";
import { SingleTenantResolver } from "../single-tenant.resolver";
import { TenantMismatchError } from "../errors";

describe("SingleTenantResolver", () => {
  const resolver = new SingleTenantResolver("tenant_default");

  it("returns default tenant when no header", async () => {
    const res = await resolver.resolve({ headers: {} } as any);
    expect(res.tenantId).toBe("tenant_default");
    expect(res.source).toBe("default");
  });

  it("accepts matching header", async () => {
    const res = await resolver.resolve({
      headers: { "x-tenant-id": "tenant_default" },
    } as any);
    expect(res.tenantId).toBe("tenant_default");
    expect(res.source).toBe("header");
  });

  it("rejects mismatched header", async () => {
    await expect(
      resolver.resolve({ headers: { "x-tenant-id": "other" } } as any)
    ).rejects.toBeInstanceOf(TenantMismatchError);
  });
});
