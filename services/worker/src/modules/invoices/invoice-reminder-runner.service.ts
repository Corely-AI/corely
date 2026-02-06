import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import { formatInTimeZone } from "date-fns-tz";

@Injectable()
export class InvoiceReminderRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceReminderRunnerService.name);
  private intervalId: NodeJS.Timeout | undefined;
  private lastRunDate: string | undefined;
  private warnedMissingConfig = false;
  private warnedInvalidTime = false;
  private readonly tickIntervalMs = 60_000;
  private readonly runWindowMinutes = 15;

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    if (!this.env.INVOICE_REMINDER_RUN_ENABLED) {
      this.logger.log("Invoice reminder scheduler disabled.");
      return;
    }
    this.intervalId = setInterval(() => void this.tick(), this.tickIntervalMs);
    void this.tick();
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async tick() {
    try {
      const schedule = this.resolveRunSchedule();
      if (!schedule) {
        return;
      }
      if (this.lastRunDate === schedule.localDate) {
        return;
      }
      this.lastRunDate = schedule.localDate;

      await this.runForAllWorkspaces(schedule.localDate);
    } catch (error) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
  }

  private resolveRunSchedule(): { localDate: string } | null {
    const baseUrl = this.env.WORKER_API_BASE_URL;
    if (!baseUrl) {
      if (!this.warnedMissingConfig) {
        this.logger.warn("WORKER_API_BASE_URL not set; skipping invoice reminders.");
        this.warnedMissingConfig = true;
      }
      return null;
    }

    const tz = this.env.INVOICE_REMINDER_RUN_TIMEZONE ?? "Europe/Berlin";
    const now = new Date();
    const localDate = formatInTimeZone(now, tz, "yyyy-MM-dd");
    const localHour = Number(formatInTimeZone(now, tz, "HH"));
    const localMinute = Number(formatInTimeZone(now, tz, "mm"));
    const nowMinutes = localHour * 60 + localMinute;

    const targetMinutes = this.parseRunTime(this.env.INVOICE_REMINDER_RUN_TIME);
    if (targetMinutes === null) {
      if (!this.warnedInvalidTime) {
        this.logger.warn("Invalid INVOICE_REMINDER_RUN_TIME; expected HH:mm.");
        this.warnedInvalidTime = true;
      }
      return null;
    }

    if (nowMinutes < targetMinutes || nowMinutes >= targetMinutes + this.runWindowMinutes) {
      return null;
    }

    return { localDate };
  }

  private parseRunTime(value: string): number | null {
    if (!/^\d{2}:\d{2}$/.test(value)) {
      return null;
    }
    const [hourStr, minuteStr] = value.split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return null;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return hour * 60 + minute;
  }

  private async runForAllWorkspaces(localDate: string) {
    const baseUrl = this.env.WORKER_API_BASE_URL;
    if (!baseUrl) {
      return;
    }

    const workspaces = await this.prisma.workspace.findMany({
      where: { deletedAt: null },
      select: { id: true, tenantId: true },
    });

    for (const workspace of workspaces) {
      await this.runForWorkspace(baseUrl, workspace.tenantId, workspace.id, localDate);
    }
  }

  private async runForWorkspace(
    baseUrl: string,
    tenantId: string,
    workspaceId: string,
    localDate: string
  ) {
    const url = `${baseUrl.replace(/\/$/, "")}/internal/invoices/reminders/run`;
    const idempotencyKey = `invoice-reminders:${tenantId}:${workspaceId}:${localDate}`;
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
      body: JSON.stringify({ daysOverdue: 7 }),
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
