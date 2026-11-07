import { type AgentRunRepositoryPort } from "../ports/agent-run-repository.port";
import { requireRunOwner } from "../policies/require-run-owner";

export class GetRunUseCase {
  constructor(private readonly runs: AgentRunRepositoryPort) {}

  async execute(params: { tenantId: string; userId: string; runId: string }) {
    const run = await this.runs.findById(params);
    return requireRunOwner(run, params.userId);
  }
}
