import { describe, expect, it } from "vitest";
import { evaluateSurfaceAwareRequest } from "../request-surface";

describe("evaluateSurfaceAwareRequest", () => {
  it("rejects mismatched declared and trusted surfaces", () => {
    const result = evaluateSurfaceAwareRequest({
      declaredSurfaceId: "crm",
      surfaceHeaderMismatch: true,
      surfaceResolutionSource: "proxy-key",
      trustedSurfaceId: "pos",
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("surface-header-mismatch");
  });

  it("rejects declared CRM requests without a trusted proxy key", () => {
    const result = evaluateSurfaceAwareRequest({
      declaredSurfaceId: "crm",
      surfaceHeaderMismatch: false,
      surfaceResolutionSource: "fallback",
      trustedSurfaceId: null,
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("missing-trusted-surface");
  });

  it("rejects POS scope without a trusted POS surface", () => {
    const result = evaluateSurfaceAwareRequest(
      {
        declaredSurfaceId: undefined,
        surfaceHeaderMismatch: false,
        surfaceResolutionSource: "fallback",
        trustedSurfaceId: null,
      },
      "pos"
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("missing-trusted-surface");
  });

  it("allows direct platform web requests to fall back safely", () => {
    const result = evaluateSurfaceAwareRequest({
      declaredSurfaceId: undefined,
      surfaceHeaderMismatch: false,
      surfaceResolutionSource: "fallback",
      trustedSurfaceId: null,
    });

    expect(result.ok).toBe(true);
  });
});
