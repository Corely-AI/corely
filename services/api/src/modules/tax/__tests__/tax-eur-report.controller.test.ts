import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@corely/kernel";
import type { Request } from "express";
import { HEADER_TENANT_ID, HEADER_WORKSPACE_ID } from "@shared/request-context";
import { TaxController } from "../tax.controller";

describe("TaxController /tax/reports/eur", () => {
  const getEurStatementExecute = vi.fn();
  let controller: TaxController;

  beforeEach(() => {
    getEurStatementExecute.mockReset();
    getEurStatementExecute.mockResolvedValue(
      ok({
        statement: {
          year: 2025,
          currency: "EUR",
          jurisdiction: "DE",
          basis: "cash",
          lines: [],
          totals: {
            incomeCents: 100_000,
            expenseCents: 40_000,
            profitCents: 60_000,
          },
          generatedAt: "2026-03-04T00:00:00.000Z",
        },
      })
    );

    controller = new TaxController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { execute: getEurStatementExecute } as never,
      {} as never
    );
  });

  it("returns statement shape and calls use case once with parsed year", async () => {
    const req = {
      headers: {
        [HEADER_TENANT_ID]: "tenant-1",
        [HEADER_WORKSPACE_ID]: "workspace-1",
        "x-user-id": "user-1",
      },
      params: {},
      query: {},
    } as unknown as Request;

    const response = await controller.getEurStatement({ year: "2025" }, req);

    expect(getEurStatementExecute).toHaveBeenCalledTimes(1);
    expect(getEurStatementExecute).toHaveBeenCalledWith(
      { year: 2025 },
      expect.objectContaining({
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
      })
    );
    expect(response.statement.totals.profitCents).toBe(60_000);
  });
});
