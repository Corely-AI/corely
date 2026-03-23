import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";
import { PrepFormDispatchService } from "./services/prep-form-dispatch.service";

@Injectable()
export class CoachingPrepReminderRunnerService implements Runner {
  private readonly logger = new Logger(CoachingPrepReminderRunnerService.name);

  public readonly name = "coachingPrep";
  public readonly singletonLockKey = "worker:scheduler:coachingPrep";

  constructor(
    private readonly prisma: PrismaService,
    private readonly prepDispatch: PrepFormDispatchService
  ) {}

  async run(ctx: TickContext): Promise<RunnerReport> {
    const startTime = Date.now();
    const now = new Date();
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const dueSessions = await this.prisma.coachingSession.findMany({
      where: {
        status: "scheduled",
        prepRequestedAt: null,
        prepSubmittedAt: null,
        engagement: {
          archivedAt: null,
          offer: {
            prepFormTemplateJson: { not: null },
          },
        },
      },
      orderBy: { startAt: "asc" },
      take: ctx.budgets.perRunnerMaxItems,
      select: {
        id: true,
        tenantId: true,
        workspaceId: true,
      },
    });

    for (const session of dueSessions) {
      if (Date.now() - startTime > ctx.budgets.perRunnerMaxMs) {
        this.logger.log("Coaching prep runner time budget exhausted");
        break;
      }

      try {
        const result = await this.prepDispatch.dispatchIfDue({
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          sessionId: session.id,
          now,
        });
        if (result === "sent") {
          processedCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch (error) {
        errorCount += 1;
        this.logger.error(`Failed to dispatch prep form for session ${session.id}`, error);
      }
    }

    return {
      processedCount,
      updatedCount: processedCount,
      skippedCount,
      errorCount,
      durationMs: Date.now() - startTime,
    };
  }
}
