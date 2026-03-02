import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";
import {
  JOB_SCHEDULER_PORT,
  type JobSchedulerPort,
} from "../../shared/scheduling/job-scheduler.port";

const SWEEPER_MAX_ITEMS = 200;
const SWEEPER_MAX_MS = 20_000;

@Injectable()
export class SequencesSweeperRunnerService implements Runner {
  private readonly logger = new Logger(SequencesSweeperRunnerService.name);
  public readonly name = "sequences_sweep";
  public readonly singletonLockKey = "worker:scheduler:sequences_sweep";

  constructor(
    private readonly prisma: PrismaService,
    @Inject(JOB_SCHEDULER_PORT) private readonly jobScheduler: JobSchedulerPort
  ) {}

  async run(ctx: TickContext): Promise<RunnerReport> {
    const startedAtMs = Date.now();
    const maxItems = Math.min(SWEEPER_MAX_ITEMS, Math.max(1, ctx.budgets.perRunnerMaxItems));
    const deadlineMs = startedAtMs + Math.min(SWEEPER_MAX_MS, ctx.budgets.perRunnerMaxMs);

    const due = await this.prisma.sequenceEnrollment.findMany({
      where: {
        status: "ACTIVE",
        nextExecutionAt: { lte: new Date() },
      },
      include: {
        sequence: {
          include: {
            steps: {
              orderBy: { stepOrder: "asc" },
              select: {
                id: true,
                stepOrder: true,
              },
            },
          },
        },
      },
      orderBy: { nextExecutionAt: "asc" },
      take: maxItems,
    });

    let scheduledCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const enrollment of due) {
      if (Date.now() > deadlineMs) {
        this.logger.warn(
          `[tick:${ctx.runId}] sequences sweep budget reached, stopping early at ${scheduledCount + skippedCount + errorCount}/${due.length}`
        );
        break;
      }

      const runAt = enrollment.nextExecutionAt;
      const currentStep = enrollment.sequence.steps.find(
        (step) => step.stepOrder === enrollment.currentStepOrder
      );
      if (!runAt || !currentStep) {
        skippedCount += 1;
        continue;
      }

      try {
        const idempotencyKey = ["crm-seq", enrollment.id, currentStep.id, runAt.toISOString()].join(
          ":"
        );

        await this.jobScheduler.schedule(
          "crm.sequence.executeStep",
          {
            tenantId: enrollment.tenantId,
            enrollmentId: enrollment.id,
            stepId: currentStep.id,
            expectedRunAt: runAt.toISOString(),
          },
          {
            runAt,
            idempotencyKey,
            traceId: ctx.runId,
          }
        );

        scheduledCount += 1;
      } catch (error) {
        errorCount += 1;
        this.logger.error(
          `Failed to schedule enrollment ${enrollment.id} step ${currentStep.id}`,
          error instanceof Error ? error.stack : undefined
        );
      }
    }

    return {
      processedCount: due.length,
      updatedCount: scheduledCount,
      skippedCount,
      errorCount,
      durationMs: Date.now() - startedAtMs,
    };
  }
}
