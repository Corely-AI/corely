import type {
  CoachingAnswerPayload,
  CoachingAvailabilityRule,
  CoachingBookingRules,
  CoachingContractStatus,
  CoachingContractRequestStatus,
  CoachingEngagementStatus,
  CoachingMeetingType,
  CoachingPaymentStatus,
  CoachingQuestionnaireTemplate,
  CoachingSessionStatus,
  LocalizedText,
} from "@corely/contracts";

export type CoachingOfferRecord = {
  id: string;
  tenantId: string;
  workspaceId: string | null;
  coachUserId: string | null;
  title: LocalizedText;
  description: LocalizedText | null;
  currency: string;
  priceCents: number;
  sessionDurationMinutes: number;
  meetingType: CoachingMeetingType;
  availabilityRule: CoachingAvailabilityRule;
  bookingRules: CoachingBookingRules;
  contractRequired: boolean;
  paymentRequired: boolean;
  localeDefault: string;
  contractTemplate: LocalizedText | null;
  contractLabel: LocalizedText | null;
  prepFormTemplate: CoachingQuestionnaireTemplate | null;
  prepFormSendHoursBeforeSession?: number | null;
  debriefTemplate: CoachingQuestionnaireTemplate | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachingBookingHoldRecord = {
  id: string;
  offerId: string;
  coachUserId: string;
  tenantId: string;
  workspaceId: string | null;
  status: "active" | "expired" | "cancelled";
  startAt: Date;
  endAt: Date;
  expiresAt: Date;
  bookedByName: string | null;
  bookedByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachingPaymentRecord = {
  id: string;
  tenantId: string;
  workspaceId: string | null;
  engagementId: string;
  sessionId: string | null;
  provider: string;
  status: "pending" | "captured" | "failed" | "refunded";
  amountCents: number;
  refundedAmountCents: number;
  currency: string;
  customerEmail: string | null;
  providerCheckoutSessionId: string | null;
  providerCheckoutUrl: string | null;
  providerPaymentRef: string | null;
  providerRefundRef: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  checkoutCreatedAt: Date | null;
  capturedAt: Date | null;
  failedAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CoachingPaymentProviderEventRecord = {
  id: string;
  tenantId: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  engagementId: string | null;
  paymentId: string | null;
  payload: Record<string, unknown>;
  processedAt: Date;
  createdAt: Date;
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

export type CoachingContractRequestRecord = {
  id: string;
  tenantId: string;
  workspaceId: string;
  engagementId: string;
  clientPartyId: string;
  provider: string;
  status: CoachingContractRequestStatus;
  requestToken: string;
  requestTokenHash: string;
  templateLocale: string;
  contractTitle: string;
  contractBody: string;
  recipientName: string | null;
  recipientEmail: string | null;
  signerName: string | null;
  signerEmail: string | null;
  requestedAt: Date;
  deliveredAt: Date | null;
  viewedAt: Date | null;
  completedAt: Date | null;
  draftDocumentId: string;
  signedDocumentId: string | null;
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
  prepAccessToken?: string | null;
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
