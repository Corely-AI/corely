import { type TransactionContext } from "@corely/kernel";

export interface WorkflowTask {
  id: string;
  tenantId: string;
  instanceId: string;
  name: string;
  type: string;
  status: string;
  input: string | null;
  output: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTaskRepositoryPort {
  findById(tenantId: string, id: string): Promise<WorkflowTask | null>;
  listByInstance(tenantId: string, instanceId: string): Promise<WorkflowTask[]>;
  markSucceeded(
    tenantId: string,
    id: string,
    output: string | null,
    tx?: TransactionContext
  ): Promise<any>;
  markFailed(
    tenantId: string,
    id: string,
    error: string | null,
    status: "FAILED" | "PENDING",
    tx?: TransactionContext
  ): Promise<any>;
}

export const WORKFLOW_TASK_REPOSITORY_TOKEN = Symbol("WORKFLOW_TASK_REPOSITORY_TOKEN");
