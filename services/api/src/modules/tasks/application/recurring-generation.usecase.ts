import { Inject, Injectable, Logger } from "@nestjs/common";
import { CLOCK_PORT_TOKEN, type ClockPort } from "@corely/kernel";
import { StaffOperationsLookup } from "../../people/public";
import {
  RECURRING_CHECKLIST_REPOSITORY,
  type RecurringChecklistRepository,
} from "./ports/recurring-checklist-repository.port";
import { TASK_REPOSITORY, type TaskRepositoryPort } from "./ports/task-repository.port";
import { catchupDates } from "../domain/recurring-checklist";
import { ChecklistMaterializer } from "./checklist-materializer";
@Injectable()
export class RecurringGenerationUseCase {
  private readonly logger = new Logger(RecurringGenerationUseCase.name);
  constructor(
    @Inject(RECURRING_CHECKLIST_REPOSITORY) private readonly repo: RecurringChecklistRepository,
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepositoryPort,
    private readonly staff: StaffOperationsLookup,
    private readonly materializer: ChecklistMaterializer,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}
  async run(limit = 10, budgetMs = 30000) {
    const start = Date.now(),
      now = this.clock.now();
    let processedCount = 0,
      updatedCount = 0,
      skippedCount = 0,
      errorCount = 0;
    const candidates = await this.repo.due(now, Math.min(25, Math.max(1, limit)));
    for (const candidate of candidates) {
      if (Date.now() - start >= budgetMs) {
        break;
      }
      try {
        const template = await this.repo.get(candidate.scope, candidate.id);
        if (!template) {
          continue;
        }
        for (const date of catchupDates(template, now)) {
          if (Date.now() - start >= budgetMs) {
            break;
          }
          const outcome = await this.tasks.transaction(candidate.scope, async (tx) => {
            await this.staff.lock(candidate.scope, tx);
            const current = await this.repo.get(candidate.scope, candidate.id, tx);
            if (!current || current.state === "ENDED" || current.state === "PAUSED") {
              return null;
            }
            const existing = await this.repo.occurrence(candidate.scope, current.id, date, tx);
            const occurrence = await this.materializer.generate(candidate.scope, current, date, tx);
            return { occurrence, created: !existing && Boolean(occurrence) };
          });
          if (outcome?.created) {
            updatedCount += outcome.occurrence?.taskIds.length ?? 0;
          }
          if (!outcome?.created || outcome.occurrence?.state === "SKIPPED") {
            skippedCount++;
          }
          processedCount++;
        }
      } catch (error) {
        errorCount++;
        this.logger.error(
          JSON.stringify({
            event: "tasks.recurring.failed",
            templateId: candidate.id,
            error: error instanceof Error ? error.message : "Generation failed",
          })
        );
      } finally {
        try {
          await this.tasks.transaction(candidate.scope, async (tx) => {
            const current = await this.repo.get(candidate.scope, candidate.id, tx);
            if (current) {
              await this.repo.save(
                candidate.scope,
                {
                  ...current,
                  nextEvaluationAt:
                    current.state === "ACTIVE"
                      ? new Date(now.getTime() + 300000).toISOString()
                      : "9999-12-31T23:59:59.999Z",
                },
                tx
              );
            }
          });
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Could not reschedule checklist ${candidate.id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    }
    return {
      processedCount,
      updatedCount,
      skippedCount,
      errorCount,
      durationMs: Date.now() - start,
    };
  }
}
