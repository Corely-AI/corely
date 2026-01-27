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
        [HEADER_TENANT_ID]: "default_tenant",
      },
      user: { userId: "auth-user", tenantId: "default_tenant" },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.tenantId).toBe("default_tenant");
  });

  it("prefers workspace header over route param", () => {
    const req = buildReq({
      params: { workspaceId: "default_workspace" },
      headers: { [HEADER_WORKSPACE_ID]: "default_workspace" },
      user: { userId: "u1", tenantId: "default_tenant" },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.workspaceId).toBe("default_workspace");
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
