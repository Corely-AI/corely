import { describe, expect, it } from "vitest";
import {
  canManageEngagement,
  resolveGatedStatus,
  resolveInitialStatus,
} from "./coaching-state.machine";
import type { CoachingEngagementRecord, CoachingOfferRecord } from "./coaching.types";

const makeOffer = (overrides: Partial<CoachingOfferRecord> = {}): CoachingOfferRecord => ({
  id: "offer-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  title: { en: "Executive coaching" },
  description: null,
  currency: "EUR",
  priceCents: 12000,
  sessionDurationMinutes: 60,
  contractRequired: true,
  paymentRequired: true,
  localeDefault: "en",
  contractLabel: null,
  prepFormTemplate: null,
  debriefTemplate: null,
  createdAt: new Date("2026-03-20T09:00:00.000Z"),
  updatedAt: new Date("2026-03-20T09:00:00.000Z"),
  ...overrides,
});

const makeEngagement = (
  overrides: Partial<CoachingEngagementRecord> = {}
): CoachingEngagementRecord => ({
  id: "eng-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  offerId: "offer-1",
  clientPartyId: "party-client-1",
  coachPartyId: null,
  coachUserId: "coach-1",
  locale: "en",
  status: "pending_signature",
  paymentStatus: "captured",
  contractStatus: "pending",
  legalEntityId: null,
  paymentMethodId: null,
  invoiceId: null,
  stripeCheckoutSessionId: null,
  stripeCheckoutUrl: null,
  stripePaymentIntentId: null,
  contractAccessTokenHash: null,
  contractRequestedAt: null,
  contractSignedAt: null,
  contractDraftDocumentId: null,
  signedContractDocumentId: null,
  latestSummary: null,
  archivedAt: null,
  createdAt: new Date("2026-03-20T09:00:00.000Z"),
  updatedAt: new Date("2026-03-20T09:00:00.000Z"),
  ...overrides,
});

describe("coaching-state.machine", () => {
  it("derives the initial engagement status from payment, signature, and prep gates", () => {
    expect(resolveInitialStatus(makeOffer())).toBe("pending_payment");
    expect(resolveInitialStatus(makeOffer({ paymentRequired: false }))).toBe("pending_signature");
    expect(
      resolveInitialStatus(
        makeOffer({
          paymentRequired: false,
          contractRequired: false,
          prepFormTemplate: {
            title: { en: "Prep form" },
            questions: [],
          },
        })
      )
    ).toBe("prep_pending");
    expect(
      resolveInitialStatus(
        makeOffer({ paymentRequired: false, contractRequired: false, prepFormTemplate: null })
      )
    ).toBe("ready");
  });

  it("keeps the strictest unmet prerequisite as the active status", () => {
    const offer = makeOffer({
      prepFormTemplate: {
        title: { en: "Prep form" },
        questions: [],
      },
    });

    expect(
      resolveGatedStatus(offer, {
        paymentStatus: "pending",
        contractStatus: "signed",
        prepRequired: true,
        prepSubmitted: true,
      })
    ).toBe("pending_payment");
    expect(
      resolveGatedStatus(offer, {
        paymentStatus: "captured",
        contractStatus: "pending",
        prepRequired: true,
        prepSubmitted: true,
      })
    ).toBe("pending_signature");
    expect(
      resolveGatedStatus(offer, {
        paymentStatus: "captured",
        contractStatus: "signed",
        prepRequired: true,
        prepSubmitted: false,
      })
    ).toBe("prep_pending");
    expect(
      resolveGatedStatus(offer, {
        paymentStatus: "captured",
        contractStatus: "signed",
        prepRequired: true,
        prepSubmitted: true,
      })
    ).toBe("ready");
  });

  it("grants management access to the assigned coach and workspace admins only", () => {
    const engagement = makeEngagement();

    expect(canManageEngagement(engagement, { userId: "coach-1" })).toBe(true);
    expect(canManageEngagement(engagement, { userId: "other", roles: ["workspace.admin"] })).toBe(
      true
    );
    expect(canManageEngagement(engagement, { userId: "other", roles: ["member"] })).toBe(false);
  });
});
