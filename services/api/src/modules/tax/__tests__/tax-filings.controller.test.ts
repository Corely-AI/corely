import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@corely/kernel";
import type { Request } from "express";
import { TaxFilingsController } from "../tax-filings.controller";
import { HEADER_TENANT_ID, HEADER_WORKSPACE_ID } from "@shared/request-context";

describe("TaxFilingsController", () => {
  let controller: TaxFilingsController;
  const getCenterExecute = vi.fn();

  beforeEach(() => {
    getCenterExecute.mockReset();
    getCenterExecute.mockResolvedValue(
      ok({
        mode: "FREELANCER",
        year: 2026,
        nextUp: null,
        annual: { year: 2025, items: [], totalCount: 0 },
        issues: [],
        snapshot: { kpis: [], updatedAt: new Date("2026-03-04T00:00:00.000Z").toISOString() },
        shortcutsHints: [],
      })
    );

    controller = new TaxFilingsController(
      { execute: getCenterExecute } as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never,
      {} as unknown as never
    );
  });

  it("passes annualYear to getTaxCenter use case", async () => {
    const req = {
      headers: {
        [HEADER_TENANT_ID]: "tenant-1",
        [HEADER_WORKSPACE_ID]: "workspace-1",
        "x-user-id": "user-1",
      },
      params: {},
      query: {},
    } as unknown as Request;

    await controller.getCenter({ year: "2026", annualYear: "2025", entityId: "entity-1" }, req);

    expect(getCenterExecute).toHaveBeenCalledWith(
      { year: 2026, annualYear: 2025, entityId: "entity-1" },
      expect.objectContaining({
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      })
    );
  });
});
