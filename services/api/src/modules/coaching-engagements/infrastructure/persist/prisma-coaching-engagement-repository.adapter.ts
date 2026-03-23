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
  CoachingBookingHoldRecord,
  CoachingContractRequestRecord,
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingPaymentProviderEventRecord,
  CoachingPaymentRecord,
  CoachingSessionRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";

const mapOffer = (row: any): CoachingOfferRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  coachUserId: row.coachUserId,
  title: row.titleJson,
  description: row.descriptionJson,
  currency: row.currency,
  priceCents: row.priceCents,
  sessionDurationMinutes: row.sessionDurationMinutes,
  meetingType: row.meetingType,
  availabilityRule: row.availabilityRuleJson,
  bookingRules: row.bookingRulesJson,
  contractRequired: row.contractRequired,
  paymentRequired: row.paymentRequired,
  localeDefault: row.localeDefault,
  contractTemplate: row.contractTemplateJson,
  contractLabel: row.contractLabelJson,
  prepFormTemplate: row.prepFormTemplateJson,
  prepFormSendHoursBeforeSession: row.prepFormSendHoursBeforeSession,
  debriefTemplate: row.debriefTemplateJson,
  archivedAt: row.archivedAt,
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

const mapContractRequest = (row: any): CoachingContractRequestRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  engagementId: row.engagementId,
  clientPartyId: row.clientPartyId,
  provider: row.provider,
  status: row.status,
  requestToken: row.requestToken,
  requestTokenHash: row.requestTokenHash,
  templateLocale: row.templateLocale,
  contractTitle: row.contractTitle,
  contractBody: row.contractBody,
  recipientName: row.recipientName,
  recipientEmail: row.recipientEmail,
  signerName: row.signerName,
  signerEmail: row.signerEmail,
  requestedAt: row.requestedAt,
  deliveredAt: row.deliveredAt,
  viewedAt: row.viewedAt,
  completedAt: row.completedAt,
  draftDocumentId: row.draftDocumentId,
  signedDocumentId: row.signedDocumentId,
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
  prepAccessToken: row.prepAccessToken,
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

const mapHold = (row: any): CoachingBookingHoldRecord => ({
  id: row.id,
  offerId: row.offerId,
  coachUserId: row.coachUserId,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  status: row.status,
  startAt: row.startAt,
  endAt: row.endAt,
  expiresAt: row.expiresAt,
  bookedByName: row.bookedByName,
  bookedByEmail: row.bookedByEmail,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapPayment = (row: any): CoachingPaymentRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  engagementId: row.engagementId,
  sessionId: row.sessionId,
  provider: row.provider,
  status: row.status,
  amountCents: row.amountCents,
  refundedAmountCents: row.refundedAmountCents,
  currency: row.currency,
  customerEmail: row.customerEmail,
  providerCheckoutSessionId: row.providerCheckoutSessionId,
  providerCheckoutUrl: row.providerCheckoutUrl,
  providerPaymentRef: row.providerPaymentRef,
  providerRefundRef: row.providerRefundRef,
  failureCode: row.failureCode,
  failureMessage: row.failureMessage,
  checkoutCreatedAt: row.checkoutCreatedAt,
  capturedAt: row.capturedAt,
  failedAt: row.failedAt,
  refundedAt: row.refundedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const mapProviderEvent = (row: any): CoachingPaymentProviderEventRecord => ({
  id: row.id,
  tenantId: row.tenantId,
  provider: row.provider,
  providerEventId: row.providerEventId,
  eventType: row.eventType,
  engagementId: row.engagementId,
  paymentId: row.paymentId,
  payload: row.payloadJson,
  processedAt: row.processedAt,
  createdAt: row.createdAt,
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
        coachUserId: offer.coachUserId,
        titleJson: offer.title,
        descriptionJson: offer.description,
        currency: offer.currency,
        priceCents: offer.priceCents,
        sessionDurationMinutes: offer.sessionDurationMinutes,
        meetingType: offer.meetingType,
        availabilityRuleJson: offer.availabilityRule,
        bookingRulesJson: offer.bookingRules,
        contractRequired: offer.contractRequired,
        paymentRequired: offer.paymentRequired,
        localeDefault: offer.localeDefault,
        contractTemplateJson: offer.contractTemplate,
        contractLabelJson: offer.contractLabel,
        prepFormTemplateJson: offer.prepFormTemplate,
        prepFormSendHoursBeforeSession: offer.prepFormSendHoursBeforeSession ?? null,
        debriefTemplateJson: offer.debriefTemplate,
        archivedAt: offer.archivedAt,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      },
    });
    return mapOffer(row);
  }

  async updateOffer(offer: CoachingOfferRecord, tx?: TransactionContext): Promise<CoachingOfferRecord> {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingOffer.update({
      where: { id: offer.id },
      data: {
        workspaceId: offer.workspaceId,
        coachUserId: offer.coachUserId,
        titleJson: offer.title,
        descriptionJson: offer.description,
        currency: offer.currency,
        priceCents: offer.priceCents,
        sessionDurationMinutes: offer.sessionDurationMinutes,
        meetingType: offer.meetingType,
        availabilityRuleJson: offer.availabilityRule,
        bookingRulesJson: offer.bookingRules,
        contractRequired: offer.contractRequired,
        paymentRequired: offer.paymentRequired,
        localeDefault: offer.localeDefault,
        contractTemplateJson: offer.contractTemplate,
        contractLabelJson: offer.contractLabel,
        prepFormTemplateJson: offer.prepFormTemplate,
        prepFormSendHoursBeforeSession: offer.prepFormSendHoursBeforeSession ?? null,
        debriefTemplateJson: offer.debriefTemplate,
        archivedAt: offer.archivedAt,
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

  async listOffers(
    tenantId: string,
    workspaceId: string,
    filters: { q?: string; includeArchived?: boolean },
    pagination: { page: number; pageSize: number }
  ): Promise<CoachingListResult<CoachingOfferRecord>> {
    const where: any = {
      tenantId,
      OR: [{ workspaceId }, { workspaceId: null }],
      ...(filters.includeArchived ? {} : { archivedAt: null }),
    };

    if (filters.q) {
      where.AND = [
        {
          OR: [{ id: { contains: filters.q, mode: "insensitive" } }],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.coachingOffer.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.coachingOffer.count({ where }),
    ]);

    return { items: items.map(mapOffer), total };
  }

  async findPublicOfferById(offerId: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingOffer.findFirst({
      where: { id: offerId, archivedAt: null },
    });
    return row ? mapOffer(row) : null;
  }

  async createEngagement(engagement: CoachingEngagementRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingEngagement.create({ data: { ...engagement } });
    return mapEngagement(row);
  }

  async createContractRequest(request: CoachingContractRequestRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingContractRequest.create({
      data: {
        id: request.id,
        tenantId: request.tenantId,
        workspaceId: request.workspaceId,
        engagementId: request.engagementId,
        clientPartyId: request.clientPartyId,
        provider: request.provider,
        status: request.status,
        requestToken: request.requestToken,
        requestTokenHash: request.requestTokenHash,
        templateLocale: request.templateLocale,
        contractTitle: request.contractTitle,
        contractBody: request.contractBody,
        recipientName: request.recipientName,
        recipientEmail: request.recipientEmail,
        signerName: request.signerName,
        signerEmail: request.signerEmail,
        requestedAt: request.requestedAt,
        deliveredAt: request.deliveredAt,
        viewedAt: request.viewedAt,
        completedAt: request.completedAt,
        draftDocumentId: request.draftDocumentId,
        signedDocumentId: request.signedDocumentId,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
    });
    return mapContractRequest(row);
  }

  async updateContractRequest(request: CoachingContractRequestRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingContractRequest.update({
      where: { id: request.id },
      data: {
        provider: request.provider,
        status: request.status,
        requestToken: request.requestToken,
        templateLocale: request.templateLocale,
        contractTitle: request.contractTitle,
        contractBody: request.contractBody,
        recipientName: request.recipientName,
        recipientEmail: request.recipientEmail,
        signerName: request.signerName,
        signerEmail: request.signerEmail,
        requestedAt: request.requestedAt,
        deliveredAt: request.deliveredAt,
        viewedAt: request.viewedAt,
        completedAt: request.completedAt,
        draftDocumentId: request.draftDocumentId,
        signedDocumentId: request.signedDocumentId,
        updatedAt: request.updatedAt,
      },
    });
    return mapContractRequest(row);
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

  async findLatestContractRequestByEngagement(
    tenantId: string,
    engagementId: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingContractRequest.findFirst({
      where: { tenantId, engagementId },
      orderBy: [{ requestedAt: "desc" }, { createdAt: "desc" }],
    });
    return row ? mapContractRequest(row) : null;
  }

  async findContractRequestByTokenHash(
    tenantId: string,
    engagementId: string,
    tokenHash: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingContractRequest.findFirst({
      where: { tenantId, engagementId, requestTokenHash: tokenHash },
    });
    return row ? mapContractRequest(row) : null;
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
        prepAccessToken: session.prepAccessToken ?? null,
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

  async hasCoachSessionConflict(
    tenantId: string,
    coachUserId: string,
    startAt: Date,
    endAt: Date,
    options?: { excludeSessionId?: string },
    tx?: TransactionContext
  ): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx);
    const conflict = await client.coachingSession.findFirst({
      where: {
        tenantId,
        status: { not: "cancelled" },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(options?.excludeSessionId ? { id: { not: options.excludeSessionId } } : {}),
        engagement: {
          coachUserId,
          archivedAt: null,
        },
      },
      select: { id: true },
    });
    return Boolean(conflict);
  }

  async createBookingHold(hold: CoachingBookingHoldRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingBookingHold.create({
      data: {
        id: hold.id,
        offerId: hold.offerId,
        coachUserId: hold.coachUserId,
        tenantId: hold.tenantId,
        workspaceId: hold.workspaceId,
        status: hold.status,
        startAt: hold.startAt,
        endAt: hold.endAt,
        expiresAt: hold.expiresAt,
        bookedByName: hold.bookedByName,
        bookedByEmail: hold.bookedByEmail,
        createdAt: hold.createdAt,
        updatedAt: hold.updatedAt,
      },
    });
    return mapHold(row);
  }

  async findBookingHoldById(tenantId: string, holdId: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingBookingHold.findFirst({
      where: { id: holdId, tenantId },
    });
    return row ? mapHold(row) : null;
  }

  async updateBookingHold(hold: CoachingBookingHoldRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingBookingHold.update({
      where: { id: hold.id },
      data: {
        status: hold.status,
        expiresAt: hold.expiresAt,
        bookedByName: hold.bookedByName,
        bookedByEmail: hold.bookedByEmail,
        updatedAt: hold.updatedAt,
      },
    });
    return mapHold(row);
  }

  async hasActiveHoldConflict(
    tenantId: string,
    coachUserId: string,
    startAt: Date,
    endAt: Date,
    now: Date,
    options?: { excludeHoldId?: string },
    tx?: TransactionContext
  ): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx);
    const conflict = await client.coachingBookingHold.findFirst({
      where: {
        tenantId,
        coachUserId,
        status: "active",
        expiresAt: { gt: now },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
        ...(options?.excludeHoldId ? { id: { not: options.excludeHoldId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(conflict);
  }

  async createPayment(payment: CoachingPaymentRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingPayment.create({
      data: {
        id: payment.id,
        tenantId: payment.tenantId,
        workspaceId: payment.workspaceId,
        engagementId: payment.engagementId,
        sessionId: payment.sessionId,
        provider: payment.provider,
        status: payment.status,
        amountCents: payment.amountCents,
        refundedAmountCents: payment.refundedAmountCents,
        currency: payment.currency,
        customerEmail: payment.customerEmail,
        providerCheckoutSessionId: payment.providerCheckoutSessionId,
        providerCheckoutUrl: payment.providerCheckoutUrl,
        providerPaymentRef: payment.providerPaymentRef,
        providerRefundRef: payment.providerRefundRef,
        failureCode: payment.failureCode,
        failureMessage: payment.failureMessage,
        checkoutCreatedAt: payment.checkoutCreatedAt,
        capturedAt: payment.capturedAt,
        failedAt: payment.failedAt,
        refundedAt: payment.refundedAt,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    });
    return mapPayment(row);
  }

  async updatePayment(payment: CoachingPaymentRecord, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingPayment.update({
      where: { id: payment.id },
      data: {
        sessionId: payment.sessionId,
        provider: payment.provider,
        status: payment.status,
        amountCents: payment.amountCents,
        refundedAmountCents: payment.refundedAmountCents,
        currency: payment.currency,
        customerEmail: payment.customerEmail,
        providerCheckoutSessionId: payment.providerCheckoutSessionId,
        providerCheckoutUrl: payment.providerCheckoutUrl,
        providerPaymentRef: payment.providerPaymentRef,
        providerRefundRef: payment.providerRefundRef,
        failureCode: payment.failureCode,
        failureMessage: payment.failureMessage,
        checkoutCreatedAt: payment.checkoutCreatedAt,
        capturedAt: payment.capturedAt,
        failedAt: payment.failedAt,
        refundedAt: payment.refundedAt,
        updatedAt: payment.updatedAt,
      },
    });
    return mapPayment(row);
  }

  async findPaymentById(tenantId: string, paymentId: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingPayment.findFirst({
      where: { id: paymentId, tenantId },
    });
    return row ? mapPayment(row) : null;
  }

  async listPaymentsByEngagement(
    tenantId: string,
    engagementId: string,
    tx?: TransactionContext
  ): Promise<CoachingPaymentRecord[]> {
    const client = getPrismaClient(this.prisma, tx);
    const rows = await client.coachingPayment.findMany({
      where: { tenantId, engagementId },
      orderBy: [{ createdAt: "desc" }],
    });
    return rows.map(mapPayment);
  }

  async findLatestPaymentByEngagement(
    tenantId: string,
    engagementId: string,
    tx?: TransactionContext
  ): Promise<CoachingPaymentRecord | null> {
    const client = getPrismaClient(this.prisma, tx);
    const row = await client.coachingPayment.findFirst({
      where: { tenantId, engagementId },
      orderBy: [{ createdAt: "desc" }],
    });
    return row ? mapPayment(row) : null;
  }

  async createProviderEventIfAbsent(
    event: CoachingPaymentProviderEventRecord,
    tx?: TransactionContext
  ): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx);
    try {
      const row = await client.coachingPaymentProviderEvent.create({
        data: {
          id: event.id,
          tenantId: event.tenantId,
          provider: event.provider,
          providerEventId: event.providerEventId,
          eventType: event.eventType,
          engagementId: event.engagementId,
          paymentId: event.paymentId,
          payloadJson: event.payload as any,
          processedAt: event.processedAt,
          createdAt: event.createdAt,
        },
      });
      mapProviderEvent(row);
      return true;
    } catch (error: any) {
      if (error?.code === "P2002") {
        return false;
      }
      throw error;
    }
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
