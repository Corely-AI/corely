import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  PublishChecklistSchema,
  ChecklistTemplateSchema,
  ChecklistPlanSchema,
  EditChecklistSchema,
  ChecklistVersionSchema,
  SkipChecklistDateSchema,
  ListChecklistTemplatesSchema,
  type ChecklistTemplateView,
  type ChecklistOccurrence,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  CLOCK_PORT_TOKEN,
  addCivilDays,
  civilDateAt,
  type AuditPort,
  type OutboxPort,
  type ClockPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import { StaffOperationsLookup } from "../../people/public";
import { EmployeeTasksUseCase } from "./employee-tasks.usecase";
import { ChecklistMaterializer } from "./checklist-materializer";
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
  type TaskScope,
} from "./ports/task-repository.port";
import {
  RECURRING_CHECKLIST_REPOSITORY,
  type RecurringChecklistRepository,
} from "./ports/recurring-checklist-repository.port";
import {
  occurrenceId,
  planOnDate,
  stripPublisher,
  type ChecklistRecord,
} from "../domain/recurring-checklist";
const dormant = "9999-12-31T23:59:59.999Z";
type Command = "publish" | "edit" | "pause" | "resume" | "end" | "skip" | "generate";
@Injectable()
export class RecurringChecklistsUseCase {
  constructor(
    @Inject(RECURRING_CHECKLIST_REPOSITORY) private readonly repo: RecurringChecklistRepository,
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepositoryPort,
    private readonly access: EmployeeTasksUseCase,
    private readonly staff: StaffOperationsLookup,
    private readonly materializer: ChecklistMaterializer,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}
  async authorize(ctx: UseCaseContext, tx?: TransactionContext) {
    const auth = await this.access.authorize(ctx, tx);
    if (!auth.manage) {
      throw new ForbiddenException("Task management required");
    }
    return auth;
  }
  async record(scope: TaskScope, id: string, tx?: TransactionContext) {
    const row = await this.repo.get(scope, id, tx);
    if (!row || row.workspaceId !== scope.workspaceId) {
      throw new NotFoundException("Checklist template not found");
    }
    return row;
  }
  async view(
    scope: TaskScope,
    record: ChecklistRecord,
    tx?: TransactionContext
  ): Promise<ChecklistTemplateView> {
    const publicRecord = ChecklistTemplateSchema.strip().parse({
      ...record,
      plans: record.plans.map(stripPublisher),
    });
    return {
      ...publicRecord,
      localToday: civilDateAt(this.clock.now(), record.timezone),
      occurrences: await this.repo.recent(scope, record.id, tx),
    };
  }
  async list(query: unknown, ctx: UseCaseContext) {
    const auth = await this.authorize(ctx),
      input = ListChecklistTemplatesSchema.parse(query);
    const records = await this.repo.list(auth.scope);
    return {
      ...input,
      total: records.length,
      items: await Promise.all(
        records
          .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
          .map((row) => this.view(auth.scope, row))
      ),
    };
  }
  async detail(id: string, ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    return this.view(auth.scope, await this.record(auth.scope, id));
  }
  async command(
    kind: Command,
    id: string | null,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    const initial = await this.authorize(ctx);
    if (!key || !/^[\w-]{1,160}$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const input =
      kind === "publish"
        ? PublishChecklistSchema.parse(body)
        : kind === "edit"
          ? EditChecklistSchema.parse(body)
          : kind === "skip"
            ? SkipChecklistDateSchema.parse(body)
            : ChecklistVersionSchema.parse(body);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([kind, id, input]))
      .digest("hex");
    const commandKey = createHash("sha256")
      .update(JSON.stringify([ctx.userId, key]))
      .digest("hex");
    return this.tasks.transaction(initial.scope, async (tx) => {
      await this.staff.lock(initial.scope, tx);
      const auth = await this.authorize(ctx, tx),
        scope = auth.scope;
      const replay = await this.repo.replay(scope, commandKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used for another command");
        }
        return this.view(scope, await this.record(scope, replay.templateId, tx), tx);
      }
      const now = this.clock.now(),
        iso = now.toISOString();
      const previous = id ? await this.record(scope, id, tx) : null;
      if (previous && (!("version" in input) || previous.version !== input.version)) {
        throw new ConflictException("Template changed; reload before saving");
      }
      if (previous?.state === "ENDED") {
        throw new ConflictException("Ended templates cannot be changed");
      }
      let next: ChecklistRecord;
      if (kind === "publish" || kind === "edit") {
        const fields = PublishChecklistSchema.parse(
          kind === "publish" ? input : EditChecklistSchema.parse(input).plan
        );
        const today = civilDateAt(now, fields.timezone);
        if (previous && previous.timezone !== fields.timezone) {
          throw new BadRequestException("Create a new template to change timezone");
        }
        if (fields.effectiveFrom < (previous ? addCivilDays(today, 1) : today)) {
          throw new BadRequestException(
            previous
              ? "Edits take effect tomorrow or later"
              : "Publication cannot start in the past"
          );
        }
        for (const staffId of fields.assigneeIds) {
          const owner = await this.staff.get(scope, staffId, tx);
          if (!owner || owner.archivedAt) {
            throw new BadRequestException("Assignees must be active in this workspace");
          }
        }
        const version = (previous?.version ?? 0) + 1;
        const plan = ChecklistPlanSchema.strip().parse({ ...fields, version });
        const plans = [
          ...(previous?.plans.filter((p) => p.effectiveFrom <= today) ?? []),
          { ...plan, version, publisherUserId: auth.actorUserId },
        ];
        if (plans.length > 50) {
          throw new ConflictException("Template history limit reached; publish a new template");
        }
        next = {
          id: previous?.id ?? randomUUID(),
          workspaceId: scope.workspaceId,
          timezone: fields.timezone,
          version,
          state: previous?.state ?? "ACTIVE",
          plans,
          pauses: previous?.pauses ?? [],
          createdAt: previous?.createdAt ?? iso,
          updatedAt: iso,
          nextEvaluationAt: previous?.state === "PAUSED" ? dormant : iso,
        };
      } else {
        if (!previous) {
          throw new NotFoundException("Checklist template not found");
        }
        next = { ...previous };
        const today = civilDateAt(now, previous.timezone);
        if (kind === "generate") {
          await this.materializer.generate(scope, previous, today, tx, ctx);
        } else if (kind === "skip") {
          const date = SkipChecklistDateSchema.parse(input).localDate;
          const plan = planOnDate(previous, date);
          if (date < addCivilDays(today, -2) || date > addCivilDays(today, 365) || !plan) {
            throw new BadRequestException(
              "Choose a scheduled date within the catch-up window or next year"
            );
          }
          const existing = await this.repo.occurrence(scope, previous.id, date, tx);
          if (existing?.state === "GENERATED") {
            throw new ConflictException("This occurrence already exists; manage its task instead");
          }
          if (!existing) {
            const skipped: ChecklistOccurrence = {
              id: occurrenceId(scope.tenantId, scope.workspaceId, previous.id, date),
              templateId: previous.id,
              localDate: date,
              templateVersion: plan.version,
              state: "SKIPPED",
              reason: "MANUAL",
              taskIds: [],
              skippedAssignees: [],
              createdAt: iso,
            };
            await this.repo.saveOccurrence(scope, skipped, tx);
          }
        } else {
          if (kind === "pause") {
            if (previous.state !== "ACTIVE" || previous.pauses.length >= 100) {
              throw new ConflictException("Template cannot be paused");
            }
            next.state = "PAUSED";
            next.pauses = [...previous.pauses, { fromDate: today, throughDate: null }];
          } else if (kind === "resume") {
            if (previous.state !== "PAUSED") {
              throw new ConflictException("Template is not paused");
            }
            next.state = "ACTIVE";
            next.pauses = previous.pauses.map((pause) =>
              pause.throughDate ? pause : { ...pause, throughDate: today }
            );
          } else {
            next.state = "ENDED";
          }
          next.version++;
          next.updatedAt = iso;
          next.nextEvaluationAt = next.state === "ACTIVE" ? iso : dormant;
        }
      }
      if (kind !== "generate" && kind !== "skip") {
        await this.repo.save(scope, next, tx);
      }
      if (kind !== "generate") {
        await this.audit.log(
          {
            tenantId: scope.tenantId,
            userId: auth.actorUserId,
            action: `tasks.checklist.${kind}`,
            entityType: "ChecklistTemplate",
            entityId: next.id,
            metadata: {
              workspaceId: scope.workspaceId,
              version: next.version,
              ...(kind === "skip"
                ? { localDate: SkipChecklistDateSchema.parse(input).localDate }
                : {}),
            },
          },
          tx
        );
        await this.outbox.enqueue(
          {
            tenantId: scope.tenantId,
            eventType: `tasks.checklist.${kind}`,
            payload: {
              workspaceId: scope.workspaceId,
              templateId: next.id,
              version: next.version,
              ...(kind === "skip"
                ? { localDate: SkipChecklistDateSchema.parse(input).localDate }
                : {}),
            },
            correlationId: ctx.correlationId,
          },
          tx
        );
      }
      await this.repo.saveReplay(scope, commandKey, { fingerprint, templateId: next.id }, tx);
      return this.view(scope, next, tx);
    });
  }
}
