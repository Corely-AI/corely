import { describe, expect, it } from "vitest";
import {
  FakeIdGenerator,
  FixedClock,
  NoopLogger,
  unwrap,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { SignCoachingContractUseCase } from "./sign-coaching-contract.usecase";
import { hashCoachingAccessToken } from "../../domain/coaching-tokens";
import type {
  CoachingContractRequestRecord,
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";
import type { CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

const offer: CoachingOfferRecord = {
  id: "offer-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  coachUserId: "coach-1",
  title: { en: "Executive coaching" },
  description: null,
  currency: "EUR",
  priceCents: 12000,
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
  contractTemplate: { en: "Current mutable template" },
  contractLabel: { en: "Executive coaching agreement" },
  prepFormTemplate: null,
  debriefTemplate: null,
  archivedAt: null,
  createdAt: new Date("2026-03-20T09:00:00.000Z"),
  updatedAt: new Date("2026-03-20T09:00:00.000Z"),
};

const makeEngagement = (): CoachingEngagementRecord => ({
  id: "eng-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  offerId: "offer-1",
  clientPartyId: "party-client-1",
  coachPartyId: null,
  coachUserId: "coach-1",
  locale: "en",
  status: "pending_signature",
  paymentStatus: "captured",
  contractStatus: "pending",
  legalEntityId: null,
  paymentMethodId: null,
  invoiceId: null,
  stripeCheckoutSessionId: null,
  stripeCheckoutUrl: null,
  stripePaymentIntentId: null,
  contractAccessTokenHash: "hash-1",
  contractRequestedAt: new Date("2026-03-20T09:00:00.000Z"),
  contractSignedAt: null,
  contractDraftDocumentId: "draft-doc-1",
  signedContractDocumentId: null,
  latestSummary: null,
  archivedAt: null,
  createdAt: new Date("2026-03-20T09:00:00.000Z"),
  updatedAt: new Date("2026-03-20T09:00:00.000Z"),
});

const makeRequest = (): CoachingContractRequestRecord => ({
  id: "req-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  engagementId: "eng-1",
  clientPartyId: "party-client-1",
  provider: "corely-internal",
  status: "viewed",
  requestToken: "plain-token",
  requestTokenHash: hashCoachingAccessToken("n"),
  templateLocale: "de",
  contractTitle: "Executive coaching agreement",
  contractBody: "Versioned contract snapshot from request",
  recipientName: "Acme Client",
  recipientEmail: "client@example.com",
  signerName: null,
  signerEmail: null,
  requestedAt: new Date("2026-03-20T09:00:00.000Z"),
  deliveredAt: new Date("2026-03-20T09:01:00.000Z"),
  viewedAt: new Date("2026-03-20T09:02:00.000Z"),
  completedAt: null,
  draftDocumentId: "draft-doc-1",
  signedDocumentId: null,
  createdAt: new Date("2026-03-20T09:00:00.000Z"),
  updatedAt: new Date("2026-03-20T09:02:00.000Z"),
});

const uow: UnitOfWorkPort = {
  async withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return fn({} as TransactionContext);
  },
};

describe("SignCoachingContractUseCase", () => {
  it("signs against the stored contract snapshot and updates the request once", async () => {
    const engagement = makeEngagement();
    const request = makeRequest();
    const timeline: CoachingTimelineEntryRecord[] = [];

    const repo: CoachingEngagementRepositoryPort = {
      createOffer: async () => offer,
      updateOffer: async () => offer,
      findOfferById: async () => offer,
      listOffers: async () => ({ items: [], total: 0 }),
      findPublicOfferById: async () => offer,
      createEngagement: async () => engagement,
      createContractRequest: async () => request,
      updateContractRequest: async (next) => Object.assign(request, next),
      updateEngagement: async (next) => Object.assign(engagement, next),
      findEngagementById: async () => ({ ...engagement, offer }),
      findEngagementByContractTokenHash: async () => ({ ...engagement, offer }),
      findEngagementByCheckoutSessionId: async () => null,
      findLatestContractRequestByEngagement: async () => request,
      findContractRequestByTokenHash: async () => request,
      listEngagements: async () => ({ items: [], total: 0 }),
      createSession: async () => {
        throw new Error("not used");
      },
      updateSession: async () => {
        throw new Error("not used");
      },
      findSessionById: async () => null,
      findSessionByPrepTokenHash: async () => null,
      findSessionByDebriefTokenHash: async () => null,
      listSessions: async () => ({ items: [], total: 0 }),
      hasCoachSessionConflict: async () => false,
      createBookingHold: async () => {
        throw new Error("not used");
      },
      findBookingHoldById: async () => null,
      updateBookingHold: async () => {
        throw new Error("not used");
      },
      hasActiveHoldConflict: async () => false,
      createPayment: async () => {
        throw new Error("not used");
      },
      updatePayment: async () => {
        throw new Error("not used");
      },
      findPaymentById: async () => null,
      listPaymentsByEngagement: async () => [],
      findLatestPaymentByEngagement: async () => null,
      createProviderEventIfAbsent: async () => false,
      createTimelineEntry: async (entry) => {
        timeline.push(entry);
        return entry;
      },
      listTimeline: async () => [],
      createArtifactBundle: async () => {
        throw new Error("not used");
      },
      updateArtifactBundle: async () => {
        throw new Error("not used");
      },
      findLatestArtifactBundle: async () => null,
    };

    const auditEntries: Array<Record<string, unknown>> = [];
    const outboxEvents: Array<Record<string, unknown>> = [];

    const useCase = new SignCoachingContractUseCase({
      logger: new NoopLogger(),
      repo,
      artifactService: {
        createPdfArtifact: async ({ bytes }: { bytes: Uint8Array }) => {
          const text = new TextDecoder().decode(bytes);
          expect(text).toContain("Versioned contract snapshot from request");
          expect(text).not.toContain("Current mutable template");
          return { documentId: "signed-doc-1" };
        },
      } as any,
      idGenerator: new FakeIdGenerator("sig"),
      clock: new FixedClock(new Date("2026-03-20T10:00:00.000Z")),
      audit: {
        log: async (entry: Record<string, unknown>) => {
          auditEntries.push(entry);
        },
      } as any,
      outbox: {
        enqueue: async (event: Record<string, unknown>) => {
          outboxEvents.push(event);
        },
      } as any,
      uow,
    });

    const result = unwrap(
      await useCase.execute(
        {
          engagementId: "eng-1",
          token: "n",
          signerName: "Acme Client",
          signerEmail: "client@example.com",
        },
        {
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          correlationId: "corr-1",
        }
      )
    );

    expect(result.engagement.contractStatus).toBe("signed");
    expect(result.engagement.signedContractDocumentId).toBe("signed-doc-1");
    expect(engagement.status).toBe("ready");
    expect(request.status).toBe("signed");
    expect(request.signerEmail).toBe("client@example.com");
    expect(request.signedDocumentId).toBe("signed-doc-1");
    expect(timeline[0]?.metadata).toEqual(
      expect.objectContaining({
        requestId: "req-1",
        signerEmail: "client@example.com",
      })
    );
    expect(outboxEvents[0]).toEqual(
      expect.objectContaining({
        eventType: "coaching.contract.signed",
        payload: expect.objectContaining({
          requestId: "req-1",
          documentId: "signed-doc-1",
        }),
      })
    );
    expect(auditEntries).toHaveLength(1);
  });

  it("rejects a signer email that does not match the requested recipient", async () => {
    const engagement = makeEngagement();
    const request = makeRequest();

    const repo = {
      findContractRequestByTokenHash: async () => request,
      findEngagementById: async () => ({ ...engagement, offer }),
    } satisfies Partial<CoachingEngagementRepositoryPort>;

    const useCase = new SignCoachingContractUseCase({
      logger: new NoopLogger(),
      repo: repo as CoachingEngagementRepositoryPort,
      artifactService: {} as any,
      idGenerator: new FakeIdGenerator("sig"),
      clock: new FixedClock(new Date("2026-03-20T10:00:00.000Z")),
      audit: { log: async () => undefined } as any,
      outbox: { enqueue: async () => undefined } as any,
      uow,
    });

    await expect(
      useCase.execute(
        {
          engagementId: "eng-1",
          token: "n",
          signerName: "Wrong Person",
          signerEmail: "wrong@example.com",
        },
        {
          tenantId: "tenant-1",
          workspaceId: "ws-1",
        }
      )
    ).resolves.toMatchObject({
      ok: false,
      error: expect.objectContaining({
        message: "Signer email must match the requested recipient",
      }),
    });
  });
});
