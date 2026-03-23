import { describe, expect, it } from "vitest";
import { FixedClock } from "@corely/kernel";
import { PrepFormDispatchService } from "../services/prep-form-dispatch.service";

describe("PrepFormDispatchService", () => {
  it("is retry-safe once a prep request has already been recorded", async () => {
    const now = new Date("2026-03-20T10:00:00.000Z");
    const timeline: Array<Record<string, unknown>> = [];
    const session = {
      id: "session-1",
      workspaceId: "ws-1",
      startAt: new Date("2026-03-20T12:00:00.000Z"),
      status: "scheduled",
      prepAccessToken: null,
      prepAccessTokenHash: null,
      prepRequestedAt: null,
      prepSubmittedAt: null,
      updatedAt: now,
      engagement: {
        id: "eng-1",
        status: "prep_pending",
        paymentStatus: "captured",
        contractStatus: "signed",
        clientPartyId: "party-client-1",
        offer: {
          prepFormTemplate: {
            title: { en: "Prep form" },
            questions: [],
          },
          prepFormSendHoursBeforeSession: 3,
          paymentRequired: true,
          contractRequired: true,
        },
      },
    };
    const repo = {
      findSessionById: async () => session,
      updateSession: async (next: typeof session) => {
        session.prepAccessToken = next.prepAccessToken;
        session.prepAccessTokenHash = next.prepAccessTokenHash;
        session.prepRequestedAt = next.prepRequestedAt;
        session.updatedAt = next.updatedAt;
        return next;
      },
      createTimelineEntry: async (entry: Record<string, unknown>) => {
        timeline.push(entry);
        return entry;
      },
    };
    const customerQuery = {
      getCustomerBillingSnapshot: async () => ({
        customerPartyId: "party-client-1",
        email: "client@example.com",
      }),
    };
    const emailCalls: Array<Record<string, unknown>> = [];
    const emailSender = {
      sendEmail: async (message: Record<string, unknown>) => {
        emailCalls.push(message);
      },
    };

    const service = new PrepFormDispatchService(
      repo as any,
      customerQuery as any,
      emailSender as any,
      { newId: () => "timeline-1" } as any,
      new FixedClock(now),
      { API_BASE_URL: "https://api.example.com" } as any
    );

    await service.dispatchIfDue({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      sessionId: "session-1",
      now,
    });
    await service.dispatchIfDue({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      sessionId: "session-1",
      now,
    });

    expect(session.prepRequestedAt).toEqual(now);
    expect(session.prepAccessToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(session.prepAccessTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailCalls).toHaveLength(1);
    expect(timeline).toHaveLength(1);
    expect(emailCalls[0]).toEqual(
      expect.objectContaining({
        tenantId: "tenant-1",
        subject: "Complete your pre-coaching form",
        idempotencyKey: "coaching-prep-request:session-1",
      })
    );
  });
});
