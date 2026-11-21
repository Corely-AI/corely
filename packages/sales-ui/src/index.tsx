import type { ComponentType } from "react";

export type QuoteSendGuidance = ComponentType<{ validUntilDate: string | null }>;

export function QuoteSendGuidanceSlot({
  Guidance,
  validUntilDate,
}: {
  Guidance?: QuoteSendGuidance;
  validUntilDate: string | null;
}) {
  return Guidance ? <Guidance validUntilDate={validUntilDate} /> : null;
}
