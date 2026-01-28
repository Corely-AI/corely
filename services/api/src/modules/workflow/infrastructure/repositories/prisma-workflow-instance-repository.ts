import { Injectable } from "@nestjs/common";
import { type TransactionContext } from "@corely/kernel";
import {
  type WorkflowInstanceRepositoryPort,
  type WorkflowInstanceCreateInput,
  type WorkflowInstanceFilters,
} from "../../application/ports/workflow-instance-repository.port";
import { WorkflowInstanceRepository } from "@corely/data"; // Used as concrete implementation

@Injectable()
export class PrismaWorkflowInstanceRepository implements WorkflowInstanceRepositoryPort {
  constructor(private readonly repo: WorkflowInstanceRepository) {}

  async create(input: WorkflowInstanceCreateInput, tx?: TransactionContext) {
    return this.repo.create(input, tx as any) as any;
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext) {
    return this.repo.findById(tenantId, id, tx as any) as any;
  }

  async findByBusinessKey(tenantId: string, definitionId: string, businessKey: string) {
    return this.repo.findByBusinessKey(tenantId, definitionId, businessKey) as any;
  }

  async list(tenantId: string, filters?: WorkflowInstanceFilters) {
    return this.repo.list(tenantId, filters) as any;
  }

  async getWithDetails(tenantId: string, id: string) {
    // The underlying repo returns includes, but the port defines base fields + potentially others if we typed it strictly.
    // For now we cast to specific type or ensure port matches.
    // The port is generic enough.
    return this.repo.getWithDetails(tenantId, id) as any;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED",
    tx?: TransactionContext
  ) {
    return this.repo.updateStatus(tenantId, id, status, tx as any);
  }
}
