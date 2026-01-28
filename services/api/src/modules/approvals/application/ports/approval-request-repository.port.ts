export interface WorkflowInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  definition: { type: string };
  status: string;
  businessKey: string | null;
  // Add other necessary fields
}

export interface ApprovalRequestRepositoryPort {
  list(
    tenantId: string,
    filters: {
      status?: "ACTIVE" | "COMPLETED" | "CANCELLED" | "FAILED";
      businessKey?: string;
      definitionType: "APPROVAL";
    }
  ): Promise<WorkflowInstance[]>;
  getWithDetails(tenantId: string, id: string): Promise<WorkflowInstance | null>;
}

export const APPROVAL_REQUEST_REPOSITORY_TOKEN = Symbol("APPROVAL_REQUEST_REPOSITORY_TOKEN");
