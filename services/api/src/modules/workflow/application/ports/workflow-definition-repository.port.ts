import { type TransactionContext } from "@corely/kernel";

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
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowDefinitionCreateInput {
  tenantId: string;
  key: string;
  version: number;
  name: string;
  description?: string | null;
  type?: "GENERAL" | "APPROVAL";
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  spec: string;
  createdBy?: string | null;
}

export interface WorkflowDefinitionFilters {
  key?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

export interface WorkflowDefinitionRepositoryPort {
  create(
    input: WorkflowDefinitionCreateInput,
    tx?: TransactionContext
  ): Promise<{ id: string; key: string; version: number }>;
  findById(
    tenantId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<WorkflowDefinition | null>;
  list(tenantId: string, filters?: WorkflowDefinitionFilters): Promise<WorkflowDefinition[]>;
  updateStatus(
    tenantId: string,
    id: string,
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  ): Promise<{ count: number }>;
  findActiveByKey(
    tenantId: string,
    key: string,
    version?: number
  ): Promise<WorkflowDefinition | null>;
}

export const WORKFLOW_DEFINITION_REPOSITORY_TOKEN = Symbol("WORKFLOW_DEFINITION_REPOSITORY_TOKEN");
