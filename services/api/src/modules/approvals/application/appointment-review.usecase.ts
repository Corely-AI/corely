import { createHash } from "node:crypto";
import {
  AppointmentReviewDecisionSchema,
  AppointmentReviewIdSchema,
  AppointmentReviewKeySchema,
  AppointmentUpdateMessageSchema,
  OpenBukReplacementInputSchema,
  type AppointmentReview,
  type AppointmentReviewDecision,
  type OpenBukReplacementInput,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  CLOCK_PORT_TOKEN,
  UNIT_OF_WORK,
  type AuditPort,
  type ClockPort,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { OpenBukAppointmentChangeUseCase } from "../../booking/public/appointment-changes";
import { AppointmentDeliveryUseCase } from "../../notifications/public/appointment-delivery";
import { EmployeeTasksUseCase } from "../../tasks/public";
import { AuthorizeWorkspaceUseCase } from "../../workspaces/public";
import {
  APPOINTMENT_REVIEW_STORE,
  type AppointmentReviewRecord,
  type AppointmentReviewStore,
  type ReviewActor,
} from "./ports/appointment-review.port";
import { appointmentUpdateText } from "./appointment-update-text";

const approvalLifetimeMs = 20 * 60_000;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

@Injectable()
export class AppointmentReviewUseCase {
  constructor(
    @Inject(APPOINTMENT_REVIEW_STORE) private readonly store: AppointmentReviewStore,
    @Inject(OpenBukAppointmentChangeUseCase)
    private readonly booking: Pick<
      OpenBukAppointmentChangeUseCase,
      "preview" | "applyReviewed" | "customerMessageContext"
    >,
    @Inject(AppointmentDeliveryUseCase)
    private readonly delivery: Pick<AppointmentDeliveryUseCase, "enqueue" | "getStatus" | "retry">,
    @Inject(AuthorizeWorkspaceUseCase)
    private readonly workspace: Pick<AuthorizeWorkspaceUseCase, "execute">,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Optional() private readonly tasks?: EmployeeTasksUseCase
  ) {}

  async proposeReplacement(
    actor: ReviewActor,
    input: OpenBukReplacementInput,
    key: string,
    tx?: TransactionContext
  ) {
    const request = OpenBukReplacementInputSchema.parse(input);
    request.startAt = new Date(request.startAt).toISOString();
    return this.propose(
      actor,
      "replacement",
      key,
      request,
      async () => ({
        kind: "replacement",
        payload: await this.booking.preview(request, actor),
      }),
      tx
    );
  }

  async proposeMessage(
    actor: ReviewActor,
    parentReviewId: string,
    note: string,
    key: string,
    tx?: TransactionContext,
    scheduledFor?: string
  ) {
    AppointmentReviewIdSchema.parse(parentReviewId);
    note = note.trim();
    if (note.length > 1_000) {
      throw new BadRequestException("Message note must be at most 1000 characters");
    }
    return this.propose(
      actor,
      "message",
      key,
      { parentReviewId, note, ...(scheduledFor ? { scheduledFor } : {}) },
      async (transaction) => {
        const parent = await this.require(actor, parentReviewId, "replacement", transaction);
        if (parent.state !== "applied" || !parent.result || !("bookingId" in parent.result)) {
          throw new ConflictException("Apply the appointment replacement before drafting an email");
        }
        const { bookingId, bookingVersion } = parent.result;
        const current = await this.booking.customerMessageContext(actor, bookingId, transaction);
        if (!current || current.bookingVersion !== bookingVersion) {
          throw new ConflictException("The confirmed appointment or recipient changed");
        }
        const payload = AppointmentUpdateMessageSchema.safeParse({
          bookingId,
          bookingVersion,
          recipient: current.recipient,
          ...appointmentUpdateText(current, note),
          ...(scheduledFor ? { scheduledFor } : {}),
        });
        if (!payload.success) {
          throw new ConflictException("The confirmed booking has no usable guest email");
        }
        return { kind: "message", parentReviewId, payload: payload.data };
      },
      tx
    );
  }

  async proposeConfirmation(
    actor: ReviewActor,
    bookingId: string,
    key: string,
    note: string,
    scheduledFor?: string
  ) {
    return this.propose(actor, "message", key, { bookingId, note, scheduledFor }, async (tx) => {
      const current = await this.booking.customerMessageContext(actor, bookingId, tx);
      if (!current) {
        throw new ConflictException("Confirmation requires a current confirmed appointment");
      }
      const payload = AppointmentUpdateMessageSchema.safeParse({
        bookingId,
        bookingVersion: current.bookingVersion,
        recipient: current.recipient,
        ...appointmentUpdateText(current, note, true),
        ...(scheduledFor ? { scheduledFor } : {}),
      });
      if (!payload.success) {
        throw new ConflictException("The confirmed booking has no usable guest email");
      }
      return { kind: "message", payload: payload.data };
    });
  }

  async proposeTaskCompletion(actor: ReviewActor, taskId: string, key: string) {
    const tasks = this.requireTasks();
    if (!(await tasks.authorize(actor)).manage) {
      throw new ForbiddenException("Task management required");
    }
    return this.propose(actor, "task", key, { taskId }, async () => {
      const access = await tasks.authorize(actor);
      if (!access.manage) {
        throw new ForbiddenException("Task management required");
      }
      const task = await tasks.detail(taskId, actor);
      if (task.status !== "OPEN" || task.checklist?.some((item) => !item.completed)) {
        throw new ConflictException("Task is currently unavailable for completion");
      }
      return {
        kind: "task",
        payload: {
          taskId: task.id,
          title: task.title,
          owner: task.ownerName,
          version: task.version,
        },
      };
    });
  }

  private requireTasks() {
    if (!this.tasks) {
      throw new ForbiddenException("Task review unavailable");
    }
    return this.tasks;
  }

  async get(
    actor: ReviewActor,
    id: string,
    kind?: AppointmentReview["action"]["kind"],
    tx?: TransactionContext
  ) {
    await this.authorize(actor, tx);
    return this.view(actor, id, await this.require(actor, id, kind, tx), tx);
  }

  async decide(actor: ReviewActor, id: string, input: AppointmentReviewDecision) {
    if (actor.agentId) {
      throw new ForbiddenException("A human browser session must record the decision");
    }
    AppointmentReviewIdSchema.parse(id);
    const decision = AppointmentReviewDecisionSchema.parse(input);
    return this.uow.withinTransaction(async (tx) => {
      await this.authorize(actor, tx);
      await this.store.lock(actor, id, tx);
      await this.authorize(actor, tx);
      const record = await this.require(actor, id, undefined, tx);
      if (decision.digest !== record.digest) {
        throw new ConflictException("The reviewed details no longer match");
      }
      if (record.state !== "pending" || this.expired(record)) {
        return this.view(actor, id, record, tx);
      }
      const next: AppointmentReviewRecord = {
        ...record,
        state: decision.decision === "approve" ? "approved" : "rejected",
        reviewerId: actor.userId,
        reviewedAt: this.clock.now().toISOString(),
      };
      await this.save(actor, id, next, tx);
      return this.view(actor, id, next, tx);
    });
  }

  async apply(
    actor: ReviewActor,
    id: string,
    kind: AppointmentReview["action"]["kind"],
    existing?: TransactionContext
  ) {
    AppointmentReviewIdSchema.parse(id);
    const run = async (tx: TransactionContext) => {
      await this.authorize(actor, tx);
      await this.store.lock(actor, id, tx);
      await this.authorize(actor, tx);
      const record = await this.require(actor, id, kind, tx);
      if (
        this.expired(record) ||
        !record.reviewerId ||
        (record.state !== "approved" && record.state !== "failed")
      ) {
        return this.view(actor, id, record, tx);
      }
      await this.authorize({ ...actor, userId: record.reviewerId }, tx);
      const outcome = await this.store.attempt(tx, () => this.applyReviewed(actor, id, record, tx));
      const next: AppointmentReviewRecord = {
        ...record,
        state: "applied",
        result: null,
        failureCode: null,
      };
      if (outcome.ok === true) {
        next.result = outcome.value;
      } else {
        const stale =
          outcome.error instanceof ConflictException ||
          outcome.error instanceof NotFoundException ||
          outcome.error instanceof BadRequestException;
        next.state = stale ? "stale" : "failed";
        next.failureCode = !stale
          ? "temporary-failure"
          : kind === "replacement"
            ? "booking-changed"
            : kind === "task"
              ? "task-changed"
              : "delivery-stale";
      }
      await this.save(actor, id, next, tx);
      return this.view(actor, id, next, tx);
    };
    return existing ? run(existing) : this.uow.withinTransaction(run);
  }

  async retryDelivery(actor: ReviewActor, id: string, existing?: TransactionContext) {
    const run = async (tx: TransactionContext) => {
      await this.authorize(actor, tx);
      const record = await this.require(actor, id, "message", tx);
      if (
        record.state !== "applied" ||
        !record.result ||
        !("deliveryId" in record.result) ||
        !record.result.deliveryId
      ) {
        throw new ConflictException("The approved email has not been queued");
      }
      const delivery = await this.delivery.retry(actor, record.result.deliveryId, tx);
      return { ...(await this.view(actor, id, record, tx)), delivery };
    };
    return existing ? run(existing) : this.uow.withinTransaction(run);
  }

  private async applyReviewed(
    actor: ReviewActor,
    id: string,
    record: AppointmentReviewRecord,
    tx: TransactionContext
  ) {
    const action = record.action;
    if (action.kind === "replacement") {
      const result = await this.booking.applyReviewed(
        action.payload,
        id,
        actor,
        tx,
        record.expiresAt
      );
      return { bookingId: result.bookingId, bookingVersion: result.version };
    }
    if (action.kind === "task") {
      const tasks = this.requireTasks();
      const reviewer = record.reviewerId;
      if (
        !reviewer ||
        !(await tasks.authorize(actor, tx)).manage ||
        !(await tasks.authorize({ ...actor, userId: reviewer }, tx)).manage
      ) {
        throw new ForbiddenException("Task management required");
      }
      const result = await tasks.command(
        "complete",
        action.payload.taskId,
        { version: action.payload.version },
        id,
        actor,
        undefined,
        undefined,
        tx
      );
      return { taskId: result.id, taskVersion: result.version };
    }
    const delivery = await this.delivery.enqueue(actor, action.payload, tx, {
      expiresAt: record.expiresAt,
      confirmation: !action.parentReviewId,
    });
    return {
      bookingId: action.payload.bookingId,
      bookingVersion: action.payload.bookingVersion,
      deliveryId: delivery.deliveryId,
    };
  }

  private async propose(
    actor: ReviewActor,
    kind: AppointmentReview["action"]["kind"],
    key: string,
    request: unknown,
    render: (transaction: TransactionContext) => Promise<AppointmentReview["action"]>,
    existing?: TransactionContext
  ) {
    AppointmentReviewKeySchema.parse(key);
    const id = digest([
      actor.tenantId,
      actor.workspaceId,
      actor.userId,
      actor.agentId ?? null,
      kind,
      key,
    ]);
    const fingerprint = digest(request);
    const run = async (tx: TransactionContext) => {
      await this.authorize(actor, tx);
      await this.store.lock(actor, id, tx);
      const previous = await this.store.get(actor, id, tx);
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw new ConflictException("The proposal key already identifies different details");
        }
        return this.view(actor, id, previous, tx);
      }
      const action = await render(tx);
      const expiresAt = new Date(this.clock.now().getTime() + approvalLifetimeMs).toISOString();
      const record: AppointmentReviewRecord = {
        action,
        expiresAt,
        fingerprint,
        proposerId: actor.userId,
        agentId: actor.agentId ?? null,
        digest: digest([id, actor.workspaceId, action, expiresAt]),
        state: "pending",
        reviewerId: null,
        reviewedAt: null,
        result: null,
        failureCode: null,
      };
      await this.save(actor, id, record, tx);
      return this.view(actor, id, record, tx);
    };
    return existing ? run(existing) : this.uow.withinTransaction(run);
  }

  private async require(
    actor: ReviewActor,
    id: string,
    kind?: AppointmentReview["action"]["kind"],
    tx?: TransactionContext
  ) {
    AppointmentReviewIdSchema.parse(id);
    const record = await this.store.get(actor, id, tx);
    if (
      !record ||
      (kind && record.action.kind !== kind) ||
      (actor.agentId && (record.proposerId !== actor.userId || record.agentId !== actor.agentId))
    ) {
      throw new NotFoundException("Appointment review not found");
    }
    if (record.action.kind === "task" && !(await this.requireTasks().authorize(actor, tx)).manage) {
      throw new NotFoundException("Task review not found");
    }
    return record;
  }

  private authorize(actor: ReviewActor, tx?: TransactionContext) {
    return this.workspace.execute(
      {
        tenantId: actor.tenantId,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        manage: true,
      },
      tx
    );
  }

  private expired(record: AppointmentReviewRecord) {
    return (
      ["pending", "approved", "failed"].includes(record.state) &&
      Date.parse(record.expiresAt) <= this.clock.now().getTime()
    );
  }

  private async view(
    actor: ReviewActor,
    id: string,
    record: AppointmentReviewRecord,
    tx?: TransactionContext
  ): Promise<AppointmentReview> {
    const { action, digest, expiresAt, reviewedAt, result, failureCode } = record;
    const delivery =
      result && "deliveryId" in result && result.deliveryId
        ? await this.delivery.getStatus(actor, result.deliveryId, tx)
        : null;
    return {
      id,
      action,
      digest,
      expiresAt,
      reviewedAt,
      result,
      failureCode,
      state: this.expired(record) ? "expired" : record.state,
      reviewPath: `/openbuk/app/reviews/${id}?${new URLSearchParams({ workspaceId: actor.workspaceId })}`,
      ...(delivery ? { delivery } : {}),
    };
  }

  private async save(
    actor: ReviewActor,
    id: string,
    record: AppointmentReviewRecord,
    tx: TransactionContext
  ) {
    await this.store.save(actor, id, record, tx);
    await this.audit.log(
      {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action: `appointments.review.${record.state}`,
        entityType: "AppointmentReview",
        entityId: id,
        metadata: {
          workspaceId: actor.workspaceId,
          kind: record.action.kind,
          ...(record.action.kind === "task"
            ? { taskId: record.action.payload.taskId }
            : { bookingId: record.action.payload.bookingId }),
          agentId: actor.agentId ?? null,
        },
      },
      tx
    );
  }
}
