import { describe, expect, it, vi } from "vitest";
import { isOk } from "@corely/kernel";
import { EnrollEntityUseCase } from "./enroll-entity.usecase";
import { SequenceAggregate } from "../../../domain/sequence.aggregate";
import { LeadAggregate } from "../../../domain/lead.aggregate";

describe("EnrollEntityUseCase", () => {
  it("is idempotent for the same sequence + lead + deal context", async () => {
    const created: Array<{ id: string; sequenceId: string; leadId?: string; dealId?: string }> = [];
    const findBySequenceLeadDealContext = vi.fn(
      async (tenantId: string, sequenceId: string, leadId: string, dealId: string) => {
        const existing = created.find(
          (item) =>
            item.sequenceId === sequenceId && item.leadId === leadId && item.dealId === dealId
        );
        return existing
          ? ({
              id: existing.id,
              tenantId,
              sequenceId,
              leadId,
              partyId: null,
              dealId,
              currentStepOrder: 1,
              status: "ACTIVE",
              nextExecutionAt: new Date("2026-03-02T10:00:00.000Z"),
              sequence: { steps: [] },
            } as any)
          : null;
      }
    );

    const enrollmentRepo = {
      create: vi.fn(
        async (data: { id: string; sequenceId: string; leadId?: string; dealId?: string }) => {
          created.push(data);
        }
      ),
      findDueEnrollments: vi.fn(),
      findById: vi.fn(),
      findBySequenceLeadDealContext,
      cancelById: vi.fn(),
      cancelPendingByDealContext: vi.fn(),
      updateStatus: vi.fn(),
    };

    const sequence = new SequenceAggregate(
      "seq-1",
      "tenant-1",
      [
        {
          id: "step-1",
          tenantId: "tenant-1",
          sequenceId: "seq-1",
          stepOrder: 1,
          type: "EMAIL_AUTO",
          dayDelay: 0,
          templateSubject: "Welcome",
          templateBody: "Hello",
          createdAt: new Date("2026-03-02T10:00:00.000Z"),
          updatedAt: new Date("2026-03-02T10:00:00.000Z"),
        } as any,
      ],
      "Nails Sequence"
    );

    const sequenceRepo = {
      findById: vi.fn(async () => sequence),
      create: vi.fn(),
      update: vi.fn(),
      list: vi.fn(),
    };

    const lead = LeadAggregate.create({
      id: "lead-1",
      tenantId: "tenant-1",
      email: "lead@example.com",
      createdAt: new Date("2026-03-02T10:00:00.000Z"),
    });
    const leadRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(async () => lead),
      findByConvertedDealId: vi.fn(async () => null),
      findLatestByEmail: vi.fn(async () => null),
      touchLastRepliedAt: vi.fn(),
      list: vi.fn(),
    };

    const dealRepo = {
      findById: vi.fn(async () => null),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      recordStageTransition: vi.fn(),
      getStageTransitions: vi.fn(),
    };

    const useCase = new EnrollEntityUseCase(
      enrollmentRepo as any,
      sequenceRepo as any,
      leadRepo as any,
      dealRepo as any,
      { log: vi.fn() } as any,
      { enqueue: vi.fn() } as any,
      { run: async (_key: string, fn: () => Promise<unknown>) => fn() } as any,
      { newId: vi.fn(() => "enrollment-1") } as any,
      { now: () => new Date("2026-03-02T10:00:00.000Z") } as any
    );

    const ctx = { tenantId: "tenant-1", userId: "user-1", correlationId: "corr-1" };
    const first = await useCase.execute(
      {
        sequenceId: "seq-1",
        entityType: "lead",
        entityId: "lead-1",
        contextDealId: "deal-1",
      },
      ctx
    );
    const second = await useCase.execute(
      {
        sequenceId: "seq-1",
        entityType: "lead",
        entityId: "lead-1",
        contextDealId: "deal-1",
      },
      ctx
    );

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);
    expect(enrollmentRepo.create).toHaveBeenCalledTimes(1);
    expect(findBySequenceLeadDealContext).toHaveBeenCalledTimes(2);
  });
});
