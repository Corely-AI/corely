export interface StaffExtensionScope {
  readonly tenantId: string;
  readonly workspaceId: string;
}

export interface StaffProfileFacts {
  readonly operation: "create" | "update";
  readonly team: string | null;
}

export interface StaffProfilePolicyRegistration extends StaffExtensionScope {
  readonly check: (facts: StaffProfileFacts) => string | undefined;
}

export function staffProfileRejection(
  policies: readonly StaffProfilePolicyRegistration[],
  scope: StaffExtensionScope,
  facts: StaffProfileFacts
): string | undefined {
  for (const policy of policies) {
    if (policy.tenantId === scope.tenantId && policy.workspaceId === scope.workspaceId) {
      const message = policy.check(facts);
      if (message) {return message;}
    }
  }
}
