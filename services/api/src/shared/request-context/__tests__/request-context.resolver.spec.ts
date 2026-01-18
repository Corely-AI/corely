import { resolveRequestContext } from "../request-context.resolver";
import {
  HEADER_REQUEST_ID,
  HEADER_TENANT_ID,
  HEADER_WORKSPACE_ID,
} from "../request-context.headers";
import type { ContextAwareRequest } from "../request-context.types";

const buildReq = (overrides: Partial<ContextAwareRequest> = {}): ContextAwareRequest => {
  return {
    headers: {},
    params: {},
    ...overrides,
  } as ContextAwareRequest;
};

describe("resolveRequestContext", () => {
  it("prefers user principal over headers for tenant", () => {
    const req = buildReq({
      headers: {
        [HEADER_TENANT_ID]: "tenant_default",
      },
      user: { userId: "auth-user", tenantId: "tenant_default" },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.tenantId).toBe("tenant_default");
  });

  it("prefers workspace header over route param", () => {
    const req = buildReq({
      params: { workspaceId: "tenant_default" },
      headers: { [HEADER_WORKSPACE_ID]: "tenant_default" },
      user: { userId: "u1", tenantId: "tenant_default" },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.workspaceId).toBe("tenant_default");
    expect(ctx.sources.workspaceId).toBe("header");
  });

  it("falls back to request-id header and generates when missing", () => {
    const withHeader = buildReq({
      headers: { [HEADER_REQUEST_ID]: "req-123" },
    });
    const ctxWithHeader = resolveRequestContext(withHeader);
    expect(ctxWithHeader.requestId).toBe("req-123");
    expect(ctxWithHeader.sources.requestId).toBe("header");

    const ctxGenerated = resolveRequestContext(buildReq());
    expect(ctxGenerated.requestId).toBeDefined();
    expect(ctxGenerated.sources.requestId).toBe("generated");
  });

  it("allows legacy user header only when explicitly enabled", () => {
    const req = buildReq({
      headers: {},
    });

    const ctx = resolveRequestContext(req);
    expect(ctx.userId).toBeUndefined();
  });
});
