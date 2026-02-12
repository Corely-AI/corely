import { describe, expect, it } from "vitest";
import { buildToolCtx, validationError } from "./tool-utils";

describe("tool-utils", () => {
  it("builds context with workspace fallback to tenant", () => {
    const ctx = buildToolCtx({
      tenantId: "tenant-1",
      userId: "user-1",
      toolCallId: "tool-1",
    });

    expect(ctx).toEqual({
      tenantId: "tenant-1",
      workspaceId: "tenant-1",
      userId: "user-1",
      correlationId: "tool-1",
      requestId: "tool-1",
    });
  });

  it("preserves explicit workspace and fallback correlationId from runId", () => {
    const ctx = buildToolCtx({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      runId: "run-1",
    });

    expect(ctx).toEqual({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      correlationId: "run-1",
      requestId: undefined,
    });
  });

  it("returns standardized validation error shape", () => {
    const issues = { fieldErrors: { name: ["Required"] } };
    expect(validationError(issues)).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid input for tool call",
      details: issues,
    });
  });
});
