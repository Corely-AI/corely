import { Injectable } from "@nestjs/common";
import { type ApprovalPolicyRepositoryPort } from "../../application/ports/approval-policy-repository.port";
import { WorkflowDefinitionRepository } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";

@Injectable()
export class PrismaApprovalPolicyRepository implements ApprovalPolicyRepositoryPort {
  constructor(private readonly repo: WorkflowDefinitionRepository) {}

  async findLatestByKey(tenantId: string, key: string, tx?: TransactionContext) {
    return this.repo.findLatestByKey(tenantId, key, tx);
  }

  async create(
    data: {
      tenantId: string;
      key: string;
      version: number;
      name: string;
      description: string | null;
      type: "APPROVAL";
      status: "ACTIVE" | "INACTIVE";
      spec: string;
      createdBy: string | null;
    },
    tx?: TransactionContext
  ) {
    return this.repo.create(data, tx);
  }

  async listByKeyPrefix(
    tenantId: string,
    prefix: string,
    status: "ACTIVE" | "INACTIVE" | "ARCHIVED" | undefined,
    type: "APPROVAL"
  ) {
    return this.repo.listByKeyPrefix(tenantId, prefix, status, type);
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext) {
    return this.repo.findById(tenantId, id, tx);
  }

  async updateStatus(tenantId: string, id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    return this.repo.updateStatus(tenantId, id, status);
  }

  async findActiveByKey(tenantId: string, key: string) {
    return this.repo.findActiveByKey(tenantId, key);
  }
}
