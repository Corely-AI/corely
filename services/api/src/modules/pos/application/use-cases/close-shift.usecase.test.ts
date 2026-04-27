import { describe, expect, it, vi } from "vitest";
import { ok, type UseCaseContext } from "@corely/kernel";
import type { ShiftSessionRepositoryPort } from "../ports/shift-session-repository.port";
import { ShiftSession } from "../../domain/shift-session.aggregate";
import { CloseShiftUseCase } from "./close-shift.usecase";
import { SubmitDailyCloseUseCase } from "../../../cash-management/application/use-cases/submit-daily-close.usecase";
import { ResolveCashDrawerForPosRegisterService } from "../services/resolve-cash-drawer-for-pos-register.service";

const createPosCtx = (): UseCaseContext => ({
  tenantId: "workspace-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  requestId: "req-1",
  correlationId: "corr-1",
  metadata: {
    permissions: ["*"],
    platformTenantId: "tenant-1",
  },
});

const makeOpenSession = (): ShiftSession =>
  new ShiftSession(
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "11111111-1111-1111-1111-111111111111",
    "workspace-1",
    "employee-1",
    new Date("2026-03-25T08:00:00.000Z"),
    10000,
    "OPEN",
    null,
    null,
    null,
    25000,
    18000,
    null,
    "Lunch shift",
    new Date("2026-03-25T08:00:00.000Z"),
    new Date("2026-03-25T08:00:00.000Z")
  );

describe("CloseShiftUseCase", () => {
  it("submits the daily close against the mapped cash drawer", async () => {
    const session = makeOpenSession();
    const shiftRepo: ShiftSessionRepositoryPort = {
      findById: vi.fn().mockResolvedValue(session),
      findOpenByRegister: vi.fn(),
      listByWorkspace: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const submitDailyClose = {
      execute: vi.fn().mockResolvedValue(ok({ close: { id: "close-1" } })),
    } satisfies Pick<SubmitDailyCloseUseCase, "execute">;
    const resolveCashDrawer = {
      execute: vi.fn().mockResolvedValue(
        ok({
          cashDrawerId: "cash-1",
          resolution: "bound" as const,
          posRegister: { id: session.registerId },
          scope: {
            posWorkspaceId: "workspace-1",
            cashTenantId: "tenant-1",
            cashManagementContext: {
              ...createPosCtx(),
              tenantId: "tenant-1",
              workspaceId: "workspace-1",
            },
          },
        })
      ),
    } satisfies Pick<ResolveCashDrawerForPosRegisterService, "execute">;

    const useCase = new CloseShiftUseCase(
      shiftRepo,
      submitDailyClose as unknown as SubmitDailyCloseUseCase,
      resolveCashDrawer as unknown as ResolveCashDrawerForPosRegisterService
    );

    const result = await useCase.execute(
      {
        sessionId: session.id,
        closingCashCents: 28000,
        notes: "Closed cleanly",
      },
      createPosCtx()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected close shift to succeed");
    }

    expect(resolveCashDrawer.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        posRegisterId: session.registerId,
      }),
      expect.objectContaining({
        tenantId: "workspace-1",
      })
    );
    expect(submitDailyClose.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        registerId: "cash-1",
        tenantId: "tenant-1",
      }),
      expect.objectContaining({
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
      })
    );
    expect(shiftRepo.update).toHaveBeenCalledTimes(1);
  });
});
