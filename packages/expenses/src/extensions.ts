export const EXPENSE_SUBMISSION_POLICY_REJECTED = "Expenses:SubmissionPolicyRejected";

export interface ExpenseSubmissionRegistration {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly check: (facts: { readonly category: string | null }) => string | undefined;
}

export function expenseSubmissionRejection(
  registrations: readonly ExpenseSubmissionRegistration[],
  scope: { readonly tenantId: string; readonly workspaceId: string },
  facts: { readonly category: string | null }
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
