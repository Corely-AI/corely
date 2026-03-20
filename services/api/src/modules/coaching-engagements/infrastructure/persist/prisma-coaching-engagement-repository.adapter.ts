import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { type TransactionContext } from "@corely/kernel";
import { getPrismaClient } from "@corely/data";
import {
  type CoachingEngagementRepositoryPort,
  type CoachingListResult,
} from "../../application/ports/coaching-engagement-repository.port";
import type {
  CoachingArtifactBundleRecord,
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingSessionRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";

const mapOffer = (row: any): CoachingOfferRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  title: row.titleJson,
  description: row.descriptionJson,
  currency: row.currency,
  priceCents: row.priceCents,
  sessionDurationMinutes: row.sessionDurationMinutes,
  contractRequired: row.contractRequired,
  paymentRequired: row.paymentRequired,
  localeDefault: row.localeDefault,
  contractLabel: row.contractLabelJson,
  prepFormTemplate: row.prepFormTemplateJson,
  debriefTemplate: row.debriefTemplateJson,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapEngagement = (row: any): CoachingEngagementRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  offerId: row.offerId,
  clientPartyId: row.clientPartyId,
  coachPartyId: row.coachPartyId,
  coachUserId: row.coachUserId,
  locale: row.locale,
  status: row.status,
  paymentStatus: row.paymentStatus,
  contractStatus: row.contractStatus,
  legalEntityId: row.legalEntityId,
  paymentMethodId: row.paymentMethodId,
  invoiceId: row.invoiceId,
  stripeCheckoutSessionId: row.stripeCheckoutSessionId,
  stripeCheckoutUrl: row.stripeCheckoutUrl,
  stripePaymentIntentId: row.stripePaymentIntentId,
  contractAccessTokenHash: row.contractAccessTokenHash,
  contractRequestedAt: row.contractRequestedAt,
  contractSignedAt: row.contractSignedAt,
  contractDraftDocumentId: row.contractDraftDocumentId,
  signedContractDocumentId: row.signedContractDocumentId,
  latestSummary: row.latestSummary,
  archivedAt: row.archivedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapSession = (row: any): CoachingSessionRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  engagementId: row.engagementId,
  status: row.status,
  sequenceNo: row.sequenceNo,
  startAt: row.startAt,
  endAt: row.endAt,
  meetingProvider: row.meetingProvider,
  meetingLink: row.meetingLink,
  meetingIssuedAt: row.meetingIssuedAt,
  prepAccessTokenHash: row.prepAccessTokenHash,
  prepRequestedAt: row.prepRequestedAt,
  prepSubmittedAt: row.prepSubmittedAt,
  prepDocumentId: row.prepDocumentId,
  debriefAccessTokenHash: row.debriefAccessTokenHash,
  debriefRequestedAt: row.debriefRequestedAt,
  debriefSubmittedAt: row.debriefSubmittedAt,
  debriefDocumentId: row.debriefDocumentId,
  completedAt: row.completedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapTimeline = (row: any): CoachingTimelineEntryRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  engagementId: row.engagementId,
  eventType: row.eventType,
  stateFrom: row.stateFrom,
  stateTo: row.stateTo,
  actorUserId: row.actorUserId,
  metadata: row.metadataJson,
  occurredAt: row.occurredAt,
  createdAt: row.createdAt,
});

const mapBundle = (row: any): CoachingArtifactBundleRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  engagementId: row.engagementId,
  status: row.status,
  documentId: row.documentId,
  requestedByUserId: row.requestedByUserId,
  requestedAt: row.requestedAt,
  completedAt: row.completedAt,
  errorMessage: row.errorMessage,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaCoachingEngagementRepositoryAdapter implements CoachingEngagementRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createOffer(
    offer: CoachingOfferRecord,
    tx?: TransactionContext
  ): Promise<CoachingOfferRecord> {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingOffer.create({
      data: {
        id: offer.id,
        tenantId: offer.tenantId,
        workspaceId: offer.workspaceId,
        titleJson: offer.title,
        descriptionJson: offer.description,
        currency: offer.currency,
        priceCents: offer.priceCents,
        sessionDurationMinutes: offer.sessionDurationMinutes,
        contractRequired: offer.contractRequired,
        paymentRequired: offer.paymentRequired,
        localeDefault: offer.localeDefault,
        contractLabelJson: offer.contractLabel,
        prepFormTemplateJson: offer.prepFormTemplate,
        debriefTemplateJson: offer.debriefTemplate,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      },
    });
    return mapOffer(row);
  }

  async findOfferById(
    tenantId: string,
    workspaceId: string,
    offerId: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingOffer.findFirst({
      where: { id: offerId, tenantId, OR: [{ workspaceId }, { workspaceId: null }] },
    });
    return row ? mapOffer(row) : null;
  }

  async createEngagement(engagement: CoachingEngagementRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingEngagement.create({ data: { ...engagement } });
    return mapEngagement(row);
  }

  async updateEngagement(engagement: CoachingEngagementRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingEngagement.update({
      where: { id: engagement.id },
      data: {
        workspaceId: engagement.workspaceId,
        offerId: engagement.offerId,
        clientPartyId: engagement.clientPartyId,
        coachPartyId: engagement.coachPartyId,
        coachUserId: engagement.coachUserId,
        locale: engagement.locale,
        status: engagement.status,
        paymentStatus: engagement.paymentStatus,
        contractStatus: engagement.contractStatus,
        legalEntityId: engagement.legalEntityId,
        paymentMethodId: engagement.paymentMethodId,
        invoiceId: engagement.invoiceId,
        stripeCheckoutSessionId: engagement.stripeCheckoutSessionId,
        stripeCheckoutUrl: engagement.stripeCheckoutUrl,
        stripePaymentIntentId: engagement.stripePaymentIntentId,
        contractAccessTokenHash: engagement.contractAccessTokenHash,
        contractRequestedAt: engagement.contractRequestedAt,
        contractSignedAt: engagement.contractSignedAt,
        contractDraftDocumentId: engagement.contractDraftDocumentId,
        signedContractDocumentId: engagement.signedContractDocumentId,
        latestSummary: engagement.latestSummary,
        archivedAt: engagement.archivedAt,
        updatedAt: engagement.updatedAt,
      },
    });
    return mapEngagement(row);
  }

  async findEngagementById(
    tenantId: string,
    workspaceId: string,
    engagementId: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingEngagement.findFirst({
      where: { id: engagementId, tenantId, workspaceId },
      include: { offer: true },
    });
    if (!row) {
      return null;
    }
    return { ...mapEngagement(row), offer: mapOffer(row.offer) };
  }

  async findEngagementByContractTokenHash(
    tenantId: string,
    engagementId: string,
    tokenHash: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingEngagement.findFirst({
      where: { id: engagementId, tenantId, contractAccessTokenHash: tokenHash },
      include: { offer: true },
    });
    return row ? { ...mapEngagement(row), offer: mapOffer(row.offer) } : null;
  }

  async findEngagementByCheckoutSessionId(
    tenantId: string,
    checkoutSessionId: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingEngagement.findFirst({
      where: { tenantId, stripeCheckoutSessionId: checkoutSessionId },
      include: { offer: true },
    });
    return row ? { ...mapEngagement(row), offer: mapOffer(row.offer) } : null;
  }

  async listEngagements(
    tenantId: string,
    workspaceId: string,
    filters: { q?: string; status?: any; coachUserId?: string; clientPartyId?: string },
    pagination: { page: number; pageSize: number }
  ): Promise<CoachingListResult<CoachingEngagementRecord & { offer: CoachingOfferRecord }>> {
    const where: any = { tenantId, workspaceId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.coachUserId) {
      where.coachUserId = filters.coachUserId;
    }
    if (filters.clientPartyId) {
      where.clientPartyId = filters.clientPartyId;
    }
    if (filters.q) {
      where.OR = [
        { id: { contains: filters.q, mode: "insensitive" } },
        { clientPartyId: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.coachingEngagement.findMany({
        where,
        include: { offer: true },
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.coachingEngagement.count({ where }),
    ]);

    return {
      items: items.map((item) => ({ ...mapEngagement(item), offer: mapOffer(item.offer) })),
      total,
    };
  }

  async createSession(session: CoachingSessionRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingSession.create({ data: { ...session } });
    return mapSession(row);
  }

  async updateSession(session: CoachingSessionRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingSession.update({
      where: { id: session.id },
      data: {
        status: session.status,
        sequenceNo: session.sequenceNo,
        startAt: session.startAt,
        endAt: session.endAt,
        meetingProvider: session.meetingProvider,
        meetingLink: session.meetingLink,
        meetingIssuedAt: session.meetingIssuedAt,
        prepAccessTokenHash: session.prepAccessTokenHash,
        prepRequestedAt: session.prepRequestedAt,
        prepSubmittedAt: session.prepSubmittedAt,
        prepDocumentId: session.prepDocumentId,
        debriefAccessTokenHash: session.debriefAccessTokenHash,
        debriefRequestedAt: session.debriefRequestedAt,
        debriefSubmittedAt: session.debriefSubmittedAt,
        debriefDocumentId: session.debriefDocumentId,
        completedAt: session.completedAt,
        updatedAt: session.updatedAt,
      },
    });
    return mapSession(row);
  }

  async findSessionById(
    tenantId: string,
    workspaceId: string,
    sessionId: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingSession.findFirst({
      where: { id: sessionId, tenantId, workspaceId },
      include: { engagement: { include: { offer: true } } },
    });
    if (!row) {
      return null;
    }
    return {
      ...mapSession(row),
      engagement: {
        ...mapEngagement(row.engagement),
        offer: mapOffer(row.engagement.offer),
      },
    };
  }

  async findSessionByPrepTokenHash(
    tenantId: string,
    sessionId: string,
    tokenHash: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingSession.findFirst({
      where: { id: sessionId, tenantId, prepAccessTokenHash: tokenHash },
      include: { engagement: { include: { offer: true } } },
    });
    if (!row) {
      return null;
    }
    return {
      ...mapSession(row),
      engagement: {
        ...mapEngagement(row.engagement),
        offer: mapOffer(row.engagement.offer),
      },
    };
  }

  async findSessionByDebriefTokenHash(
    tenantId: string,
    sessionId: string,
    tokenHash: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingSession.findFirst({
      where: { id: sessionId, tenantId, debriefAccessTokenHash: tokenHash },
      include: { engagement: { include: { offer: true } } },
    });
    if (!row) {
      return null;
    }
    return {
      ...mapSession(row),
      engagement: {
        ...mapEngagement(row.engagement),
        offer: mapOffer(row.engagement.offer),
      },
    };
  }

  async listSessions(
    tenantId: string,
    workspaceId: string,
    filters: { engagementId?: string; status?: string },
    pagination: { page: number; pageSize: number }
  ): Promise<CoachingListResult<CoachingSessionRecord>> {
    const where: any = { tenantId, workspaceId };
    if (filters.engagementId) {
      where.engagementId = filters.engagementId;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.coachingSession.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.coachingSession.count({ where }),
    ]);

    return { items: items.map(mapSession), total };
  }

  async createTimelineEntry(entry: CoachingTimelineEntryRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingEngagementEvent.create({
      data: {
        id: entry.id,
        tenantId: entry.tenantId,
        workspaceId: entry.workspaceId,
        engagementId: entry.engagementId,
        eventType: entry.eventType,
        stateFrom: entry.stateFrom,
        stateTo: entry.stateTo,
        actorUserId: entry.actorUserId,
        metadataJson: (entry.metadata ?? undefined) as any,
        occurredAt: entry.occurredAt,
        createdAt: entry.createdAt,
      },
    });
    return mapTimeline(row);
  }

  async listTimeline(tenantId: string, engagementId: string) {
    const rows = await this.prisma.coachingEngagementEvent.findMany({
      where: { tenantId, engagementId },
      orderBy: { occurredAt: "desc" },
    });
    return rows.map(mapTimeline);
  }

  async createArtifactBundle(bundle: CoachingArtifactBundleRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingArtifactBundle.create({ data: { ...bundle } });
    return mapBundle(row);
  }

  async updateArtifactBundle(bundle: CoachingArtifactBundleRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingArtifactBundle.update({
      where: { id: bundle.id },
      data: {
        status: bundle.status,
        documentId: bundle.documentId,
        completedAt: bundle.completedAt,
        errorMessage: bundle.errorMessage,
        updatedAt: bundle.updatedAt,
      },
    });
    return mapBundle(row);
  }

  async findLatestArtifactBundle(tenantId: string, engagementId: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingArtifactBundle.findFirst({
      where: { tenantId, engagementId },
      orderBy: { requestedAt: "desc" },
    });
    return row ? mapBundle(row) : null;
  }
}
