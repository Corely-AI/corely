import { Injectable } from "@nestjs/common";
import { type ApprovalDomainEventRepositoryPort } from "../../application/ports/approval-domain-event-repository.port";
import { DomainEventRepository } from "@corely/data"; // Assuming this is also exported

@Injectable()
export class PrismaApprovalsDomainEventRepository implements ApprovalDomainEventRepositoryPort {
  constructor(private readonly repo: DomainEventRepository) {}

  async append(event: { tenantId: string; eventType: string; payload: string }) {
    await this.repo.append(event);
  }
}
