import { describe, expect, it } from "vitest";
import { ValidationFailedError } from "@corely/domain";
import {
  assertValidLifecycleTransition,
  canTransitionLifecycle,
} from "../domain/rules/cohort.rules";
import {
  assertValidEnrollmentStatusTransition,
  canTransitionEnrollmentStatus,
} from "../domain/rules/enrollment.rules";
import { validateBillingPlan } from "../domain/rules/billing-plan.rules";
import { validateResourcePayload } from "../domain/rules/resource.rules";

describe("classes academy domain rules", () => {
  it("allows and blocks cohort lifecycle transitions", () => {
    expect(canTransitionLifecycle("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransitionLifecycle("PUBLISHED", "RUNNING")).toBe(true);
    expect(canTransitionLifecycle("PUBLISHED", "ARCHIVED")).toBe(true);
    expect(canTransitionLifecycle("DRAFT", "RUNNING")).toBe(false);

    expect(() => assertValidLifecycleTransition("DRAFT", "RUNNING")).toThrow(ValidationFailedError);
  });

  it("allows and blocks enrollment transitions", () => {
    expect(canTransitionEnrollmentStatus("APPLIED", "ENROLLED")).toBe(true);
    expect(canTransitionEnrollmentStatus("DEFERRED", "ENROLLED")).toBe(true);
    expect(canTransitionEnrollmentStatus("COMPLETED", "ENROLLED")).toBe(false);

    expect(() => assertValidEnrollmentStatusTransition("COMPLETED", "ENROLLED")).toThrow(
      ValidationFailedError
    );
  });

  it("validates billing plan schedule schema and installment ordering", () => {
    expect(() =>
      validateBillingPlan({
        type: "UPFRONT",
        scheduleJson: {
          type: "UPFRONT",
          data: {
            amountCents: 50000,
            currency: "EUR",
          },
        },
      })
    ).not.toThrow();

    expect(() =>
      validateBillingPlan({
        type: "INSTALLMENTS",
        scheduleJson: {
          type: "INSTALLMENTS",
          data: {
            currency: "EUR",
            installments: [
              { dueDate: "2026-03-10", amountCents: 10000 },
              { dueDate: "2026-03-01", amountCents: 10000 },
            ],
          },
        },
      })
    ).toThrow(ValidationFailedError);
  });

  it("validates resource payloads for DOC/LINK/RECORDING", () => {
    expect(() =>
      validateResourcePayload({
        type: "DOC",
        documentId: "doc-1",
      })
    ).not.toThrow();

    expect(() =>
      validateResourcePayload({
        type: "LINK",
        url: "https://example.com",
      })
    ).not.toThrow();

    expect(() =>
      validateResourcePayload({
        type: "RECORDING",
        url: "https://zoom.example.com/rec",
      })
    ).not.toThrow();

    expect(() =>
      validateResourcePayload({
        type: "DOC",
      })
    ).toThrow(ValidationFailedError);
    expect(() =>
      validateResourcePayload({
        type: "LINK",
      })
    ).toThrow(ValidationFailedError);
    expect(() =>
      validateResourcePayload({
        type: "RECORDING",
      })
    ).toThrow(ValidationFailedError);
  });
});
