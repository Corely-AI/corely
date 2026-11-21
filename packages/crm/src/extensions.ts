export const DEAL_LOSS_POLICY_REJECTED = "Crm:DealLossPolicyRejected";

export interface DealLossRegistration {
  readonly tenantId: string;
  readonly check: (facts: { readonly reason: string | null }) => string | undefined;
}

export function dealLossRejection(
  registrations: readonly DealLossRegistration[],
  tenantId: string,
  facts: { readonly reason: string | null }
): string | undefined {
  for (const registration of registrations) {
    if (registration.tenantId === tenantId) {
      const rejection = registration.check(facts);
      if (rejection) {return rejection;}
    }
  }
}
