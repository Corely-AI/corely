import { Injectable } from "@nestjs/common";
import { type ApprovalRequestRepositoryPort } from "../../application/ports/approval-request-repository.port";
import { WorkflowInstanceRepository } from "@corely/data";

@Injectable()
export class PrismaApprovalRequestRepository implements ApprovalRequestRepositoryPort {
  constructor(private readonly repo: WorkflowInstanceRepository) {}

  async list(
    tenantId: string,
    filters: {
      status?: "ACTIVE" | "COMPLETED" | "CANCELLED" | "FAILED";
      businessKey?: string;
      definitionType: "APPROVAL";
    }
  ) {
    return this.repo.list(tenantId, {
      ...filters,
      status: filters.status as any,
    });
  }

  async getWithDetails(tenantId: string, id: string) {
    return this.repo.getWithDetails(tenantId, id);
  }
}
