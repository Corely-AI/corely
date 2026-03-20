import type {
  CoachingArtifactDto,
  CoachingArtifactKind,
  CoachingEngagementDetailDto,
  CoachingEngagementDto,
  CoachingOfferDto,
  CoachingSessionDto,
  CoachingTimelineEntryDto,
  DocumentDTO,
} from "@corely/contracts";
import type {
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingSessionRecord,
  CoachingTimelineEntryRecord,
} from "../../domain/coaching.types";

const toIso = (value: Date | null | undefined) => value?.toISOString() ?? null;

export const toCoachingOfferDto = (offer: CoachingOfferRecord): CoachingOfferDto => ({
  id: offer.id,
  tenantId: offer.tenantId,
  workspaceId: offer.workspaceId,
  title: offer.title,
  description: offer.description ?? undefined,
  currency: offer.currency,
  priceCents: offer.priceCents,
  sessionDurationMinutes: offer.sessionDurationMinutes,
  contractRequired: offer.contractRequired,
  paymentRequired: offer.paymentRequired,
  localeDefault: offer.localeDefault,
  contractLabel: offer.contractLabel ?? undefined,
  prepFormTemplate: offer.prepFormTemplate ?? undefined,
  debriefTemplate: offer.debriefTemplate ?? undefined,
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
  sessions: CoachingSessionRecord[];
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
  sessions: params.sessions.map(toCoachingSessionDto),
  artifacts: params.artifacts,
  timeline: params.timeline.map(toCoachingTimelineEntryDto),
  aiSummary: params.aiSummary,
});
