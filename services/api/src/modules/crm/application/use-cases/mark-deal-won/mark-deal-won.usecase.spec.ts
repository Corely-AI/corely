import { describe, expect, it, vi } from "vitest";
import { isOk } from "@corely/kernel";
import { DealAggregate } from "../../../domain/deal.aggregate";
import { MarkDealWonUseCase } from "./mark-deal-won.usecase";
import { MarkDealLostUseCase } from "../mark-deal-lost/mark-deal-lost.usecase";

function openDeal(id: string): DealAggregate {
  return DealAggregate.createDeal({
    id,
    tenantId: "tenant-1",
    title: "Nails pilot",
    partyId: "party-1",
    stageId: "lead",
    createdAt: new Date("2026-03-02T10:00:00.000Z"),
  });
}

describe("Deal close sequence cancellation", () => {
  it("cancels pending enrollments when marking deal won", async () => {
    const dealRepo = {
      findById: vi.fn(async () => openDeal("deal-won-1")),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(async () => {}),
      recordStageTransition: vi.fn(),
      getStageTransitions: vi.fn(),
    };
    const enrollmentRepo = {
      cancelPendingByDealContext: vi.fn(async () => 2),
    };

    const useCase = new MarkDealWonUseCase(
      dealRepo as any,
      enrollmentRepo as any,
      { now: () => new Date("2026-03-02T12:00:00.000Z") } as any,
      { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any
    );

    const result = await useCase.execute(
      { dealId: "deal-won-1" },
      { tenantId: "tenant-1", userId: "user-1", correlationId: "corr-won" }
    );

    expect(isOk(result)).toBe(true);
    expect(enrollmentRepo.cancelPendingByDealContext).toHaveBeenCalledWith(
      "tenant-1",
      "deal-won-1"
    );
  });

  it("cancels pending enrollments when marking deal lost", async () => {
    const dealRepo = {
      findById: vi.fn(async () => openDeal("deal-lost-1")),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(async () => {}),
      recordStageTransition: vi.fn(),
      getStageTransitions: vi.fn(),
    };
    const enrollmentRepo = {
      cancelPendingByDealContext: vi.fn(async () => 1),
    };

    const useCase = new MarkDealLostUseCase(
      dealRepo as any,
      enrollmentRepo as any,
      { now: () => new Date("2026-03-02T12:00:00.000Z") } as any,
      { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any
    );

    const result = await useCase.execute(
      { dealId: "deal-lost-1", reason: "No budget" },
      { tenantId: "tenant-1", userId: "user-1", correlationId: "corr-lost" }
    );

    expect(isOk(result)).toBe(true);
    expect(enrollmentRepo.cancelPendingByDealContext).toHaveBeenCalledWith(
      "tenant-1",
      "deal-lost-1"
    );
  });
});
