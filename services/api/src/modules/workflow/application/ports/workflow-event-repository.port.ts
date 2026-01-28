import { type TransactionContext } from "@corely/kernel";

export interface WorkflowEventCreateInput {
  tenantId: string;
  instanceId: string;
  type: string;
  payload: string;
}

export interface WorkflowEventRepositoryPort {
  append(event: WorkflowEventCreateInput, tx?: TransactionContext): Promise<any>;
}

export const WORKFLOW_EVENT_REPOSITORY_TOKEN = Symbol("WORKFLOW_EVENT_REPOSITORY_TOKEN");
