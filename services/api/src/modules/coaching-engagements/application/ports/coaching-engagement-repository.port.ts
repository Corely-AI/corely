import type { TransactionContext } from "@corely/kernel";
import type {
  CoachingArtifactBundleRecord,
  CoachingEngagementRecord,
  CoachingOfferRecord,
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
  findOfferById(
    tenantId: string,
    workspaceId: string,
    offerId: string,
    tx?: TransactionContext
  ): Promise<CoachingOfferRecord | null>;
  createEngagement(
    engagement: CoachingEngagementRecord,
    tx?: TransactionContext
  ): Promise<CoachingEngagementRecord>;
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
