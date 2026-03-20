import { describe, expect, it } from "vitest";
import { FixedClock } from "@corely/kernel";
import { CoachingPrepFormRequestedHandler } from "./coaching-prep-form-requested.handler";
import { COACHING_EVENTS } from "@corely/contracts";

describe("CoachingPrepFormRequestedHandler", () => {
  it("is retry-safe once a prep request has already been recorded", async () => {
    const now = new Date("2026-03-20T10:00:00.000Z");
    const session = {
      id: "session-1",
      workspaceId: "ws-1",
      prepRequestedAt: null,
      prepAccessTokenHash: null,
      updatedAt: now,
      engagement: {
        id: "eng-1",
        clientPartyId: "party-client-1",
        offer: {
          prepFormTemplate: {
            title: { en: "Prep form" },
            questions: [],
          },
        },
      },
    };
    const repo = {
      findSessionById: async () => session,
      updateSession: async (next: typeof session) => {
        session.prepRequestedAt = next.prepRequestedAt;
        session.prepAccessTokenHash = next.prepAccessTokenHash;
        session.updatedAt = next.updatedAt;
        return next;
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

    const handler = new CoachingPrepFormRequestedHandler(
      repo as any,
      customerQuery as any,
      emailSender as any,
      new FixedClock(now),
      { API_BASE_URL: "https://api.example.com" } as any
    );
    const event = {
      id: "evt-1",
      tenantId: "tenant-1",
      eventType: COACHING_EVENTS.PREP_FORM_REQUESTED,
      correlationId: "corr-1",
      payload: {
        workspaceId: "ws-1",
        engagementId: "eng-1",
        sessionId: "session-1",
      },
    };

    await handler.handle(event);
    await handler.handle(event);

    expect(session.prepRequestedAt).toEqual(now);
    expect(session.prepAccessTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailCalls).toHaveLength(1);
    expect(emailCalls[0]).toEqual(
      expect.objectContaining({
        tenantId: "tenant-1",
        subject: "Complete your pre-coaching form",
        idempotencyKey: "coaching-prep-request:session-1",
      })
    );
  });
});
