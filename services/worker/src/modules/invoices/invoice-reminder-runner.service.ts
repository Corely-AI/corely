import { Injectable, Logger } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";

@Injectable()
export class InvoiceReminderRunnerService {
  private readonly logger = new Logger(InvoiceReminderRunnerService.name);
  private warnedMissingConfig = false;

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService
  ) {}

  async runOnce(): Promise<void> {
    const baseUrl = this.env.WORKER_API_BASE_URL;
    if (!baseUrl) {
      if (!this.warnedMissingConfig) {
        this.logger.warn("WORKER_API_BASE_URL not set; skipping invoice reminders.");
        this.warnedMissingConfig = true;
      }
      return;
    }

    const workspaces = await this.prisma.workspace.findMany({
      where: { deletedAt: null },
      select: { id: true, tenantId: true },
    });

    for (const workspace of workspaces) {
      await this.runForWorkspace(baseUrl, workspace.tenantId, workspace.id);
    }
  }

  private async runForWorkspace(baseUrl: string, tenantId: string, workspaceId: string) {
    const url = `${baseUrl.replace(/\/$/, "")}/internal/invoices/reminders/run`;
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
      this.logger.log(`Invoice reminders triggered for ${tenantId}/${workspaceId}.`);
      return;
    }

    const body = await response.text().catch(() => "");
    this.logger.warn(
      `Invoice reminders failed for ${tenantId}/${workspaceId}: ${response.status} ${response.statusText} ${body}`
    );
  }
}
