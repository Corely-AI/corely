import type { ComponentType } from "react";

export type ExpenseSubmissionGuidance = ComponentType;

export function ExpenseSubmissionGuidanceSlot({
  status,
  Guidance,
}: {
  status: string;
  Guidance?: ExpenseSubmissionGuidance;
}) {
  return Guidance && (status === "DRAFT" || status === "REJECTED") ? <Guidance /> : null;
}
