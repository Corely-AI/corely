import { Injectable } from "@nestjs/common";
import { type TransactionContext } from "@corely/kernel";
import {
  type WorkflowEventRepositoryPort,
  type WorkflowEventCreateInput,
} from "../../application/ports/workflow-event-repository.port";
import { WorkflowEventRepository } from "@corely/data"; // Used as concrete implementation

@Injectable()
export class PrismaWorkflowEventRepository implements WorkflowEventRepositoryPort {
  constructor(private readonly repo: WorkflowEventRepository) {}

  async append(event: WorkflowEventCreateInput, tx?: TransactionContext) {
    return this.repo.append(event, tx as any);
  }
}
