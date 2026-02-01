import { type TransactionContext } from "@corely/kernel";

export interface WorkflowInstance {
  id: string;
  tenantId: string;
  definitionId: string;
  businessKey: string | null;
  status: string;
  currentState: string | null;
  context: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowInstanceCreateInput {
  tenantId: string;
  definitionId: string;
  businessKey?: string | null;
  status: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
  currentState?: string | null;
  context?: string | null;
  startedAt?: Date | null;
}

export interface WorkflowInstanceFilters {
  status?: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
  definitionId?: string;
  definitionKey?: string;
  definitionType?: string;
  businessKey?: string;
}

export interface WorkflowInstanceRepositoryPort {
  create(input: WorkflowInstanceCreateInput, tx?: TransactionContext): Promise<WorkflowInstance>;
  findById(tenantId: string, id: string, tx?: TransactionContext): Promise<WorkflowInstance | null>;
  findByBusinessKey(
    tenantId: string,
    definitionId: string,
    businessKey: string
  ): Promise<WorkflowInstance | null>;
  list(tenantId: string, filters?: WorkflowInstanceFilters): Promise<WorkflowInstance[]>;
  getWithDetails(tenantId: string, id: string): Promise<WorkflowInstance | null>;
  updateStatus(
    tenantId: string,
    id: string,
    status: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED",
    tx?: TransactionContext
  ): Promise<{ count: number }>;
}

export const WORKFLOW_INSTANCE_REPOSITORY_TOKEN = Symbol("WORKFLOW_INSTANCE_REPOSITORY_TOKEN");
