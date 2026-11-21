export const CUSTOMER_CREATION_POLICY_REJECTED = "Customers:CreationPolicyRejected";

export interface CustomerCreationFacts {
  readonly kind: "INDIVIDUAL" | "ORGANIZATION";
  readonly organizationName: string | null;
}

export interface CustomerCreationRegistration {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly check: (facts: CustomerCreationFacts) => string | undefined;
}

export function customerCreationRejection(
  registrations: readonly CustomerCreationRegistration[],
  scope: { readonly tenantId: string; readonly workspaceId?: string | null },
  facts: CustomerCreationFacts
): string | undefined {
  for (const registration of registrations) {
    if (
      registration.tenantId === scope.tenantId &&
      registration.workspaceId === scope.workspaceId
    ) {
      const rejection = registration.check(facts);
      if (rejection) {return rejection;}
    }
  }
}
