import { Inject, Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { OperationsTodaySchema, type OperationsToday } from "@corely/contracts";
import {
  CLOCK_PORT_TOKEN,
  civilDateAt,
  civilDayWindow,
  type ClockPort,
  type UseCaseContext,
} from "@corely/kernel";
import { OpenBukStudioUseCase, type OperationalAppointment } from "../../booking/public";
import { EmployeeTasksUseCase } from "../../tasks/public";
import { OperationalRequestsUseCase } from "../../requests/public";
import { StaffAvailabilityConstraintService } from "../../people/public";
import { TenantEntitlementService } from "../../platform/public";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";

type WorkspaceScope = { tenantId: string; workspaceId: string; userId: string };
type Missing = "disabled" | "restricted" | "unavailable";
type Reading<T> = { items: T[]; total?: number; partial?: boolean };
type SourceReading<T> = {
  status: "fresh" | "stale" | "partial";
  observedAt: string;
  total: number;
  items: T[];
};
type Source<T> = SourceReading<T> | { status: Missing; observedAt: null; total: null; items: [] };

const sampleLimit = 25;
const staleAfterMs = 30_000;
const sourceTimeoutMs = 5_000;
const scheduleHref = "/openbuk/app/calendar";
const tasksHref = "/tasks";

function missing(status: Missing): Source<never> {
  return { status, total: null, observedAt: null, items: [] };
}
function isReadable<T>(source: Source<T>): source is SourceReading<T> {
  return source.status === "fresh" || source.status === "stale" || source.status === "partial";
}

@Injectable()
export class OperationsTodayUseCase {
  constructor(
    @Inject(AuthorizeWorkspaceUseCase)
    private readonly workspace: Pick<AuthorizeWorkspaceUseCase, "execute">,
    @Inject(OpenBukStudioUseCase)
    private readonly booking: Pick<
      OpenBukStudioUseCase,
      "operationalTimezone" | "operationalAppointments"
    >,
    @Inject(EmployeeTasksUseCase) private readonly tasks: Pick<EmployeeTasksUseCase, "dueToday">,
    @Inject(OperationalRequestsUseCase)
    private readonly requests: Pick<OperationalRequestsUseCase, "list" | "inbox">,
    @Inject(StaffAvailabilityConstraintService)
    private readonly availability: Pick<StaffAvailabilityConstraintService, "windows">,
    @Inject(TenantEntitlementService)
    private readonly entitlements: Pick<TenantEntitlementService, "isAppEnabled">,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async execute(ctx: UseCaseContext): Promise<OperationsToday> {
    const { tenantId, workspaceId, userId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Select an authorized workspace");
    }
    const scope = { tenantId, workspaceId, userId };
    await this.workspace.execute({ ...scope, tenantAdminRoleId: ctx.tenantAdminRoleId });

    const now = this.clock.now();
    const timezoneResult = await this.read(scope, ["booking"], async () => ({
      items: [await this.booking.operationalTimezone(ctx)],
    }));
    let configured = timezoneResult.items[0] ?? null;
    try {
      if (configured) {
        civilDateAt(now, configured);
      }
    } catch {
      configured = null;
    }
    const timezone = configured ?? "UTC";
    const date = civilDateAt(now, timezone);
    const window = civilDayWindow(date, timezone);
    if (!window) {
      throw new Error("The current instant has no civil day");
    }

    const appointmentsPromise = this.read(scope, ["booking"], async () => ({
      items: await this.booking.operationalAppointments(window, ctx),
    }));
    const exceptionsPromise = appointmentsPromise.then((source) =>
      isReadable(source)
        ? this.read(scope, ["people"], () => this.exceptions(scope, source.items))
        : missing(source.status)
    );
    const [rawAppointments, tasks, decisions, exceptions] = await Promise.all([
      appointmentsPromise,
      this.read(scope, ["tasks", "people"], async () => ({
        items: (await this.tasks.dueToday(window, ctx)).map((item) => ({
          ...item,
          href: tasksHref,
        })),
      })),
      this.read(scope, ["requests", "people"], () => this.decisions(ctx)),
      exceptionsPromise,
    ]);
    const appointments = isReadable(rawAppointments)
      ? {
          ...rawAppointments,
          items: rawAppointments.items.map(({ id, status, startAt, endAt }) => ({
            id,
            status,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            href: scheduleHref,
          })),
        }
      : rawAppointments;
    const evaluatedAt = this.clock.now();
    return OperationsTodaySchema.parse({
      workspaceId,
      date,
      timezone,
      timezoneSource: configured ? "booking" : "utc",
      evaluatedAt: evaluatedAt.toISOString(),
      appointments: this.finalize(appointments, evaluatedAt),
      tasks: this.finalize(tasks, evaluatedAt),
      decisions: this.finalize(decisions, evaluatedAt),
      exceptions: this.finalize(exceptions, evaluatedAt),
    }) as OperationsToday;
  }

  private async decisions(ctx: UseCaseContext) {
    const own = await this.requests.list({ status: "RETURNED" }, ctx);
    const assigned = own.canReview ? await this.requests.inbox({}, ctx).catch(() => null) : null;
    return {
      total: (own.total ?? own.items.length) + (assigned?.total ?? assigned?.items.length ?? 0),
      partial: Boolean(own.canReview && (!assigned || assigned.sourceUnavailable)),
      items: [...(assigned?.items ?? []), ...own.items].map(
        ({ id, kind, status, queueStatus, updatedAt }) => ({
          id,
          kind,
          status: queueStatus ?? status,
          updatedAt,
          href: `/requests/${encodeURIComponent(id)}`,
        })
      ),
    };
  }

  private async exceptions(scope: WorkspaceScope, appointments: OperationalAppointment[]) {
    const items: { appointmentId: string; startAt: string; href: string }[] = [];
    for (const appointment of appointments) {
      if (appointment.status !== "CONFIRMED") {
        continue;
      }
      for (const { resourceId, startAt, endAt } of appointment.allocations) {
        const windows = await this.availability.windows(scope, resourceId, startAt, endAt);
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
            href: scheduleHref,
          });
          break;
        }
      }
    }
    return { items };
  }

  private async read<T>(
    scope: WorkspaceScope,
    apps: string[],
    read: () => Promise<Reading<T>>
  ): Promise<Source<T>> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async (): Promise<Source<T>> => {
          const enabled = await Promise.all(
            apps.map((id) => this.entitlements.isAppEnabled(scope.tenantId, id))
          );
          if (enabled.includes(false)) {
            return missing("disabled");
          }
          const reading = await read();
          return {
            status: reading.partial ? "partial" : "fresh",
            items: reading.items,
            total: reading.total ?? reading.items.length,
            observedAt: this.clock.now().toISOString(),
          };
        })(),
        new Promise<Source<T>>((resolve) => {
          timer = setTimeout(() => resolve(missing("unavailable")), sourceTimeoutMs);
          timer.unref();
        }),
      ]);
    } catch (error) {
      return missing(
        error instanceof ForbiddenException || error instanceof NotFoundException
          ? "restricted"
          : "unavailable"
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private finalize<T>(source: Source<T>, evaluatedAt: Date): Source<T> {
    if (!isReadable(source)) {
      return source;
    }
    const stale = evaluatedAt.getTime() - Date.parse(source.observedAt) > staleAfterMs;
    return {
      ...source,
      status: source.status === "fresh" && stale ? "stale" : source.status,
      items: source.items.slice(0, sampleLimit),
    };
  }
}
