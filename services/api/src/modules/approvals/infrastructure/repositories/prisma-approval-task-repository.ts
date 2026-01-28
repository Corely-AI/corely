import { Injectable } from "@nestjs/common";
import { type ApprovalTaskRepositoryPort } from "../../application/ports/approval-task-repository.port";
import { WorkflowTaskRepository } from "@corely/data";

@Injectable()
export class PrismaApprovalTaskRepository implements ApprovalTaskRepositoryPort {
  constructor(private readonly repo: WorkflowTaskRepository) {}

  async listInbox(params: {
    tenantId: string;
    userId: string;
    roleId: string | null;
    permissionKeys: string[];
    status: "PENDING";
  }) {
    return this.repo.listInbox(params);
  }

  async findById(tenantId: string, id: string) {
    return this.repo.findById(tenantId, id);
  }
}
