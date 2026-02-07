import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import { formatInTimeZone } from "date-fns-tz";

type RunSchedule = {
  runMonth: string;
  localDate: string;
};

@Injectable()
export class MonthlyBillingRunnerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonthlyBillingRunnerService.name);
  private intervalId: NodeJS.Timeout | undefined;
  private lastRunDate: string | undefined;
  private warnedMissingConfig = false;
  private warnedInvalidTime = false;
  private readonly tickIntervalMs = 60_000;
  private readonly runWindowMinutes = 10;

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    if (!this.env.CLASSES_BILLING_RUN_ENABLED) {
      this.logger.log("Classes billing scheduler disabled.");
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

      await this.runForAllTenants(schedule.runMonth);
    } catch (error) {
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    }
  }

  private resolveRunSchedule(): RunSchedule | null {
    const baseUrl = this.env.WORKER_API_BASE_URL;
    if (!baseUrl) {
      if (!this.warnedMissingConfig) {
        this.logger.warn("WORKER_API_BASE_URL not set; skipping classes billing runs.");
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

  private async runForAllTenants(month: string) {
    const baseUrl = this.env.WORKER_API_BASE_URL;
    if (!baseUrl) {
      return;
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    for (const tenant of tenants) {
      await this.runForTenant(baseUrl, tenant.id, month);
    }
  }

  private async runForTenant(baseUrl: string, tenantId: string, month: string) {
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
      return;
    }

    const body = await response.text().catch(() => "");
    this.logger.warn(
      `Billing run failed for ${tenantId} ${month}: ${response.status} ${response.statusText} ${body}`
    );
  }
}
