import { type Logger } from "@nestjs/common";

export interface RunnerReport {
  processedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  durationMs: number;
}

export interface TickContext {
  runId: string;
  startedAt: Date;
  budgets: {
    perRunnerMaxMs: number;
    perRunnerMaxItems: number;
    overallMaxMs: number;
  };
  tenantIterationPolicy?: {
    shardIndex: number;
    shardCount: number;
  };
  logger: Logger;
}

export interface Runner {
  readonly name: string;
  run(ctx: TickContext): Promise<RunnerReport>;
}
