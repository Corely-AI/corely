import {
  type CoachingContractStatus,
  type CoachingEngagementStatus,
  type CoachingPaymentStatus,
} from "@corely/contracts";
import type {
  CoachingEngagementRecord,
  CoachingOfferRecord,
  CoachingSessionRecord,
} from "./coaching.types";

type GateSnapshot = {
  paymentStatus: CoachingPaymentStatus;
  contractStatus: CoachingContractStatus;
  prepSubmitted: boolean;
  prepRequired: boolean;
};

export const resolveInitialStatus = (offer: CoachingOfferRecord): CoachingEngagementStatus => {
  if (offer.paymentRequired) {
    return "pending_payment";
  }
  if (offer.contractRequired) {
    return "pending_signature";
  }
  if (offer.prepFormTemplate) {
    return "prep_pending";
  }
  return "ready";
};

export const resolveGatedStatus = (offer: CoachingOfferRecord, gates: GateSnapshot) => {
  if (offer.paymentRequired && gates.paymentStatus !== "captured") {
    return "pending_payment" as const;
  }
  if (offer.contractRequired && gates.contractStatus !== "signed") {
    return "pending_signature" as const;
  }
  if (gates.prepRequired && !gates.prepSubmitted) {
    return "prep_pending" as const;
  }
  return "ready" as const;
};

export const resolvePostSessionStatus = (offer: CoachingOfferRecord) =>
  offer.debriefTemplate ? ("debrief_pending" as const) : ("completed" as const);

export const canManageEngagement = (
  engagement: CoachingEngagementRecord,
  ctx: { userId?: string; roles?: string[] }
) =>
  engagement.coachUserId === ctx.userId ||
  (ctx.roles ?? []).some((role) =>
    ["admin", "owner", "platform.admin", "workspace.admin"].includes(role.toLowerCase())
  );

export const canReadQuestionnaire = (
  engagement: CoachingEngagementRecord,
  session: CoachingSessionRecord,
  offer: CoachingOfferRecord
) => Boolean(engagement) && Boolean(session) && Boolean(offer);
