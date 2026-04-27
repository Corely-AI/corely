import { resolveRequestContext } from "../request-context.resolver";
import {
  HEADER_CORELY_PROXY_KEY,
  HEADER_CORELY_SURFACE,
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
  const originalProxyEnv = {
    app: process.env.CORELY_PROXY_KEY_APP,
    pos: process.env.CORELY_PROXY_KEY_POS,
    crm: process.env.CORELY_PROXY_KEY_CRM,
  };

  beforeEach(() => {
    process.env.CORELY_PROXY_KEY_APP = "test-app-proxy-key";
    process.env.CORELY_PROXY_KEY_POS = "test-pos-proxy-key";
    process.env.CORELY_PROXY_KEY_CRM = "test-crm-proxy-key";
  });

  afterAll(() => {
    process.env.CORELY_PROXY_KEY_APP = originalProxyEnv.app;
    process.env.CORELY_PROXY_KEY_POS = originalProxyEnv.pos;
    process.env.CORELY_PROXY_KEY_CRM = originalProxyEnv.crm;
  });

  it("prefers user principal over headers for tenant", () => {
    const req = buildReq({
      headers: {
        [HEADER_TENANT_ID]: "header-tenant",
      },
      user: { userId: "auth-user", tenantId: "auth-tenant" },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.tenantId).toBe("auth-tenant");
  });

  it("prefers workspace header over route param", () => {
    const req = buildReq({
      params: { workspaceId: "route-workspace" },
      headers: { [HEADER_WORKSPACE_ID]: "header-workspace" },
      user: { userId: "u1", tenantId: "t1" },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.workspaceId).toBe("header-workspace");
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

  it("maps the app proxy key to the platform surface", () => {
    const req = buildReq({
      headers: {
        [HEADER_CORELY_PROXY_KEY]: "test-app-proxy-key",
      },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.surfaceId).toBe("platform");
    expect(ctx.trustedSurfaceId).toBe("platform");
    expect(ctx.surfaceResolutionSource).toBe("proxy-key");
    expect(ctx.sources.surfaceId).toBe("proxy");
  });

  it("resolves the POS proxy key to the POS surface", () => {
    const req = buildReq({
      headers: {
        [HEADER_CORELY_PROXY_KEY]: "test-pos-proxy-key",
      },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.surfaceId).toBe("pos");
    expect(ctx.trustedSurfaceId).toBe("pos");
    expect(ctx.surfaceResolutionSource).toBe("proxy-key");
  });

  it("resolves the CRM proxy key to the CRM surface", () => {
    const req = buildReq({
      headers: {
        [HEADER_CORELY_PROXY_KEY]: "test-crm-proxy-key",
      },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.surfaceId).toBe("crm");
    expect(ctx.trustedSurfaceId).toBe("crm");
    expect(ctx.surfaceResolutionSource).toBe("proxy-key");
  });

  it("falls back to platform when the proxy key is unknown", () => {
    const req = buildReq({
      headers: {
        [HEADER_CORELY_PROXY_KEY]: "unknown-proxy-key",
      },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.surfaceId).toBe("platform");
    expect(ctx.trustedSurfaceId).toBeNull();
    expect(ctx.surfaceResolutionSource).toBe("fallback");
    expect(ctx.sources.surfaceId).toBe("inferred");
  });

  it("detects declared surface mismatches without trusting the declared header", () => {
    const req = buildReq({
      headers: {
        [HEADER_CORELY_PROXY_KEY]: "test-pos-proxy-key",
        [HEADER_CORELY_SURFACE]: "crm",
      },
    });

    const ctx = resolveRequestContext(req);

    expect(ctx.surfaceId).toBe("pos");
    expect(ctx.declaredSurfaceId).toBe("crm");
    expect(ctx.surfaceHeaderMismatch).toBe(true);
    expect(ctx.sources.declaredSurfaceId).toBe("header");
  });
});
