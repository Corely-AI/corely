import { studioDate } from "@corely/booking";
import { CliDayBriefSchema } from "@corely/contracts";
import { CLOCK_PORT_TOKEN, type ClockPort, type UseCaseContext } from "@corely/kernel";
import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { OpenBukStudioUseCase, type OperationalAppointment } from "../../booking/public";
import { StaffAvailabilityConstraintService } from "../../people/public";
import { TenantEntitlementService } from "../../platform/public";
import { EmployeeTasksUseCase } from "../../tasks/public";

type BriefScope = { tenantId: string; workspaceId: string; userId: string; workspaceName: string };
type SourceReading<T> = {
  status: "fresh" | "stale";
  observedAt: string;
  total: number;
  items: T[];
};
type Source<T> =
  | SourceReading<T>
  | { status: "disabled" | "restricted" | "unavailable"; observedAt: null; total: null; items: [] };
function hasReading<T>(source: Source<T>): source is SourceReading<T> {
  return source.status === "fresh" || source.status === "stale";
}
const bookingPath = "/openbuk/app";
const tasksPath = "/openbuk/app/tasks";

function missing(status: "disabled" | "restricted" | "unavailable"): Source<never> {
  return { status, observedAt: null, total: null, items: [] };
}

@Injectable()
export class DailyOperationsBrief {
  constructor(
    @Inject(OpenBukStudioUseCase)
    private readonly booking: Pick<
      OpenBukStudioUseCase,
      "operationalTimezone" | "operationalAppointments"
    >,
    @Inject(StaffAvailabilityConstraintService)
    private readonly availability: Pick<StaffAvailabilityConstraintService, "windows">,
    @Inject(EmployeeTasksUseCase) private readonly tasks: Pick<EmployeeTasksUseCase, "list">,
    @Inject(TenantEntitlementService)
    private readonly entitlements: Pick<TenantEntitlementService, "isAppEnabled">,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async execute(scope: BriefScope, requestedDate: string) {
    const now = this.clock.now();
    const ctx: UseCaseContext = {
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      userId: scope.userId,
    };
    const tasksPromise = this.read(scope.tenantId, ["tasks", "people"], async () => {
      const { total, items } = await this.tasks.list(
        { status: "OPEN", page: 1, pageSize: 100 },
        ctx
      );
      return {
        total,
        items: items.map(({ id, title, dueAt, checklist }) => ({
          id,
          title,
          dueAt,
          checklist: checklist
            ? { done: checklist.filter((step) => step.completed).length, total: checklist.length }
            : null,
          sourcePath: tasksPath,
        })),
      };
    });

    let timezone = "UTC";
    let timezoneSource: "openbuk" | "utc-default" = "utc-default";
    let date = requestedDate === "today" ? studioDate(now, timezone) : requestedDate;
    const raw = await this.read(scope.tenantId, ["booking"], async () => {
      const configured = await this.booking.operationalTimezone(ctx);
      if (configured) {
        timezone = configured;
        timezoneSource = "openbuk";
      }
      date = requestedDate === "today" ? studioDate(now, timezone) : requestedDate;
      const items = await this.booking.operationalAppointments(date, timezone, ctx);
      return { total: items.length, items };
    });
    const [coverage, tasks] = await Promise.all([
      !hasReading(raw)
        ? missing(raw.status)
        : this.read(scope.tenantId, ["people"], () => this.coverage(scope, raw.items)),
      tasksPromise,
    ]);
    const appointments = !hasReading(raw)
      ? missing(raw.status)
      : {
          ...raw,
          items: raw.items.map(({ id, status, startAt, endAt }) => ({
            id,
            status,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            sourcePath: bookingPath,
          })),
        };
    const completedAt = this.clock.now().getTime();
    return CliDayBriefSchema.parse({
      workspaceId: scope.workspaceId,
      workspaceName: scope.workspaceName,
      date,
      timezone,
      timezoneSource,
      appointments: this.freshness(appointments, completedAt),
      coverage: this.freshness(coverage, completedAt),
      tasks: this.freshness(tasks, completedAt),
    });
  }

  private async coverage(scope: BriefScope, appointments: OperationalAppointment[]) {
    const items: { appointmentId: string; startAt: string; sourcePath: typeof bookingPath }[] = [];
    // Sequential lookups keep storage load bounded across a busy studio day.
    for (const appointment of appointments) {
      if (appointment.status !== "CONFIRMED") {
        continue;
      }
      for (const allocation of appointment.allocations) {
        const { resourceId, startAt, endAt } = allocation;
        const windows = await this.availability.windows(
          { tenantId: scope.tenantId, workspaceId: scope.workspaceId },
          resourceId,
          startAt,
          endAt
        );
        if (
          windows &&
          !windows.some(
            (window) =>
              Date.parse(window.startAt) <= startAt.getTime() &&
              Date.parse(window.endAt) >= endAt.getTime()
          )
        ) {
          items.push({
            appointmentId: appointment.id,
            startAt: appointment.startAt.toISOString(),
            sourcePath: bookingPath,
          });
          break;
        }
      }
    }
    return { items, total: items.length };
  }

  private async read<T>(
    tenantId: string,
    apps: string[],
    load: () => Promise<{ items: T[]; total: number }>
  ): Promise<Source<T>> {
    try {
      for (const app of apps) {
        if (!(await this.entitlements.isAppEnabled(tenantId, app))) {
          return missing("disabled");
        }
      }
      const observedAt = this.clock.now().toISOString();
      return { status: "fresh", observedAt, ...(await load()) };
    } catch (error) {
      return missing(error instanceof ForbiddenException ? "restricted" : "unavailable");
    }
  }

  private freshness<T>(source: Source<T>, completedAt: number): Source<T> {
    if (hasReading(source) && completedAt - Date.parse(source.observedAt) >= 60_000) {
      return { ...source, status: "stale" };
    }
    return source;
  }
}
