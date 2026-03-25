import { describe, expect, it } from "vitest";
import { FakeIdGenerator, FixedClock } from "@corely/kernel";
import { COACHING_EVENTS } from "@corely/contracts";
import { CoachingBookingRequestedHandler } from "./coaching-booking-requested.handler";

describe("CoachingBookingRequestedHandler", () => {
  it("creates one contract request for the correct client and sends it once across retries", async () => {
    const now = new Date("2026-03-20T10:00:00.000Z");
    const engagement = {
      id: "eng-1",
      clientPartyId: "party-client-1",
      locale: "en",
      status: "pending_payment",
      contractDraftDocumentId: null,
      contractAccessTokenHash: null,
      contractRequestedAt: null,
      updatedAt: now,
      offer: {
        contractRequired: true,
        paymentRequired: true,
        prepFormTemplate: null,
        contractTemplate: { en: "Executive coaching contract v1" },
        localeDefault: "en",
        title: { en: "Executive coaching" },
      },
    };

    let contractRequest: Record<string, unknown> | null = null;
    const timeline: Array<Record<string, unknown>> = [];
    const outboxEvents: Array<Record<string, unknown>> = [];
    const emailCalls: Array<Record<string, unknown>> = [];

    const repo = {
      findEngagementById: async () => engagement,
      findLatestContractRequestByEngagement: async () => contractRequest,
      createContractRequest: async (next: Record<string, unknown>) => {
        contractRequest = { ...next };
        return contractRequest;
      },
      updateContractRequest: async (next: Record<string, unknown>) => {
        contractRequest = { ...next };
        return contractRequest;
      },
      updateEngagement: async (next: typeof engagement) => Object.assign(engagement, next),
      createTimelineEntry: async (entry: Record<string, unknown>) => {
        timeline.push(entry);
        return entry;
      },
      findSessionById: async () => null,
    };

    const handler = new CoachingBookingRequestedHandler(
      repo as any,
      {
        createPdfArtifact: async () => ({ documentId: "draft-doc-1" }),
      } as any,
      {
        getCustomerBillingSnapshot: async () => ({
          customerPartyId: "party-client-1",
          displayName: "Acme Client",
          email: "client@example.com",
        }),
      } as any,
      {
        sendEmail: async (message: Record<string, unknown>) => {
          emailCalls.push(message);
        },
      } as any,
      {
        enqueue: async (event: Record<string, unknown>) => {
          outboxEvents.push(event);
        },
      } as any,
      new FakeIdGenerator("contract"),
      new FixedClock(now),
      { API_BASE_URL: "https://api.example.com" } as any
    );

    const event = {
      id: "evt-1",
      tenantId: "tenant-1",
      eventType: COACHING_EVENTS.BOOKING_REQUESTED,
      correlationId: "corr-1",
      payload: {
        workspaceId: "ws-1",
        engagementId: "eng-1",
        sessionId: "session-1",
      },
    };

    await handler.handle(event as any);
    await handler.handle(event as any);

    expect(contractRequest).toEqual(
      expect.objectContaining({
        engagementId: "eng-1",
        clientPartyId: "party-client-1",
        recipientEmail: "client@example.com",
        draftDocumentId: "draft-doc-1",
        status: "pending",
      })
    );
    expect(engagement.contractDraftDocumentId).toBe("draft-doc-1");
    expect(emailCalls).toHaveLength(1);
    expect(emailCalls[0]).toEqual(
      expect.objectContaining({
        tenantId: "tenant-1",
        subject: "Please sign your coaching agreement",
      })
    );
    expect(String(emailCalls[0].idempotencyKey)).toMatch(/^coaching-contract-request:eng-1:/);
    expect(String(emailCalls[0].text)).toContain(
      "https://api.example.com/coaching/public/contracts/eng-1/"
    );
    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toEqual(
      expect.objectContaining({
        eventType: COACHING_EVENTS.CONTRACT_SIGNATURE_REQUESTED,
      })
    );
    expect(outboxEvents).toHaveLength(1);
    expect(outboxEvents[0]).toEqual(
      expect.objectContaining({
        eventType: COACHING_EVENTS.CONTRACT_SIGNATURE_REQUESTED,
        payload: expect.objectContaining({
          workspaceId: "ws-1",
          engagementId: "eng-1",
        }),
      })
    );
  });
});
