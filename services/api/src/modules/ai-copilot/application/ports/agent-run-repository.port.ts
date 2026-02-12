import { type AgentRun } from "../../domain/entities/agent-run.entity";

export interface AgentRunRepositoryPort {
  create(run: {
    id: string;
    tenantId: string;
    createdByUserId: string | null;
    title?: string;
    status: string;
    lastMessageAt?: Date;
    traceId?: string;
    metadataJson?: string;
  }): Promise<AgentRun>;

  updateStatus(runId: string, status: string, finishedAt?: Date): Promise<void>;

  findById(params: { tenantId: string; runId: string }): Promise<AgentRun | null>;
}
