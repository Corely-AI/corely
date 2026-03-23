import type { TransactionContext } from "@corely/kernel";
import type {
  CoachingArtifactBundleRecord,
  CoachingBookingHoldRecord,
  CoachingContractRequestRecord,
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingPaymentProviderEventRecord,
  CoachingPaymentRecord,
  CoachingSessionRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";
import type {
  CoachingContractStatus,
  CoachingEngagementStatus,
  CoachingPaymentStatus,
} from "@corely/contracts";

export type CoachingListResult<T> = {
  items: T[];
  total: number;
};

export interface CoachingEngagementRepositoryPort {
  createOffer(offer: CoachingOfferRecord, tx?: TransactionContext): Promise<CoachingOfferRecord>;
  updateOffer(offer: CoachingOfferRecord, tx?: TransactionContext): Promise<CoachingOfferRecord>;
  findOfferById(
    tenantId: string,
    workspaceId: string,
    offerId: string,
    tx?: TransactionContext
  ): Promise<CoachingOfferRecord | null>;
  listOffers(
    tenantId: string,
    workspaceId: string,
    filters: { q?: string; includeArchived?: boolean },
    pagination: { page: number; pageSize: number }
  ): Promise<CoachingListResult<CoachingOfferRecord>>;
  findPublicOfferById(offerId: string, tx?: TransactionContext): Promise<CoachingOfferRecord | null>;
  createEngagement(
    engagement: CoachingEngagementRecord,
    tx?: TransactionContext
  ): Promise<CoachingEngagementRecord>;
  createContractRequest(
    request: CoachingContractRequestRecord,
    tx?: TransactionContext
  ): Promise<CoachingContractRequestRecord>;
  updateContractRequest(
    request: CoachingContractRequestRecord,
    tx?: TransactionContext
  ): Promise<CoachingContractRequestRecord>;
  updateEngagement(
    engagement: CoachingEngagementRecord,
    tx?: TransactionContext
  ): Promise<CoachingEngagementRecord>;
  findEngagementById(
    tenantId: string,
    workspaceId: string,
    engagementId: string,
    tx?: TransactionContext
  ): Promise<(CoachingEngagementRecord & { offer: CoachingOfferRecord }) | null>;
  findEngagementByContractTokenHash(
    tenantId: string,
    engagementId: string,
    tokenHash: string,
    tx?: TransactionContext
  ): Promise<(CoachingEngagementRecord & { offer: CoachingOfferRecord }) | null>;
  findEngagementByCheckoutSessionId(
    tenantId: string,
    checkoutSessionId: string,
    tx?: TransactionContext
  ): Promise<(CoachingEngagementRecord & { offer: CoachingOfferRecord }) | null>;
  findLatestContractRequestByEngagement(
    tenantId: string,
    engagementId: string,
    tx?: TransactionContext
  ): Promise<CoachingContractRequestRecord | null>;
  findContractRequestByTokenHash(
    tenantId: string,
    engagementId: string,
    tokenHash: string,
    tx?: TransactionContext
  ): Promise<CoachingContractRequestRecord | null>;
  listEngagements(
    tenantId: string,
    workspaceId: string,
    filters: {
      q?: string;
      status?: CoachingEngagementStatus;
      coachUserId?: string;
      clientPartyId?: string;
    },
    pagination: { page: number; pageSize: number }
  ): Promise<CoachingListResult<CoachingEngagementRecord & { offer: CoachingOfferRecord }>>;

  createSession(
    session: CoachingSessionRecord,
    tx?: TransactionContext
  ): Promise<CoachingSessionRecord>;
  updateSession(
    session: CoachingSessionRecord,
    tx?: TransactionContext
  ): Promise<CoachingSessionRecord>;
  findSessionById(
    tenantId: string,
    workspaceId: string,
    sessionId: string,
    tx?: TransactionContext
  ): Promise<
    | (CoachingSessionRecord & {
        engagement: CoachingEngagementRecord & { offer: CoachingOfferRecord };
      })
    | null
  >;
  findSessionByPrepTokenHash(
    tenantId: string,
    sessionId: string,
    tokenHash: string,
    tx?: TransactionContext
  ): Promise<
    | (CoachingSessionRecord & {
        engagement: CoachingEngagementRecord & { offer: CoachingOfferRecord };
      })
    | null
  >;
  findSessionByDebriefTokenHash(
    tenantId: string,
    sessionId: string,
    tokenHash: string,
    tx?: TransactionContext
  ): Promise<
    | (CoachingSessionRecord & {
        engagement: CoachingEngagementRecord & { offer: CoachingOfferRecord };
      })
    | null
  >;
  listSessions(
    tenantId: string,
    workspaceId: string,
    filters: { engagementId?: string; status?: string },
    pagination: { page: number; pageSize: number }
  ): Promise<CoachingListResult<CoachingSessionRecord>>;
  hasCoachSessionConflict(
    tenantId: string,
    coachUserId: string,
    startAt: Date,
    endAt: Date,
    options?: { excludeSessionId?: string },
    tx?: TransactionContext
  ): Promise<boolean>;
  createBookingHold(
    hold: CoachingBookingHoldRecord,
    tx?: TransactionContext
  ): Promise<CoachingBookingHoldRecord>;
  findBookingHoldById(
    tenantId: string,
    holdId: string,
    tx?: TransactionContext
  ): Promise<CoachingBookingHoldRecord | null>;
  updateBookingHold(
    hold: CoachingBookingHoldRecord,
    tx?: TransactionContext
  ): Promise<CoachingBookingHoldRecord>;
  hasActiveHoldConflict(
    tenantId: string,
    coachUserId: string,
    startAt: Date,
    endAt: Date,
    now: Date,
    options?: { excludeHoldId?: string },
    tx?: TransactionContext
  ): Promise<boolean>;
  createPayment(
    payment: CoachingPaymentRecord,
    tx?: TransactionContext
  ): Promise<CoachingPaymentRecord>;
  updatePayment(
    payment: CoachingPaymentRecord,
    tx?: TransactionContext
  ): Promise<CoachingPaymentRecord>;
  findPaymentById(
    tenantId: string,
    paymentId: string,
    tx?: TransactionContext
  ): Promise<CoachingPaymentRecord | null>;
  listPaymentsByEngagement(
    tenantId: string,
    engagementId: string,
    tx?: TransactionContext
  ): Promise<CoachingPaymentRecord[]>;
  findLatestPaymentByEngagement(
    tenantId: string,
    engagementId: string,
    tx?: TransactionContext
  ): Promise<CoachingPaymentRecord | null>;
  createProviderEventIfAbsent(
    event: CoachingPaymentProviderEventRecord,
    tx?: TransactionContext
  ): Promise<boolean>;

  createTimelineEntry(
    entry: CoachingTimelineEntryRecord,
    tx?: TransactionContext
  ): Promise<CoachingTimelineEntryRecord>;
  listTimeline(tenantId: string, engagementId: string): Promise<CoachingTimelineEntryRecord[]>;

  createArtifactBundle(
    bundle: CoachingArtifactBundleRecord,
    tx?: TransactionContext
  ): Promise<CoachingArtifactBundleRecord>;
  updateArtifactBundle(
    bundle: CoachingArtifactBundleRecord,
    tx?: TransactionContext
  ): Promise<CoachingArtifactBundleRecord>;
  findLatestArtifactBundle(
    tenantId: string,
    engagementId: string,
    tx?: TransactionContext
  ): Promise<CoachingArtifactBundleRecord | null>;
}

export const COACHING_ENGAGEMENT_REPOSITORY = "coaching-engagements/coaching-engagement-repository";
