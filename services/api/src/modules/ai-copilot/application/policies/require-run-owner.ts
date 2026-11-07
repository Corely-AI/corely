import { NotFoundException } from "@nestjs/common";
import type { AgentRun } from "../../domain/entities/agent-run.entity";

/** Conversations are private to their creator within the existing storage scope. */
export function requireRunOwner(run: AgentRun | null, userId: string | null): AgentRun {
  if (!userId || !run || run.createdByUserId !== userId) {
    throw new NotFoundException("Run not found");
  }
  return run;
}
