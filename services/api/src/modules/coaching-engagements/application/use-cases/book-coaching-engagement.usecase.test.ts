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
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingSessionRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";

class InMemoryCoachingRepo {
  offers: CoachingOfferRecord[] = [];
  engagements: CoachingEngagementRecord[] = [];
  sessions: CoachingSessionRecord[] = [];
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
        contractRequired: true,
        paymentRequired: true,
        localeDefault: "en",
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
});
