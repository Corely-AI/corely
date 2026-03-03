import { describe, it, expect } from "vitest";
import {
  TaxFilingStatus,
  FILING_TRANSITIONS,
  DELETABLE_STATUSES,
  assertFilingTransition,
  assertFilingDeletable,
  isTransitionAllowed,
  dbStatusToFilingStatus,
  DB_STATUS_TO_FILING_STATUS,
} from "../domain/entities/tax-filing-status";
import { TaxFilingInvalidTransitionError, TaxFilingNotDeletableError } from "@corely/domain";

describe("TaxFilingStatus state machine", () => {
  describe("FILING_TRANSITIONS map", () => {
    it("covers all statuses", () => {
      const allStatuses = Object.values(TaxFilingStatus);
      for (const status of allStatuses) {
        expect(FILING_TRANSITIONS).toHaveProperty(status);
      }
    });

    it("DRAFT can move to READY_FOR_REVIEW and SUBMITTED", () => {
      expect(FILING_TRANSITIONS[TaxFilingStatus.DRAFT]).toContain(TaxFilingStatus.READY_FOR_REVIEW);
      expect(FILING_TRANSITIONS[TaxFilingStatus.DRAFT]).toContain(TaxFilingStatus.SUBMITTED);
    });

    it("SUBMITTED can only move to PAID or ARCHIVED", () => {
      expect(FILING_TRANSITIONS[TaxFilingStatus.SUBMITTED]).toEqual([
        TaxFilingStatus.PAID,
        TaxFilingStatus.ARCHIVED,
      ]);
    });

    it("ARCHIVED is a terminal state (no transitions)", () => {
      expect(FILING_TRANSITIONS[TaxFilingStatus.ARCHIVED]).toHaveLength(0);
    });

    it("PAID can only move to ARCHIVED", () => {
      expect(FILING_TRANSITIONS[TaxFilingStatus.PAID]).toEqual([TaxFilingStatus.ARCHIVED]);
    });
  });

  describe("assertFilingTransition", () => {
    it("does not throw for allowed transitions", () => {
      expect(() =>
        assertFilingTransition(TaxFilingStatus.DRAFT, TaxFilingStatus.SUBMITTED)
      ).not.toThrow();

      expect(() =>
        assertFilingTransition(TaxFilingStatus.SUBMITTED, TaxFilingStatus.PAID)
      ).not.toThrow();

      expect(() =>
        assertFilingTransition(TaxFilingStatus.DRAFT, TaxFilingStatus.READY_FOR_REVIEW)
      ).not.toThrow();
    });

    it("throws TaxFilingInvalidTransitionError for disallowed transitions", () => {
      expect(() =>
        assertFilingTransition(TaxFilingStatus.SUBMITTED, TaxFilingStatus.DRAFT)
      ).toThrow(TaxFilingInvalidTransitionError);

      expect(() => assertFilingTransition(TaxFilingStatus.PAID, TaxFilingStatus.SUBMITTED)).toThrow(
        TaxFilingInvalidTransitionError
      );

      expect(() => assertFilingTransition(TaxFilingStatus.ARCHIVED, TaxFilingStatus.DRAFT)).toThrow(
        TaxFilingInvalidTransitionError
      );
    });

    it("error has correct code and data", () => {
      let caughtError: TaxFilingInvalidTransitionError | undefined;
      try {
        assertFilingTransition(TaxFilingStatus.SUBMITTED, TaxFilingStatus.DRAFT, "filing-123");
      } catch (e) {
        caughtError = e as TaxFilingInvalidTransitionError;
      }
      expect(caughtError).toBeInstanceOf(TaxFilingInvalidTransitionError);
      expect(caughtError?.code).toBe("Tax:FilingInvalidTransition");
      expect(caughtError?.status).toBe(422);
      expect(caughtError?.data).toMatchObject({
        from: "SUBMITTED",
        to: "DRAFT",
        filingId: "filing-123",
      });
    });
  });

  describe("assertFilingDeletable", () => {
    it("does not throw for DRAFT and NEEDS_FIX", () => {
      expect(() => assertFilingDeletable(TaxFilingStatus.DRAFT, "filing-1")).not.toThrow();
      expect(() => assertFilingDeletable(TaxFilingStatus.NEEDS_FIX, "filing-1")).not.toThrow();
    });

    it("throws TaxFilingNotDeletableError for non-deletable statuses", () => {
      for (const status of [
        TaxFilingStatus.READY_FOR_REVIEW,
        TaxFilingStatus.SUBMITTED,
        TaxFilingStatus.PAID,
        TaxFilingStatus.ARCHIVED,
      ] as TaxFilingStatus[]) {
        expect(() => assertFilingDeletable(status, "filing-x")).toThrow(TaxFilingNotDeletableError);
      }
    });
  });

  describe("isTransitionAllowed", () => {
    it("returns true for allowed transitions", () => {
      expect(isTransitionAllowed(TaxFilingStatus.DRAFT, TaxFilingStatus.SUBMITTED)).toBe(true);
      expect(isTransitionAllowed(TaxFilingStatus.SUBMITTED, TaxFilingStatus.PAID)).toBe(true);
    });

    it("returns false for disallowed transitions", () => {
      expect(isTransitionAllowed(TaxFilingStatus.SUBMITTED, TaxFilingStatus.DRAFT)).toBe(false);
      expect(isTransitionAllowed(TaxFilingStatus.ARCHIVED, TaxFilingStatus.DRAFT)).toBe(false);
    });
  });

  describe("DELETABLE_STATUSES", () => {
    it("contains DRAFT and NEEDS_FIX", () => {
      expect(DELETABLE_STATUSES).toContain(TaxFilingStatus.DRAFT);
      expect(DELETABLE_STATUSES).toContain(TaxFilingStatus.NEEDS_FIX);
    });

    it("does not contain SUBMITTED or PAID", () => {
      expect(DELETABLE_STATUSES).not.toContain(TaxFilingStatus.SUBMITTED);
      expect(DELETABLE_STATUSES).not.toContain(TaxFilingStatus.PAID);
    });
  });

  describe("dbStatusToFilingStatus", () => {
    it("maps known DB statuses correctly", () => {
      expect(dbStatusToFilingStatus("OPEN")).toBe(TaxFilingStatus.DRAFT);
      expect(dbStatusToFilingStatus("UPCOMING")).toBe(TaxFilingStatus.DRAFT);
      expect(dbStatusToFilingStatus("OVERDUE")).toBe(TaxFilingStatus.NEEDS_FIX);
      expect(dbStatusToFilingStatus("SUBMITTED")).toBe(TaxFilingStatus.SUBMITTED);
      expect(dbStatusToFilingStatus("PAID")).toBe(TaxFilingStatus.PAID);
      expect(dbStatusToFilingStatus("ARCHIVED")).toBe(TaxFilingStatus.ARCHIVED);
      expect(dbStatusToFilingStatus("NIL")).toBe(TaxFilingStatus.ARCHIVED);
    });

    it("falls back to DRAFT for unknown statuses", () => {
      expect(dbStatusToFilingStatus("UNKNOWN_STATUS")).toBe(TaxFilingStatus.DRAFT);
    });
  });

  describe("DB_STATUS_TO_FILING_STATUS coverage", () => {
    it("maps all known DB status values", () => {
      const dbStatuses = ["UPCOMING", "OPEN", "OVERDUE", "SUBMITTED", "PAID", "NIL", "ARCHIVED"];
      for (const s of dbStatuses) {
        expect(DB_STATUS_TO_FILING_STATUS[s]).toBeDefined();
      }
    });
  });
});
