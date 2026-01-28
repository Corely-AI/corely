export interface WorkflowDefinition {
  id: string;
  tenantId: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  type: string;
  status: string;
  spec: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface ApprovalPolicyRepositoryPort {
  findLatestByKey(tenantId: string, key: string): Promise<{ version: number } | null>;
  create(data: {
    tenantId: string;
    key: string;
    version: number;
    name: string;
    description: string | null;
    type: "APPROVAL";
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
    spec: string;
    createdBy: string | null;
  }): Promise<{ id: string }>;
  listByKeyPrefix(
    tenantId: string,
    prefix: string,
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | undefined,
    type: "APPROVAL"
  ): Promise<WorkflowDefinition[]>;
  findById(tenantId: string, id: string): Promise<WorkflowDefinition | null>;
  updateStatus(
    tenantId: string,
    id: string,
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  ): Promise<{ count: number }>;
  findActiveByKey(tenantId: string, key: string): Promise<WorkflowDefinition | null>;
}

export const APPROVAL_POLICY_REPOSITORY_TOKEN = Symbol("APPROVAL_POLICY_REPOSITORY_TOKEN");
