import { nanoid } from "nanoid";
import { type AgentRunRepositoryPort } from "../ports/agent-run-repository.port";
import { requireRunOwner } from "../policies/require-run-owner";

export class CreateRunUseCase {
  constructor(private readonly runs: AgentRunRepositoryPort) {}

  async execute(params: {
    tenantId: string;
    userId: string;
    metadataJson?: string;
    runId?: string;
    traceId?: string;
  }): Promise<{ runId: string }> {
    const runId = params.runId || nanoid();

    const existing = await this.runs.findById({ tenantId: params.tenantId, runId });
    if (existing) {
      requireRunOwner(existing, params.userId);
      return { runId: existing.id };
    }

    const created = await this.runs.create({
      id: runId,
      tenantId: params.tenantId,
      createdByUserId: params.userId,
      status: "running",
      metadataJson: params.metadataJson,
      traceId: params.traceId,
    });
    // The adapter may return an existing row after a concurrent unique-key collision.
    requireRunOwner(created, params.userId);

    return { runId };
  }
}
