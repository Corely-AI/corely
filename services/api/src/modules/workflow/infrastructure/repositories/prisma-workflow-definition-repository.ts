import { Injectable } from "@nestjs/common";
import { type TransactionContext } from "@corely/kernel";
import {
  type WorkflowDefinitionRepositoryPort,
  type WorkflowDefinitionCreateInput,
  type WorkflowDefinitionFilters,
} from "../../application/ports/workflow-definition-repository.port";
import { WorkflowDefinitionRepository } from "@corely/data"; // Used as concrete implementation

@Injectable()
export class PrismaWorkflowDefinitionRepository implements WorkflowDefinitionRepositoryPort {
  constructor(private readonly repo: WorkflowDefinitionRepository) {}

  async create(input: WorkflowDefinitionCreateInput, tx?: TransactionContext) {
    return this.repo.create(input, tx as any);
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext) {
    return this.repo.findById(tenantId, id, tx as any) as any;
  }

  async list(tenantId: string, filters?: WorkflowDefinitionFilters) {
    return this.repo.list(tenantId, filters) as any;
  }

  async updateStatus(tenantId: string, id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    return this.repo.updateStatus(tenantId, id, status);
  }

  async findActiveByKey(tenantId: string, key: string, version?: number) {
    return this.repo.findActiveByKey(tenantId, key, version) as any;
  }
}
