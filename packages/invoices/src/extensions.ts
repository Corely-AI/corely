export interface InvoiceFinalizationFacts {
  readonly dueDate: string | null;
}

export type InvoiceFinalizationPolicy = (facts: InvoiceFinalizationFacts) => string | undefined;

export interface InvoiceFinalizationRegistration {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly validate: InvoiceFinalizationPolicy;
}

export function invoiceFinalizationRejection(
  registrations: readonly InvoiceFinalizationRegistration[],
  scope: { readonly tenantId: string; readonly workspaceId: string },
  facts: InvoiceFinalizationFacts
): string | undefined {
  for (const registration of registrations) {
    if (
      registration.tenantId === scope.tenantId &&
      registration.workspaceId === scope.workspaceId
    ) {
      const reason = registration.validate(facts);
      if (reason) {
        return reason;
      }
    }
  }
}
