import { Injectable } from "@nestjs/common";
import { type TransactionContext } from "@corely/kernel";
import { type WorkflowTaskRepositoryPort } from "../../application/ports/workflow-task-repository.port";
import { WorkflowTaskRepository } from "@corely/data";

@Injectable()
export class PrismaWorkflowTaskRepository implements WorkflowTaskRepositoryPort {
  constructor(private readonly repo: WorkflowTaskRepository) {}

  async findById(tenantId: string, id: string) {
    return this.repo.findById(tenantId, id) as any;
  }

  async listByInstance(tenantId: string, instanceId: string) {
    return this.repo.listByInstance(tenantId, instanceId) as any;
  }

  async markSucceeded(
    tenantId: string,
    id: string,
    output: string | null,
    tx?: TransactionContext
  ) {
    return this.repo.markSucceeded(tenantId, id, output, tx as any);
  }

  async markFailed(
    tenantId: string,
    id: string,
    error: string | null,
    status: "FAILED" | "PENDING",
    tx?: TransactionContext
  ) {
    return this.repo.markFailed(tenantId, id, error, status, tx as any);
  }
}
