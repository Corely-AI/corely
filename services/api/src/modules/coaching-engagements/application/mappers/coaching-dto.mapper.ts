import type {
  CoachingBookingHoldDto,
  CoachingArtifactDto,
  CoachingArtifactKind,
  CoachingContractRequestDto,
  CoachingEngagementDetailDto,
  CoachingEngagementDto,
  CoachingOfferDto,
  CoachingPaymentDto,
  CoachingSessionDto,
  CoachingTimelineEntryDto,
  DocumentDTO,
} from "@corely/contracts";
import type {
  CoachingEngagementRecord,
  CoachingBookingHoldRecord,
  CoachingContractRequestRecord,
  CoachingOfferRecord,
  CoachingPaymentRecord,
  CoachingSessionRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";

const toIso = (value: Date | null | undefined) => value?.toISOString() ?? null;

export const toCoachingOfferDto = (offer: CoachingOfferRecord): CoachingOfferDto => ({
  id: offer.id,
  tenantId: offer.tenantId,
  workspaceId: offer.workspaceId,
  coachUserId: offer.coachUserId,
  title: offer.title,
  description: offer.description ?? undefined,
  currency: offer.currency,
  priceCents: offer.priceCents,
  sessionDurationMinutes: offer.sessionDurationMinutes,
  meetingType: offer.meetingType,
  availabilityRule: offer.availabilityRule,
  bookingRules: offer.bookingRules,
  contractRequired: offer.contractRequired,
  paymentRequired: offer.paymentRequired,
  localeDefault: offer.localeDefault,
  contractTemplate: offer.contractTemplate ?? undefined,
  contractLabel: offer.contractLabel ?? undefined,
  prepFormTemplate: offer.prepFormTemplate ?? undefined,
  prepFormSendHoursBeforeSession: offer.prepFormSendHoursBeforeSession ?? undefined,
  debriefTemplate: offer.debriefTemplate ?? undefined,
  archivedAt: toIso(offer.archivedAt),
  createdAt: offer.createdAt.toISOString(),
  updatedAt: offer.updatedAt.toISOString(),
});

export const toCoachingSessionDto = (session: CoachingSessionRecord): CoachingSessionDto => ({
  id: session.id,
  tenantId: session.tenantId,
  workspaceId: session.workspaceId,
  engagementId: session.engagementId,
  status: session.status,
  startAt: session.startAt.toISOString(),
  endAt: session.endAt.toISOString(),
  meetingProvider: session.meetingProvider,
  meetingLink: session.meetingLink,
  meetingIssuedAt: toIso(session.meetingIssuedAt),
  prepRequestedAt: toIso(session.prepRequestedAt),
  prepSubmittedAt: toIso(session.prepSubmittedAt),
  prepDocumentId: session.prepDocumentId,
  debriefRequestedAt: toIso(session.debriefRequestedAt),
  debriefSubmittedAt: toIso(session.debriefSubmittedAt),
  debriefDocumentId: session.debriefDocumentId,
  completedAt: toIso(session.completedAt),
  createdAt: session.createdAt.toISOString(),
  updatedAt: session.updatedAt.toISOString(),
});

export const toCoachingBookingHoldDto = (
  hold: CoachingBookingHoldRecord
): CoachingBookingHoldDto => ({
  id: hold.id,
  offerId: hold.offerId,
  coachUserId: hold.coachUserId,
  tenantId: hold.tenantId,
  workspaceId: hold.workspaceId,
  status: hold.status,
  startAt: hold.startAt.toISOString(),
  endAt: hold.endAt.toISOString(),
  expiresAt: hold.expiresAt.toISOString(),
  bookedByName: hold.bookedByName,
  bookedByEmail: hold.bookedByEmail,
  createdAt: hold.createdAt.toISOString(),
  updatedAt: hold.updatedAt.toISOString(),
});

export const toCoachingPaymentDto = (payment: CoachingPaymentRecord): CoachingPaymentDto => ({
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
  checkoutCreatedAt: toIso(payment.checkoutCreatedAt),
  capturedAt: toIso(payment.capturedAt),
  failedAt: toIso(payment.failedAt),
  refundedAt: toIso(payment.refundedAt),
  createdAt: payment.createdAt.toISOString(),
  updatedAt: payment.updatedAt.toISOString(),
});

export const toCoachingEngagementDto = (
  engagement: CoachingEngagementRecord,
  offer: CoachingOfferRecord,
  exportedBundleDocumentId?: string | null
): CoachingEngagementDto => ({
  id: engagement.id,
  tenantId: engagement.tenantId,
  workspaceId: engagement.workspaceId,
  offer: toCoachingOfferDto(offer),
  clientPartyId: engagement.clientPartyId,
  coachPartyId: engagement.coachPartyId,
  coachUserId: engagement.coachUserId,
  locale: engagement.locale,
  status: engagement.status,
  paymentStatus: engagement.paymentStatus,
  contractStatus: engagement.contractStatus,
  invoiceId: engagement.invoiceId,
  stripeCheckoutSessionId: engagement.stripeCheckoutSessionId,
  stripeCheckoutUrl: engagement.stripeCheckoutUrl,
  contractDraftDocumentId: engagement.contractDraftDocumentId,
  signedContractDocumentId: engagement.signedContractDocumentId,
  exportedBundleDocumentId: exportedBundleDocumentId ?? null,
  latestSummary: engagement.latestSummary,
  createdAt: engagement.createdAt.toISOString(),
  updatedAt: engagement.updatedAt.toISOString(),
});

export const toCoachingContractRequestDto = (
  request: CoachingContractRequestRecord
): CoachingContractRequestDto => ({
  id: request.id,
  provider: request.provider,
  status: request.status,
  templateLocale: request.templateLocale,
  contractTitle: request.contractTitle,
  recipientName: request.recipientName,
  recipientEmail: request.recipientEmail,
  signerName: request.signerName,
  signerEmail: request.signerEmail,
  requestedAt: request.requestedAt.toISOString(),
  deliveredAt: toIso(request.deliveredAt),
  viewedAt: toIso(request.viewedAt),
  completedAt: toIso(request.completedAt),
  draftDocumentId: request.draftDocumentId,
  signedDocumentId: request.signedDocumentId,
});

export const toCoachingTimelineEntryDto = (
  entry: CoachingTimelineEntryRecord
): CoachingTimelineEntryDto => ({
  id: entry.id,
  eventType: entry.eventType,
  stateFrom: entry.stateFrom,
  stateTo: entry.stateTo,
  occurredAt: entry.occurredAt.toISOString(),
  actorUserId: entry.actorUserId,
  metadata: entry.metadata ?? undefined,
});

const inferArtifactKind = (document: DocumentDTO): CoachingArtifactKind => {
  if (document.type === "INVOICE_PDF") {
    return "invoice_pdf";
  }

  const title = (document.title ?? "").toLowerCase();
  if (title.includes("signed contract")) {
    return "contract_signed";
  }
  if (title.includes("contract")) {
    return "contract_draft";
  }
  if (title.includes("prep")) {
    return "prep_response";
  }
  if (title.includes("debrief")) {
    return "debrief_response";
  }
  if (title.includes("bundle") || title.includes("export")) {
    return "export_bundle";
  }
  return "summary_note";
};

export const toCoachingArtifactDto = (params: {
  document: DocumentDTO;
  entityType: "engagement" | "session" | "party";
  entityId: string;
}): CoachingArtifactDto => ({
  kind: inferArtifactKind(params.document),
  title: params.document.title ?? params.document.type,
  document: params.document,
  entityType: params.entityType,
  entityId: params.entityId,
  createdAt: params.document.createdAt,
});

export const toCoachingDetailDto = (params: {
  engagement: CoachingEngagementRecord;
  offer: CoachingOfferRecord;
  contractRequest?: CoachingContractRequestRecord | null;
  sessions: CoachingSessionRecord[];
  payments: CoachingPaymentRecord[];
  timeline: CoachingTimelineEntryRecord[];
  artifacts: CoachingArtifactDto[];
  aiSummary: string | null;
  exportedBundleDocumentId?: string | null;
}): CoachingEngagementDetailDto => ({
  engagement: toCoachingEngagementDto(
    params.engagement,
    params.offer,
    params.exportedBundleDocumentId
  ),
  contractRequest: params.contractRequest
    ? toCoachingContractRequestDto(params.contractRequest)
    : null,
  sessions: params.sessions.map(toCoachingSessionDto),
  payments: params.payments.map(toCoachingPaymentDto),
  artifacts: params.artifacts,
  timeline: params.timeline.map(toCoachingTimelineEntryDto),
  aiSummary: params.aiSummary,
});
