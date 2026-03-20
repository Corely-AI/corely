import type {
  CoachingAnswerPayload,
  CoachingContractStatus,
  CoachingEngagementStatus,
  CoachingPaymentStatus,
  CoachingQuestionnaireTemplate,
  CoachingSessionStatus,
  LocalizedText,
} from "@corely/contracts";

export type CoachingOfferRecord = {
  id: string;
  tenantId: string;
  workspaceId: string | null;
  title: LocalizedText;
  description: LocalizedText | null;
  currency: string;
  priceCents: number;
  sessionDurationMinutes: number;
  contractRequired: boolean;
  paymentRequired: boolean;
  localeDefault: string;
  contractLabel: LocalizedText | null;
  prepFormTemplate: CoachingQuestionnaireTemplate | null;
  debriefTemplate: CoachingQuestionnaireTemplate | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachingEngagementRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  offerId: string;
  clientPartyId: string;
  coachPartyId: string | null;
  coachUserId: string;
  locale: string;
  status: CoachingEngagementStatus;
  paymentStatus: CoachingPaymentStatus;
  contractStatus: CoachingContractStatus;
  legalEntityId: string | null;
  paymentMethodId: string | null;
  invoiceId: string | null;
  stripeCheckoutSessionId: string | null;
  stripeCheckoutUrl: string | null;
  stripePaymentIntentId: string | null;
  contractAccessTokenHash: string | null;
  contractRequestedAt: Date | null;
  contractSignedAt: Date | null;
  contractDraftDocumentId: string | null;
  signedContractDocumentId: string | null;
  latestSummary: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachingSessionRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  engagementId: string;
  status: CoachingSessionStatus;
  sequenceNo: number;
  startAt: Date;
  endAt: Date;
  meetingProvider: string | null;
  meetingLink: string | null;
  meetingIssuedAt: Date | null;
  prepAccessTokenHash: string | null;
  prepRequestedAt: Date | null;
  prepSubmittedAt: Date | null;
  prepDocumentId: string | null;
  debriefAccessTokenHash: string | null;
  debriefRequestedAt: Date | null;
  debriefSubmittedAt: Date | null;
  debriefDocumentId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachingTimelineEntryRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  engagementId: string;
  eventType: string;
  stateFrom: CoachingEngagementStatus | null;
  stateTo: CoachingEngagementStatus | null;
  actorUserId: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: Date;
  createdAt: Date;
};

export type CoachingArtifactBundleRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  engagementId: string;
  status: "pending" | "ready" | "failed";
  documentId: string | null;
  requestedByUserId: string;
  requestedAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachingResolvedQuestionnaire = {
  sessionId: string;
  engagementId: string;
  locale: string;
  title: string;
  description: string | null;
  questions: Array<{
    key: string;
    type: CoachingQuestionnaireTemplate["questions"][number]["type"];
    required: boolean;
    labelResolved: string;
    helpTextResolved: string | null;
    label: LocalizedText;
    helpText?: LocalizedText;
    optionsResolved: Array<{
      value: string;
      label: LocalizedText;
      labelResolved: string;
    }>;
  }>;
};

export type CoachingResponseArtifact = {
  answers: CoachingAnswerPayload;
  submittedByName: string | null;
  submittedAt: Date;
};
