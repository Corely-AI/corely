import { Injectable, Logger } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";

@Injectable()
export class SequenceRunnerService implements Runner {
  private readonly logger = new Logger(SequenceRunnerService.name);
  public readonly name = "sequences";
  public readonly singletonLockKey = "worker:scheduler:sequences";

  constructor(private readonly env: EnvService) {}

  async run(ctx: TickContext): Promise<RunnerReport> {
    const startTime = Date.now();

    // We call the internal API to run sequence steps
    const baseUrl = this.env.API_BASE_URL;
    if (!baseUrl) {
      this.logger.warn("API_BASE_URL not set; skipping sequence runner.");
      return {
        processedCount: 0,
        updatedCount: 0,
        skippedCount: 1,
        errorCount: 0,
        durationMs: 0,
      };
    }

    // Call the internal endpoint
    // We assume the API handles locking/budget internally per batch if needed,
    // or just processes a batch and returns.
    try {
      const url = `${baseUrl.replace(/\/$/, "")}/internal/crm/sequences/run`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // Authentication via service token if needed
          ...(this.env.WORKER_API_SERVICE_TOKEN
            ? { "x-service-token": this.env.WORKER_API_SERVICE_TOKEN }
            : {}),
        },
        body: JSON.stringify({ limit: ctx.budgets.perRunnerMaxItems }),
      });

      if (!response.ok) {
        throw new Error(`Failed to run sequences: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        processedCount: data.processedCount || 0,
        updatedCount: data.updatedCount || 0,
        skippedCount: 0,
        errorCount: data.errorCount || 0,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      this.logger.error("Sequence runner failed", err);
      return {
        processedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
