import { describe, expect, it, vi } from "vitest";
import { isOk } from "@corely/kernel";
import { DealAggregate } from "../../../domain/deal.aggregate";
import { LeadAggregate } from "../../../domain/lead.aggregate";
import { ActivityEntity } from "../../../domain/activity.entity";
import { ProcessResendInboundEmailUseCase } from "./process-resend-inbound-email.usecase";

const NOW = new Date("2026-03-02T12:00:00.000Z");

function buildDeps() {
  const activityRepo = {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
    getTimeline: vi.fn(),
    findCommunicationByExternalMessageId: vi.fn(async () => null),
    findCommunicationByExternalThreadId: vi.fn(async () => null),
    findLatestOutboundCommunicationByRecipient: vi.fn(async () => null),
    upsertWebhookEvent: vi.fn(async () => true),
  };
  const dealRepo = {
    findById: vi.fn(async () => null),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(async () => {}),
    recordStageTransition: vi.fn(async () => {}),
    getStageTransitions: vi.fn(),
  };
  const leadRepo = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(async () => null),
    findByConvertedDealId: vi.fn(async () => null),
    findLatestByEmail: vi.fn(async () => null),
    touchLastRepliedAt: vi.fn(async () => {}),
    list: vi.fn(),
  };
  const enrollmentRepo = {
    create: vi.fn(),
    findDueEnrollments: vi.fn(),
    findById: vi.fn(),
    findBySequenceLeadDealContext: vi.fn(),
    cancelById: vi.fn(async () => false),
    cancelPendingByDealContext: vi.fn(async () => 1),
    updateStatus: vi.fn(),
  };
  const partyRepo = {
    findPartyByEmail: vi.fn(async () => null),
    findPartyById: vi.fn(async () => null),
  };

  const useCase = new ProcessResendInboundEmailUseCase(
    activityRepo as any,
    dealRepo as any,
    leadRepo as any,
    enrollmentRepo as any,
    partyRepo as any,
    { now: () => NOW } as any,
    { newId: vi.fn(() => "activity-inbound-1") } as any,
    { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any
  );

  return { useCase, activityRepo, dealRepo, leadRepo, enrollmentRepo, partyRepo };
}

function buildLead(id: string): LeadAggregate {
  return LeadAggregate.create({
    id,
    tenantId: "tenant-1",
    email: "customer@example.com",
    createdAt: NOW,
  });
}

function buildDeal(id: string): DealAggregate {
  return DealAggregate.createDeal({
    id,
    tenantId: "tenant-1",
    title: "Nails pilot",
    partyId: "party-1",
    stageId: "lead",
    createdAt: NOW,
  });
}

describe("ProcessResendInboundEmailUseCase", () => {
  it("parses deal id from plus-address alias and cancels pending deal follow-ups", async () => {
    const { useCase, activityRepo, dealRepo, leadRepo, enrollmentRepo } = buildDeps();
    const deal = buildDeal("11111111-1111-4111-8111-111111111111");
    const lead = buildLead("lead-1");

    dealRepo.findById.mockImplementation(async (_tenantId: string, id: string) =>
      id === deal.id ? deal : null
    );
    leadRepo.findLatestByEmail.mockResolvedValue(lead);

    const result = await useCase.execute(
      {
        tenantId: "tenant-1",
        payload: {
          type: "email.received",
          data: {
            email_id: "inbound-1",
            from: "Customer <customer@example.com>",
            to: [`replies+${deal.id}@corely.one`],
            subject: "Re: Welcome",
            text: "Interested, let's talk.",
          },
        },
      },
      { tenantId: "tenant-1", correlationId: "corr-1" }
    );

    expect(isOk(result)).toBe(true);
    expect(activityRepo.create).toHaveBeenCalledTimes(1);
    const createdActivity = activityRepo.create.mock.calls[0][1] as ActivityEntity;
    expect(createdActivity.direction).toBe("INBOUND");
    expect(createdActivity.dealId).toBe(deal.id);
    expect(createdActivity.leadId).toBe(lead.id);
    expect(createdActivity.metadata?.dealIdFromAlias).toBe(deal.id);
    expect(leadRepo.touchLastRepliedAt).toHaveBeenCalledWith("tenant-1", lead.id, NOW);
    expect(enrollmentRepo.cancelPendingByDealContext).toHaveBeenCalledWith("tenant-1", deal.id);
    expect(dealRepo.update).toHaveBeenCalledTimes(1);
    expect(deal.stageId).toBe("qualified");
  });

  it("cancels by enrollment id from outbound metadata when available", async () => {
    const { useCase, activityRepo, dealRepo, leadRepo, enrollmentRepo } = buildDeps();
    const deal = buildDeal("22222222-2222-4222-8222-222222222222");

    const outbound = ActivityEntity.create({
      id: "outbound-1",
      tenantId: "tenant-1",
      type: "COMMUNICATION",
      channelKey: "email",
      direction: "OUTBOUND",
      communicationStatus: "SENT",
      subject: "Welcome",
      leadId: "lead-2",
      partyId: "party-1",
      dealId: deal.id,
      externalMessageId: "msg-outbound-1",
      providerKey: "resend",
      metadata: {
        sequenceEnrollmentId: "enroll-42",
        contextDealId: deal.id,
        leadId: "lead-2",
      },
      createdAt: NOW,
      createdByUserId: null,
    });

    activityRepo.findCommunicationByExternalMessageId.mockImplementation(
      async (_t, _p, externalId) => (externalId === "msg-outbound-1" ? outbound : null)
    );
    dealRepo.findById.mockResolvedValue(deal);
    enrollmentRepo.cancelById.mockResolvedValue(true);
    leadRepo.findLatestByEmail.mockResolvedValue(null);
    leadRepo.findByConvertedDealId.mockResolvedValue(buildLead("lead-2"));

    const result = await useCase.execute(
      {
        tenantId: "tenant-1",
        payload: {
          type: "email.received",
          data: {
            email_id: "inbound-2",
            from: "Customer <customer@example.com>",
            to: ["nails@corely.one"],
            headers: {
              "in-reply-to": "<msg-outbound-1>",
            },
            subject: "Re: Welcome",
            text: "Thanks for the email.",
          },
        },
      },
      { tenantId: "tenant-1", correlationId: "corr-2" }
    );

    expect(isOk(result)).toBe(true);
    expect(enrollmentRepo.cancelById).toHaveBeenCalledWith("enroll-42");
    expect(enrollmentRepo.cancelPendingByDealContext).not.toHaveBeenCalled();
    expect(leadRepo.touchLastRepliedAt).toHaveBeenCalledWith("tenant-1", "lead-2", NOW);
  });

  it("falls back to References header to correlate outbound context", async () => {
    const { useCase, activityRepo, dealRepo, leadRepo } = buildDeps();
    const deal = buildDeal("33333333-3333-4333-8333-333333333333");
    const outbound = ActivityEntity.create({
      id: "outbound-2",
      tenantId: "tenant-1",
      type: "COMMUNICATION",
      channelKey: "email",
      direction: "OUTBOUND",
      communicationStatus: "SENT",
      subject: "Follow-up",
      leadId: "lead-3",
      partyId: "party-1",
      dealId: deal.id,
      externalMessageId: "msg-ref-1",
      providerKey: "resend",
      metadata: {
        contextDealId: deal.id,
        leadId: "lead-3",
      },
      createdAt: NOW,
      createdByUserId: null,
    });

    activityRepo.findCommunicationByExternalMessageId.mockImplementation(
      async (_t, _p, externalId) => (externalId === "msg-ref-1" ? outbound : null)
    );
    dealRepo.findById.mockResolvedValue(deal);
    leadRepo.findByConvertedDealId.mockResolvedValue(buildLead("lead-3"));

    const result = await useCase.execute(
      {
        tenantId: "tenant-1",
        payload: {
          type: "email.received",
          data: {
            email_id: "inbound-3",
            from: "Customer <customer@example.com>",
            to: ["nails@corely.one"],
            headers: {
              references: "<unknown> <msg-ref-1>",
            },
            subject: "Re: Follow-up",
            text: "Looping back.",
          },
        },
      },
      { tenantId: "tenant-1", correlationId: "corr-3" }
    );

    expect(isOk(result)).toBe(true);
    expect(activityRepo.findCommunicationByExternalMessageId).toHaveBeenCalledWith(
      "tenant-1",
      "resend",
      "unknown"
    );
    expect(activityRepo.findCommunicationByExternalMessageId).toHaveBeenCalledWith(
      "tenant-1",
      "resend",
      "msg-ref-1"
    );
    const createdActivity = activityRepo.create.mock.calls[0][1] as ActivityEntity;
    expect(createdActivity.dealId).toBe(deal.id);
    expect(createdActivity.leadId).toBe("lead-3");
  });
});
