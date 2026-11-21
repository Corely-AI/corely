import type { LocalDate } from "@corely/kernel";

export const QUOTE_SEND_POLICY_REJECTED = "Sales:QuoteSendPolicyRejected";

export interface QuoteSendRegistration {
  readonly tenantId: string;
  readonly check: (facts: { readonly validUntilDate: LocalDate | null }) => string | undefined;
}

export function quoteSendRejection(
  policies: readonly QuoteSendRegistration[],
  tenantId: string,
  facts: { readonly validUntilDate: LocalDate | null }
): string | undefined {
  for (const policy of policies) {
    if (policy.tenantId === tenantId) {
      const message = policy.check(facts);
      if (message) {return message;}
    }
  }
}
