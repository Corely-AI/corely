export interface ApprovalDomainEventRepositoryPort {
  append(event: { tenantId: string; eventType: string; payload: string }): Promise<void>;
}

export const APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN = Symbol(
  "APPROVAL_DOMAIN_EVENT_REPOSITORY_TOKEN"
);
