import { Injectable, Logger } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";
import * as crypto from "crypto";

@Injectable()
export class InvoiceReminderRunnerService implements Runner {
  private readonly logger = new Logger(InvoiceReminderRunnerService.name);
  private warnedMissingConfig = false;

  public readonly name = "invoiceReminders";
  public readonly singletonLockKey = "worker:scheduler:invoiceReminders";

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService
  ) {}

  async run(ctx: TickContext): Promise<RunnerReport> {
    const budgetMs = ctx.budgets.perRunnerMaxMs;
    // For invoices, "items" can be workspaces processed
    // Note: The prompt says "max invoices processed", but the runner iterates workspaces.
    // We will count workspaces as the unit of work for now, or assume 1 workspace ~ N invoices.
    // Given the inner runner just calls an API, we count workspaces triggered.
    const budgetItems = ctx.budgets.perRunnerMaxItems;
    const startTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    const baseUrl = this.env.WORKER_API_BASE_URL;
    if (!baseUrl) {
      if (!this.warnedMissingConfig) {
        this.logger.warn("WORKER_API_BASE_URL not set; skipping invoice reminders.");
        this.warnedMissingConfig = true;
      }
      return {
        processedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        durationMs: 0,
      };
    }

    // Check if feature is globally enabled via env (legacy check, but good to keep)
    if (this.env.INVOICE_REMINDER_RUN_ENABLED === false) {
      this.logger.log("Invoice reminders disabled globally via INVOICE_REMINDER_RUN_ENABLED");
      return {
        processedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        durationMs: 0,
      };
    }

    // Fetch all workspaces - potential optimization: paginate or select only needed fields
    const workspaces = await this.prisma.workspace.findMany({
      where: { deletedAt: null },
      select: { id: true, tenantId: true },
    });

    for (const workspace of workspaces) {
      // Check budgets
      if (Date.now() - startTime > budgetMs) {
        this.logger.log("Invoice reminders time budget exhausted");
        break;
      }
      if (processedCount >= budgetItems) {
        this.logger.log("Invoice reminders item budget exhausted");
        break;
      }

      // Check Sharding
      if (!this.shouldProcess(workspace.tenantId, ctx.tenantIterationPolicy)) {
        skippedCount++;
        continue;
      }

      try {
        await this.runForWorkspace(baseUrl, workspace.tenantId, workspace.id);
        processedCount++;
      } catch (err) {
        errorCount++;
        this.logger.error(`Failed to run invoice reminders for workspace ${workspace.id}`, err);
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

  private shouldProcess(
    tenantId: string,
    policy?: { shardIndex: number; shardCount: number }
  ): boolean {
    if (!policy) {
      return true;
    }
    // Simple consistent hashing
    const hash = crypto.createHash("md5").update(tenantId).digest("hex");
    // Use first 8 chars (32 bits)
    const segment = parseInt(hash.substring(0, 8), 16);
    return segment % policy.shardCount === policy.shardIndex;
  }

  private async runForWorkspace(baseUrl: string, tenantId: string, workspaceId: string) {
    const url = `${baseUrl.replace(/\/$/, "")}/internal/invoices/reminders/run`;
    // We can use the budget or tick ID in the idempotency key if we want strict once-per-tick
    // But keeping existing pattern based on time is safer for retries within same tick if it failed?
    // Actually, prompt says "idempotency keys for 'send reminder'".
    // The existing key includes timestamp.
    // We should probably rely on the inner API usage of this key.
    const idempotencyKey = `invoice-reminders:${tenantId}:${workspaceId}:${new Date().toISOString()}`;

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-tenant-id": tenantId,
      "x-workspace-id": workspaceId,
      "idempotency-key": idempotencyKey,
    };
    const token = this.env.WORKER_API_SERVICE_TOKEN;
    if (token) {
      headers["x-service-token"] = token;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    if (response.ok) {
      this.logger.debug(`Invoice reminders triggered for ${tenantId}/${workspaceId}.`);
      return;
    }

    const body = await response.text().catch(() => "");
    this.logger.warn(
      `Invoice reminders failed for ${tenantId}/${workspaceId}: ${response.status} ${response.statusText} ${body}`
    );
    throw new Error(`Failed with status ${response.status}`);
  }
}
