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
import { CreateCoachingOfferInputSchema, type ArchiveCoachingOfferInput } from "@corely/contracts";
import { CreateCoachingOfferUseCase } from "./create-coaching-offer.usecase";
import { UpdateCoachingOfferUseCase } from "./update-coaching-offer.usecase";
import { ArchiveCoachingOfferUseCase } from "./archive-coaching-offer.usecase";
import { ListCoachingOffersUseCase } from "./list-coaching-offers.usecase";
import type { CoachingOfferRecord } from "../../domain/coaching.types";

class InMemoryCoachingOfferRepo {
  offers: CoachingOfferRecord[] = [];

  async createOffer(offer: CoachingOfferRecord): Promise<CoachingOfferRecord> {
    this.offers.push(offer);
    return offer;
  }

  async updateOffer(offer: CoachingOfferRecord): Promise<CoachingOfferRecord> {
    const index = this.offers.findIndex((entry) => entry.id === offer.id);
    this.offers[index] = offer;
    return offer;
  }

  async findOfferById(
    tenantId: string,
    workspaceId: string,
    offerId: string
  ): Promise<CoachingOfferRecord | null> {
    return (
      this.offers.find(
        (offer) =>
          offer.id === offerId &&
          offer.tenantId === tenantId &&
          (offer.workspaceId === workspaceId || offer.workspaceId === null)
      ) ?? null
    );
  }

  async listOffers(
    tenantId: string,
    workspaceId: string,
    filters: { q?: string; includeArchived?: boolean }
  ) {
    const items = this.offers.filter(
      (offer) =>
        offer.tenantId === tenantId &&
        (offer.workspaceId === workspaceId || offer.workspaceId === null) &&
        (filters.includeArchived ? true : !offer.archivedAt)
    );
    return { items, total: items.length };
  }

  async findPublicOfferById(offerId: string): Promise<CoachingOfferRecord | null> {
    return this.offers.find((offer) => offer.id === offerId && !offer.archivedAt) ?? null;
  }

  async createEngagement() {
    throw new Error("not implemented");
  }

  async updateEngagement() {
    throw new Error("not implemented");
  }

  async findEngagementById() {
    return null;
  }

  async findEngagementByContractTokenHash() {
    return null;
  }

  async findEngagementByCheckoutSessionId() {
    return null;
  }

  async listEngagements() {
    return { items: [], total: 0 };
  }

  async createSession() {
    throw new Error("not implemented");
  }

  async updateSession() {
    throw new Error("not implemented");
  }

  async findSessionById() {
    return null;
  }

  async findSessionByPrepTokenHash() {
    return null;
  }

  async findSessionByDebriefTokenHash() {
    return null;
  }

  async listSessions() {
    return { items: [], total: 0 };
  }

  async hasCoachSessionConflict() {
    return false;
  }

  async createBookingHold() {
    throw new Error("not implemented");
  }

  async findBookingHoldById() {
    return null;
  }

  async updateBookingHold() {
    throw new Error("not implemented");
  }

  async hasActiveHoldConflict() {
    return false;
  }

  async createTimelineEntry() {
    throw new Error("not implemented");
  }

  async listTimeline() {
    return [];
  }

  async createArtifactBundle() {
    throw new Error("not implemented");
  }

  async updateArtifactBundle() {
    throw new Error("not implemented");
  }

  async findLatestArtifactBundle() {
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

const baseInput = {
  title: { en: "Executive coaching" },
  description: { en: "High-touch leadership coaching" },
  currency: "EUR",
  priceCents: 18000,
  sessionDurationMinutes: 75,
  meetingType: "video" as const,
  availabilityRule: {
    timezone: "Europe/Berlin",
    weeklySlots: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
    blackouts: [],
  },
  bookingRules: {
    minNoticeHours: 48,
    maxAdvanceDays: 90,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 10,
  },
  contractRequired: true,
  paymentRequired: true,
  localeDefault: "en",
  contractTemplate: { en: "Standard agreement" },
  prepFormTemplate: null,
  debriefTemplate: null,
} as const;

describe("coaching offer workflows", () => {
  it("rejects missing required fields at the contract boundary", () => {
    expect(() =>
      CreateCoachingOfferInputSchema.parse({
        ...baseInput,
        title: {},
      })
    ).toThrow();

    expect(() =>
      CreateCoachingOfferInputSchema.parse({
        ...baseInput,
        priceCents: -1,
      })
    ).toThrow();

    expect(() =>
      CreateCoachingOfferInputSchema.parse({
        ...baseInput,
        availabilityRule: {
          timezone: "Europe/Berlin",
          weeklySlots: [],
          blackouts: [],
        },
      })
    ).toThrow();
  });

  it("creates and updates an offer while preserving price, duration, timezone, and booking rules", async () => {
    const repo = new InMemoryCoachingOfferRepo();
    const audit = new RecordingAuditPort();
    const outbox = new RecordingOutboxPort();
    const createOffer = new CreateCoachingOfferUseCase({
      logger: new NoopLogger(),
      repo: repo as any,
      idGenerator: new FakeIdGenerator("offer"),
      clock: new FixedClock(new Date("2026-03-22T10:00:00.000Z")),
      audit: audit as any,
      outbox: outbox as any,
      idempotency: new InMemoryIdempotency(),
      uow,
    });
    const updateOffer = new UpdateCoachingOfferUseCase({
      logger: new NoopLogger(),
      repo: repo as any,
      clock: new FixedClock(new Date("2026-03-22T12:00:00.000Z")),
      audit: audit as any,
    });

    const ctx = {
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "coach-1",
      correlationId: "corr-1",
    };

    const created = unwrap(await createOffer.execute(baseInput, ctx));
    expect(created.offer.priceCents).toBe(18000);
    expect(created.offer.sessionDurationMinutes).toBe(75);
    expect(created.offer.availabilityRule.timezone).toBe("Europe/Berlin");
    expect(created.offer.bookingRules.minNoticeHours).toBe(48);
    expect(outbox.events).toHaveLength(1);

    const updated = unwrap(
      await updateOffer.execute(
        {
          offerId: created.offer.id,
          priceCents: 22000,
          sessionDurationMinutes: 90,
          availabilityRule: {
            timezone: "America/New_York",
            weeklySlots: [{ dayOfWeek: 2, startTime: "10:00", endTime: "16:00" }],
            blackouts: [],
          },
          bookingRules: {
            minNoticeHours: 24,
            maxAdvanceDays: 45,
            bufferBeforeMinutes: 5,
            bufferAfterMinutes: 5,
          },
        },
        ctx
      )
    );

    expect(updated.offer.priceCents).toBe(22000);
    expect(updated.offer.sessionDurationMinutes).toBe(90);
    expect(updated.offer.availabilityRule.timezone).toBe("America/New_York");
    expect(updated.offer.bookingRules.maxAdvanceDays).toBe(45);
    expect(audit.entries.length).toBeGreaterThanOrEqual(2);
  });

  it("archives offers and excludes them from the default list", async () => {
    const repo = new InMemoryCoachingOfferRepo();
    const audit = new RecordingAuditPort();
    const outbox = new RecordingOutboxPort();
    const createOffer = new CreateCoachingOfferUseCase({
      logger: new NoopLogger(),
      repo: repo as any,
      idGenerator: new FakeIdGenerator("offer"),
      clock: new FixedClock(new Date("2026-03-22T10:00:00.000Z")),
      audit: audit as any,
      outbox: outbox as any,
      idempotency: new InMemoryIdempotency(),
      uow,
    });
    const archiveOffer = new ArchiveCoachingOfferUseCase({
      logger: new NoopLogger(),
      repo: repo as any,
      clock: new FixedClock(new Date("2026-03-22T13:00:00.000Z")),
      audit: audit as any,
    });
    const listOffers = new ListCoachingOffersUseCase({
      logger: new NoopLogger(),
      repo: repo as any,
    });

    const ctx = {
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "coach-1",
      correlationId: "corr-1",
    };

    const created = unwrap(await createOffer.execute(baseInput, ctx));
    const archived = unwrap(
      await archiveOffer.execute(
        { offerId: created.offer.id } satisfies ArchiveCoachingOfferInput,
        ctx
      )
    );
    expect(archived.offer.archivedAt).toBeTruthy();

    const activeList = unwrap(await listOffers.execute({ page: 1, pageSize: 20 }, ctx));
    expect(activeList.items).toHaveLength(0);

    const allList = unwrap(
      await listOffers.execute({ page: 1, pageSize: 20, includeArchived: true }, ctx)
    );
    expect(allList.items).toHaveLength(1);
  });
});
