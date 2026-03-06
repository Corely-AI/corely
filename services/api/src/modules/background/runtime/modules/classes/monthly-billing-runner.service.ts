import { Injectable, Logger } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import { formatInTimeZone } from "date-fns-tz";
import { Runner, RunnerReport, TickContext } from "../../application/runner.interface";

type RunSchedule = {
  runMonth: string;
  localDate: string;
};

@Injectable()
export class MonthlyBillingRunnerService implements Runner {
  private readonly logger = new Logger(MonthlyBillingRunnerService.name);
  private lastRunDate: string | undefined;
  private warnedMissingConfig = false;
  private warnedInvalidTime = false;
  private readonly runWindowMinutes = 10;
  public readonly name = "classesBilling";
  public readonly singletonLockKey = "worker:scheduler:classesBilling";

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService
  ) {}

  async run(ctx: TickContext): Promise<RunnerReport> {
    const startedAt = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    if (!this.env.CLASSES_BILLING_RUN_ENABLED) {
      this.logger.log("Classes billing scheduler disabled.");
      return {
        processedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        durationMs: Date.now() - startedAt,
      };
    }

    try {
      const schedule = this.resolveRunSchedule();
      if (!schedule) {
        return {
          processedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          durationMs: Date.now() - startedAt,
        };
      }
      if (this.lastRunDate === schedule.localDate) {
        return {
          processedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 0,
          durationMs: Date.now() - startedAt,
        };
      }
      this.lastRunDate = schedule.localDate;

      const result = await this.runForAllTenants(schedule.runMonth, ctx.budgets.perRunnerMaxItems);
      processedCount = result.processedCount;
      skippedCount = result.skippedCount;
      errorCount = result.errorCount;
    } catch (error) {
      errorCount++;
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }

    return {
      processedCount,
      updatedCount: processedCount,
      skippedCount,
      errorCount,
      durationMs: Date.now() - startedAt,
    };
  }

  private resolveRunSchedule(): RunSchedule | null {
    const baseUrl = this.env.API_BASE_URL;
    if (!baseUrl) {
      if (!this.warnedMissingConfig) {
        this.logger.warn("API_BASE_URL not set; skipping classes billing runs.");
        this.warnedMissingConfig = true;
      }
      return null;
    }

    const tz = this.env.CLASSES_BILLING_RUN_TIMEZONE ?? "Europe/Berlin";
    const now = new Date();
    const localDate = formatInTimeZone(now, tz, "yyyy-MM-dd");
    const localHour = Number(formatInTimeZone(now, tz, "HH"));
    const localMinute = Number(formatInTimeZone(now, tz, "mm"));
    const nowMinutes = localHour * 60 + localMinute;

    const targetMinutes = this.parseRunTime(this.env.CLASSES_BILLING_RUN_TIME);
    if (targetMinutes === null) {
      if (!this.warnedInvalidTime) {
        this.logger.warn("Invalid CLASSES_BILLING_RUN_TIME; expected HH:mm.");
        this.warnedInvalidTime = true;
      }
      return null;
    }

    if (nowMinutes < targetMinutes || nowMinutes >= targetMinutes + this.runWindowMinutes) {
      return null;
    }

    const [, , day] = localDate.split("-");
    if (day !== "01") {
      return null;
    }

    const [year, month] = localDate.split("-").map((value) => Number(value));
    const runMonth = this.previousMonth(year, month);

    return { runMonth, localDate };
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

  private previousMonth(year: number, month: number): string {
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    return `${String(prev.year).padStart(4, "0")}-${String(prev.month).padStart(2, "0")}`;
  }

  private async runForAllTenants(
    month: string,
    maxTenants: number
  ): Promise<{ processedCount: number; skippedCount: number; errorCount: number }> {
    const baseUrl = this.env.API_BASE_URL;
    if (!baseUrl) {
      return { processedCount: 0, skippedCount: 0, errorCount: 0 };
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      take: Math.max(1, maxTenants),
    });

    let processedCount = 0;
    let errorCount = 0;
    for (const tenant of tenants) {
      try {
        const sent = await this.runForTenant(baseUrl, tenant.id, month);
        if (sent) {
          processedCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    return { processedCount, skippedCount: 0, errorCount };
  }

  private async runForTenant(baseUrl: string, tenantId: string, month: string): Promise<boolean> {
    const url = `${baseUrl.replace(/\/$/, "")}/internal/classes/billing/runs`;
    const idempotencyKey = `classes-billing:${tenantId}:${month}`;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-tenant-id": tenantId,
      "x-workspace-id": tenantId,
      "idempotency-key": idempotencyKey,
    };
    const token = this.env.WORKER_API_SERVICE_TOKEN;
    if (token) {
      headers["x-service-token"] = token;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ month, createInvoices: true, sendInvoices: false }),
    });

    if (response.ok) {
      this.logger.log(`Billing run triggered for ${tenantId} ${month}.`);
      return true;
    }

    const body = await response.text().catch(() => "");
    this.logger.warn(
      `Billing run failed for ${tenantId} ${month}: ${response.status} ${response.statusText} ${body}`
    );
    return false;
  }
}
