import { describe, expect, it } from "vitest";
import {
  FakeIdGenerator,
  FixedClock,
  InMemoryIdempotency,
  NoopLogger,
  unwrap,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { BookCoachingEngagementUseCase } from "./book-coaching-engagement.usecase";
import type { CustomerQueryPort } from "../../../party/application/ports/customer-query.port";
import type { CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";
import type {
  CoachingArtifactBundleRecord,
  CoachingBookingHoldRecord,
  CoachingContractRequestRecord,
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingSessionRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";

class InMemoryCoachingRepo {
  offers: CoachingOfferRecord[] = [];
  engagements: CoachingEngagementRecord[] = [];
  sessions: CoachingSessionRecord[] = [];
  holds: CoachingBookingHoldRecord[] = [];
  contractRequests: CoachingContractRequestRecord[] = [];
  timeline: CoachingTimelineEntryRecord[] = [];

  async createOffer(offer: CoachingOfferRecord): Promise<CoachingOfferRecord> {
    this.offers.push(offer);
    return offer;
  }

  async findOfferById(): Promise<CoachingOfferRecord | null> {
    return null;
  }

  async createEngagement(engagement: CoachingEngagementRecord): Promise<CoachingEngagementRecord> {
    this.engagements.push(engagement);
    return engagement;
  }

  async createContractRequest(
    request: CoachingContractRequestRecord
  ): Promise<CoachingContractRequestRecord> {
    this.contractRequests.push(request);
    return request;
  }

  async updateContractRequest(
    request: CoachingContractRequestRecord
  ): Promise<CoachingContractRequestRecord> {
    return request;
  }

  async updateEngagement(engagement: CoachingEngagementRecord): Promise<CoachingEngagementRecord> {
    return engagement;
  }

  async findEngagementById(): Promise<
    (CoachingEngagementRecord & { offer: CoachingOfferRecord }) | null
  > {
    return null;
  }

  async findEngagementByContractTokenHash(): Promise<
    (CoachingEngagementRecord & { offer: CoachingOfferRecord }) | null
  > {
    return null;
  }

  async findEngagementByCheckoutSessionId(): Promise<
    (CoachingEngagementRecord & { offer: CoachingOfferRecord }) | null
  > {
    return null;
  }

  async findLatestContractRequestByEngagement(): Promise<CoachingContractRequestRecord | null> {
    return null;
  }

  async findContractRequestByTokenHash(): Promise<CoachingContractRequestRecord | null> {
    return null;
  }

  async listEngagements() {
    return { items: [], total: 0 };
  }

  async createSession(session: CoachingSessionRecord): Promise<CoachingSessionRecord> {
    this.sessions.push(session);
    return session;
  }

  async updateSession(session: CoachingSessionRecord): Promise<CoachingSessionRecord> {
    return session;
  }

  async findSessionById(): Promise<
    | (CoachingSessionRecord & {
        engagement: CoachingEngagementRecord & { offer: CoachingOfferRecord };
      })
    | null
  > {
    return null;
  }

  async findSessionByPrepTokenHash(): Promise<
    | (CoachingSessionRecord & {
        engagement: CoachingEngagementRecord & { offer: CoachingOfferRecord };
      })
    | null
  > {
    return null;
  }

  async findSessionByDebriefTokenHash(): Promise<
    | (CoachingSessionRecord & {
        engagement: CoachingEngagementRecord & { offer: CoachingOfferRecord };
      })
    | null
  > {
    return null;
  }

  async listSessions() {
    return { items: [], total: 0 };
  }

  async hasCoachSessionConflict(
    tenantId: string,
    coachUserId: string,
    startAt: Date,
    endAt: Date
  ): Promise<boolean> {
    return this.sessions.some((session) => {
      if (session.tenantId !== tenantId || session.status === "cancelled") {
        return false;
      }
      const engagement = this.engagements.find((item) => item.id === session.engagementId);
      if (!engagement || engagement.coachUserId !== coachUserId) {
        return false;
      }
      return session.startAt < endAt && session.endAt > startAt;
    });
  }

  async createBookingHold(hold: CoachingBookingHoldRecord): Promise<CoachingBookingHoldRecord> {
    this.holds.push(hold);
    return hold;
  }

  async findBookingHoldById(
    tenantId: string,
    holdId: string
  ): Promise<CoachingBookingHoldRecord | null> {
    return this.holds.find((hold) => hold.tenantId === tenantId && hold.id === holdId) ?? null;
  }

  async updateBookingHold(hold: CoachingBookingHoldRecord): Promise<CoachingBookingHoldRecord> {
    return hold;
  }

  async hasActiveHoldConflict(
    tenantId: string,
    coachUserId: string,
    startAt: Date,
    endAt: Date,
    now: Date
  ): Promise<boolean> {
    return this.holds.some(
      (hold) =>
        hold.tenantId === tenantId &&
        hold.coachUserId === coachUserId &&
        hold.status === "active" &&
        hold.expiresAt > now &&
        hold.startAt < endAt &&
        hold.endAt > startAt
    );
  }

  async createTimelineEntry(
    entry: CoachingTimelineEntryRecord
  ): Promise<CoachingTimelineEntryRecord> {
    this.timeline.push(entry);
    return entry;
  }

  async listTimeline(): Promise<CoachingTimelineEntryRecord[]> {
    return [];
  }

  async createArtifactBundle(
    bundle: CoachingArtifactBundleRecord
  ): Promise<CoachingArtifactBundleRecord> {
    return bundle;
  }

  async updateArtifactBundle(
    bundle: CoachingArtifactBundleRecord
  ): Promise<CoachingArtifactBundleRecord> {
    return bundle;
  }

  async findLatestArtifactBundle(): Promise<CoachingArtifactBundleRecord | null> {
    return null;
  }

  async findPublicOfferById(): Promise<CoachingOfferRecord | null> {
    return null;
  }
}

class RecordingAuditPort {
  entries: Array<Record<string, unknown>> = [];

  async log(entry: Record<string, unknown>): Promise<void> {
    this.entries.push(entry);
  }
}

class RecordingOutboxPort {
  events: Array<Record<string, unknown>> = [];

  async enqueue(event: Record<string, unknown>): Promise<void> {
    this.events.push(event);
  }
}

const uow: UnitOfWorkPort = {
  async withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return fn({} as TransactionContext);
  },
};

describe("BookCoachingEngagementUseCase", () => {
  it("creates a workspace-scoped engagement, audit log, and outbox event once per idempotency key", async () => {
    const repo = new InMemoryCoachingRepo();
    const audit = new RecordingAuditPort();
    const outbox = new RecordingOutboxPort();
    const customerQuery: CustomerQueryPort = {
      getCustomerBillingSnapshot: async () => ({
        customerPartyId: "party-client-1",
        displayName: "Acme Coaching Client",
        email: "client@example.com",
        billingEmail: "billing@example.com",
        addressLine1: null,
        addressLine2: null,
        city: null,
        postalCode: null,
        country: null,
        vatId: null,
      }),
    };

    const useCase = new BookCoachingEngagementUseCase({
      logger: new NoopLogger(),
      repo: repo as unknown as CoachingEngagementRepositoryPort,
      customerQuery,
      idGenerator: new FakeIdGenerator("coach"),
      clock: new FixedClock(new Date("2026-03-20T10:00:00.000Z")),
      audit: audit as any,
      outbox: outbox as any,
      idempotency: new InMemoryIdempotency(),
      uow,
    });

    const input = {
      clientPartyId: "party-client-1",
      coachUserId: "coach-user-1",
      locale: "de",
      offer: {
        title: { en: "Executive coaching", de: "Executive-Coaching" },
        description: { en: "One 60-minute session" },
        currency: "EUR",
        priceCents: 15000,
        sessionDurationMinutes: 60,
        meetingType: "video",
        availabilityRule: {
          timezone: "Europe/Berlin",
          weeklySlots: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
          blackouts: [],
        },
        bookingRules: {
          minNoticeHours: 24,
          maxAdvanceDays: 60,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
        },
        contractRequired: true,
        paymentRequired: true,
        localeDefault: "en",
        contractTemplate: { en: "Standard coaching agreement" },
        prepFormSendHoursBeforeSession: 48,
      },
      session: {
        startAt: "2026-03-25T09:00:00.000Z",
        endAt: "2026-03-25T10:00:00.000Z",
      },
      idempotencyKey: "book-engagement-1",
    };
    const ctx = {
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      correlationId: "corr-1",
    };

    const first = unwrap(await useCase.execute(input, ctx));
    const second = unwrap(await useCase.execute(input, ctx));

    expect(second.engagement.id).toBe(first.engagement.id);
    expect(repo.offers).toHaveLength(1);
    expect(repo.engagements).toHaveLength(1);
    expect(repo.sessions).toHaveLength(1);
    expect(repo.timeline).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
    expect(repo.offers[0]?.prepFormSendHoursBeforeSession).toBe(48);
    expect(first.engagement.status).toBe("pending_payment");
    expect(first.session.engagementId).toBe(first.engagement.id);
    expect(outbox.events[0]).toEqual(
      expect.objectContaining({
        tenantId: "tenant-1",
        eventType: "coaching.booking.requested",
        payload: expect.objectContaining({
          workspaceId: "ws-1",
          engagementId: first.engagement.id,
          sessionId: first.session.id,
        }),
      })
    );
  });

  it("rejects an overlapping booking when the coach already has a scheduled session", async () => {
    const repo = new InMemoryCoachingRepo();
    repo.engagements.push({
      id: "eng-existing",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      offerId: "offer-existing",
      clientPartyId: "party-client-existing",
      coachPartyId: null,
      coachUserId: "coach-user-1",
      locale: "en",
      status: "confirmed",
      paymentStatus: "captured",
      contractStatus: "signed",
      legalEntityId: null,
      paymentMethodId: null,
      invoiceId: null,
      stripeCheckoutSessionId: null,
      stripeCheckoutUrl: null,
      stripePaymentIntentId: null,
      contractAccessTokenHash: null,
      contractRequestedAt: null,
      contractSignedAt: null,
      contractDraftDocumentId: null,
      signedContractDocumentId: null,
      latestSummary: null,
      archivedAt: null,
      createdAt: new Date("2026-03-20T08:00:00.000Z"),
      updatedAt: new Date("2026-03-20T08:00:00.000Z"),
    });
    repo.sessions.push({
      id: "sess-existing",
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      engagementId: "eng-existing",
      status: "scheduled",
      sequenceNo: 1,
      startAt: new Date("2026-03-25T09:00:00.000Z"),
      endAt: new Date("2026-03-25T10:00:00.000Z"),
      meetingProvider: null,
      meetingLink: null,
      meetingIssuedAt: null,
      prepAccessTokenHash: null,
      prepRequestedAt: null,
      prepSubmittedAt: null,
      prepDocumentId: null,
      debriefAccessTokenHash: null,
      debriefRequestedAt: null,
      debriefSubmittedAt: null,
      debriefDocumentId: null,
      completedAt: null,
      createdAt: new Date("2026-03-20T08:00:00.000Z"),
      updatedAt: new Date("2026-03-20T08:00:00.000Z"),
    });

    const customerQuery: CustomerQueryPort = {
      getCustomerBillingSnapshot: async () => ({
        customerPartyId: "party-client-1",
        displayName: "Overlap Client",
        email: "client@example.com",
        billingEmail: "billing@example.com",
        addressLine1: null,
        addressLine2: null,
        city: null,
        postalCode: null,
        country: null,
        vatId: null,
      }),
    };

    const useCase = new BookCoachingEngagementUseCase({
      logger: new NoopLogger(),
      repo: repo as unknown as CoachingEngagementRepositoryPort,
      customerQuery,
      idGenerator: new FakeIdGenerator("coach"),
      clock: new FixedClock(new Date("2026-03-20T10:00:00.000Z")),
      audit: new RecordingAuditPort() as any,
      outbox: new RecordingOutboxPort() as any,
      idempotency: new InMemoryIdempotency(),
      uow,
    });

    await expect(
      useCase.execute(
        {
          clientPartyId: "party-client-1",
          coachUserId: "coach-user-1",
          locale: "en",
          offer: {
            title: { en: "Executive coaching" },
            currency: "EUR",
            priceCents: 15000,
            sessionDurationMinutes: 60,
            meetingType: "video",
            availabilityRule: {
              timezone: "Europe/Berlin",
              weeklySlots: [{ dayOfWeek: 2, startTime: "10:00", endTime: "14:00" }],
              blackouts: [],
            },
            bookingRules: {
              minNoticeHours: 24,
              maxAdvanceDays: 30,
              bufferBeforeMinutes: 0,
              bufferAfterMinutes: 0,
            },
            contractRequired: true,
            paymentRequired: true,
            localeDefault: "en",
          },
          session: {
            startAt: "2026-03-25T09:30:00.000Z",
            endAt: "2026-03-25T10:30:00.000Z",
          },
        },
        {
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          userId: "user-1",
          correlationId: "corr-2",
        }
      )
    ).resolves.toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: "Selected slot is no longer available",
      }),
    });
  });
});
