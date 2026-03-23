import { z } from "zod";

export const COACHING_EVENTS = {
  BOOKING_REQUESTED: "coaching.booking.requested",
  INVOICE_ISSUED: "coaching.invoice.issued",
  PAYMENT_CAPTURED: "coaching.payment.captured",
  PAYMENT_FAILED: "coaching.payment.failed",
  PAYMENT_REFUNDED: "coaching.payment.refunded",
  CONTRACT_SIGNATURE_REQUESTED: "coaching.contract_signature.requested",
  CONTRACT_SIGNED: "coaching.contract.signed",
  PREP_FORM_REQUESTED: "coaching.prep_form.requested",
  PREP_FORM_SUBMITTED: "coaching.prep_form.submitted",
  MEETING_LINK_ISSUED: "coaching.meeting_link.issued",
  SESSION_COMPLETED: "coaching.session.completed",
  DEBRIEF_REQUESTED: "coaching.debrief.requested",
  DEBRIEF_SUBMITTED: "coaching.debrief.submitted",
  EXPORT_BUNDLE_REQUESTED: "coaching.export_bundle.requested",
  EXPORT_BUNDLE_GENERATED: "coaching.export_bundle.generated",
  ENGAGEMENT_ARCHIVED: "coaching.engagement.archived",
  OFFER_CREATED: "coaching.offer.created",
  OFFER_UPDATED: "coaching.offer.updated",
  OFFER_ARCHIVED: "coaching.offer.archived",
} as const;

export const CoachingBookingRequestedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  sessionId: z.string(),
});
export type CoachingBookingRequestedEvent = z.infer<typeof CoachingBookingRequestedEventSchema>;

export const CoachingInvoiceIssuedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  invoiceId: z.string(),
});
export type CoachingInvoiceIssuedEvent = z.infer<typeof CoachingInvoiceIssuedEventSchema>;

export const CoachingPaymentCapturedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  checkoutSessionId: z.string().optional(),
});
export type CoachingPaymentCapturedEvent = z.infer<typeof CoachingPaymentCapturedEventSchema>;

export const CoachingContractSignatureRequestedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  requestId: z.string(),
  draftDocumentId: z.string(),
});
export type CoachingContractSignatureRequestedEvent = z.infer<
  typeof CoachingContractSignatureRequestedEventSchema
>;

export const CoachingContractSignedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  requestId: z.string(),
  documentId: z.string(),
});
export type CoachingContractSignedEvent = z.infer<typeof CoachingContractSignedEventSchema>;

export const CoachingPrepFormRequestedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  sessionId: z.string(),
});
export type CoachingPrepFormRequestedEvent = z.infer<typeof CoachingPrepFormRequestedEventSchema>;

export const CoachingPrepFormSubmittedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  sessionId: z.string(),
  documentId: z.string(),
});
export type CoachingPrepFormSubmittedEvent = z.infer<typeof CoachingPrepFormSubmittedEventSchema>;

export const CoachingMeetingLinkIssuedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  sessionId: z.string(),
  meetingLink: z.string().url(),
});
export type CoachingMeetingLinkIssuedEvent = z.infer<typeof CoachingMeetingLinkIssuedEventSchema>;

export const CoachingSessionCompletedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  sessionId: z.string(),
});
export type CoachingSessionCompletedEvent = z.infer<typeof CoachingSessionCompletedEventSchema>;

export const CoachingDebriefRequestedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  sessionId: z.string(),
});
export type CoachingDebriefRequestedEvent = z.infer<typeof CoachingDebriefRequestedEventSchema>;

export const CoachingDebriefSubmittedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  sessionId: z.string(),
  documentId: z.string(),
});
export type CoachingDebriefSubmittedEvent = z.infer<typeof CoachingDebriefSubmittedEventSchema>;

export const CoachingExportBundleRequestedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  requestedByUserId: z.string(),
});
export type CoachingExportBundleRequestedEvent = z.infer<
  typeof CoachingExportBundleRequestedEventSchema
>;

export const CoachingExportBundleGeneratedEventSchema = z.object({
  workspaceId: z.string(),
  engagementId: z.string(),
  documentId: z.string(),
});
export type CoachingExportBundleGeneratedEvent = z.infer<
  typeof CoachingExportBundleGeneratedEventSchema
>;
