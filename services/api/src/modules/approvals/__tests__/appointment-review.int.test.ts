import { randomUUID } from "node:crypto";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaAuditAdapter,
  PrismaExtKvAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import { mock } from "vitest-mock-extended";
import { EmployeeTasksUseCase } from "../../tasks/public";
import { OperationalPlanUseCase } from "../application/operational-plan.usecase";
import type { OpenBukReplacement } from "@corely/contracts";
import { AppointmentReviewUseCase } from "../application/appointment-review.usecase";
import { PrismaAppointmentReviewStore } from "../infrastructure/repositories/prisma-appointment-review.store";
import { AppointmentDeliveryUseCase } from "../../notifications/public/appointment-delivery";
import { PrismaAppointmentDeliveryStore } from "../../notifications/infrastructure/prisma-appointment-delivery.store";

const url = process.env.OPENBUK_TEST_DATABASE_URL;
const enabled = !!url && /^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(url);

describe.skipIf(!enabled)("Exact appointment decisions", () => {
  const scope = { tenantId: randomUUID(), workspaceId: randomUUID() };
  const agent = { ...scope, userId: "delegator", agentId: "agent-a" };
  const reviewer = { ...scope, userId: "reviewer" };
  const bookingId = randomUUID();
  const clockStart = "2026-10-01T09:59:00.000Z";
  const basis = "2026-10-01T08:00:00.000Z";
  const changed = "2026-10-01T10:00:00.000Z";
  const customer = {
    bookingVersion: changed,
    reference: "OB-SYNTHETIC",
    recipient: "guest@example.test",
    locale: "de" as const,
    timezone: "Europe/Berlin",
    startAt: "2026-10-12T10:00:00.000Z",
    endAt: "2026-10-12T10:45:00.000Z",
  };
  const replacement = {
    startAt: customer.startAt,
    endAt: customer.endAt,
    resourceId: "staff-1",
    resourceName: "Lena",
  };
  let now = new Date(clockStart);
  let failure: "none" | "stale" | "transient" = "none";
  const denied = new Set<string>();
  let writes = 0;
  let prisma: PrismaService;
  let reviews: AppointmentReviewUseCase;
  let plans: OperationalPlanUseCase;
  let delivery: AppointmentDeliveryUseCase;
  const tasks = mock<EmployeeTasksUseCase>();

  beforeAll(async () => {
    process.env.DATABASE_URL = url!;
    prisma = new PrismaService();
    await prisma.$connect();
    const uow = new PrismaUnitOfWork(prisma);
    const kv = new PrismaExtKvAdapter(prisma);
    const outbox = new PrismaOutboxAdapter(prisma);
    const audit = new PrismaAuditAdapter(prisma);
    const clock = { now: () => now };
    const bookings: ConstructorParameters<typeof AppointmentReviewUseCase>[1] = {
      preview: async (input) => ({
        bookingId: input.bookingId,
        reference: customer.reference,
        version: basis,
        timezone: customer.timezone,
        replacement: { ...replacement, startAt: input.startAt },
        current: {
          ...replacement,
          startAt: "2026-10-12T07:00:00.000Z",
          endAt: "2026-10-12T07:45:00.000Z",
        },
      }),
      applyReviewed: async (input: OpenBukReplacement, _key, _ctx, tx) => {
        if (failure === "stale") {
          throw new ConflictException("The requested slot is already taken");
        }
        writes++;
        await outbox.enqueue(
          {
            tenantId: scope.tenantId,
            eventType: "test.booking",
            payload: { bookingId: input.bookingId },
          },
          tx
        );
        if (failure === "transient") {
          throw new Error("injected failure after a booking write");
        }
        return { bookingId: input.bookingId, version: changed, appointment: input.replacement };
      },
      customerMessageContext: async () => customer,
    };
    delivery = new AppointmentDeliveryUseCase(
      new PrismaAppointmentDeliveryStore(prisma, kv),
      { ...bookings, confirmationMessageContext: async () => customer },
      uow,
      outbox,
      clock
    );
    const authority: ConstructorParameters<typeof AppointmentReviewUseCase>[3] = {
      execute: async (actor) => {
        if (
          actor.tenantId !== scope.tenantId ||
          actor.workspaceId !== scope.workspaceId ||
          !actor.manage ||
          denied.has(actor.userId)
        ) {
          throw new ForbiddenException("Manager required");
        }
        return { name: "Test Studio" };
      },
    };
    reviews = new AppointmentReviewUseCase(
      new PrismaAppointmentReviewStore(prisma, kv),
      bookings,
      delivery,
      authority,
      uow,
      audit,
      clock,
      tasks
    );
    plans = new OperationalPlanUseCase(reviews, authority);
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }
    await prisma.extKv.deleteMany({ where: { tenantId: scope.tenantId } });
    await prisma.auditLog.deleteMany({ where: { tenantId: scope.tenantId } });
    await prisma.outboxEvent.deleteMany({ where: { tenantId: scope.tenantId } });
    await prisma.onModuleDestroy();
  });

  const propose = (key = randomUUID()) =>
    reviews.proposeReplacement(agent, { bookingId, startAt: replacement.startAt }, key);
  const moves = () =>
    prisma.outboxEvent.count({ where: { tenantId: scope.tenantId, eventType: "test.booking" } });

  it("previews a mixed plan and applies only the reviewed, authorized action once", async () => {
    const taskId = randomUUID();
    const task = {
      id: taskId,
      title: "Prepare the pickup station",
      status: "OPEN" as const,
      workspaceId: scope.workspaceId,
      ownerName: "Avery",
      ownerStaffId: randomUUID(),
      ownerArchived: false,
      version: 4,
      createdAt: basis,
      updatedAt: basis,
      completedAt: null,
      dueAt: null,
    };
    tasks.authorize.mockResolvedValue({
      scope,
      self: null,
      actorUserId: reviewer.userId,
      manage: true,
      completeOwn: false,
    });
    tasks.detail.mockResolvedValue(task);
    tasks.command.mockResolvedValue({
      ...task,
      status: "COMPLETED",
      version: 5,
      completedAt: changed,
    });
    const batch = {
      key: randomUUID(),
      actions: [
        { kind: "replacement", request: { bookingId, startAt: replacement.startAt } },
        { kind: "task", taskId },
      ],
    };
    const preview = await plans.propose(reviewer, batch);
    expect(await plans.propose(reviewer, batch)).toEqual(preview);
    expect(await moves()).toBe(0);
    expect(tasks.command).not.toHaveBeenCalled();
    const [appointment, followUp] = preview.actions;
    if (!("review" in appointment) || !("review" in followUp)) {
      throw new Error("The mixed plan did not create both reviews");
    }
    const approved = followUp.review;
    await reviews.decide(reviewer, approved.id, { digest: approved.digest, decision: "approve" });
    expect(await reviews.apply(reviewer, approved.id, "task")).toMatchObject({
      state: "applied",
      result: { taskId, taskVersion: 5 },
    });
    expect(await reviews.apply(reviewer, approved.id, "task")).toMatchObject({ state: "applied" });
    expect(tasks.command).toHaveBeenCalledTimes(1);
    expect(tasks.command).toHaveBeenCalledWith(
      "complete",
      taskId,
      { version: 4 },
      approved.id,
      reviewer,
      undefined,
      undefined,
      expect.anything()
    );
    expect((await reviews.get(reviewer, appointment.review.id)).state).toBe("pending");
    expect(await moves()).toBe(0);
    tasks.authorize.mockResolvedValue({
      scope,
      self: null,
      actorUserId: reviewer.userId,
      manage: false,
      completeOwn: false,
    });
    await expect(reviews.get(reviewer, approved.id)).rejects.toThrow("Task review not found");
  });

  it("previews the exact confirmed appointment and only queues its approved email", async () => {
    const currentBookingId = randomUUID();
    const input = {
      key: randomUUID(),
      actions: [{ kind: "confirmation", bookingId: currentBookingId }],
    };
    const previous = await prisma.outboxEvent.count({ where: { tenantId: scope.tenantId } });
    const {
      actions: [item],
    } = await plans.propose(reviewer, input);
    if (!("review" in item) || item.review.action.kind !== "message") {
      throw new Error("Confirmation review was not created");
    }
    const { id, digest, action } = item.review;
    expect(action.payload).toMatchObject({
      bookingId: currentBookingId,
      bookingVersion: changed,
      recipient: customer.recipient,
      subject: "Ihr Termin ist bestätigt",
    });
    expect(action.payload.body).toContain(customer.reference);
    expect(await reviews.apply(reviewer, id, "message")).toMatchObject({ state: "pending" });
    expect(await prisma.outboxEvent.count({ where: { tenantId: scope.tenantId } })).toBe(previous);
    await reviews.decide(reviewer, id, { decision: "approve", digest });
    expect(await reviews.apply(reviewer, id, "message")).toMatchObject({
      state: "applied",
      delivery: { state: "pending", bookingId: currentBookingId },
    });
    await delivery.enqueueConfirmation(scope, currentBookingId);
    expect(await prisma.outboxEvent.count({ where: { tenantId: scope.tenantId } })).toBe(
      previous + 1
    );
  });

  it("uses a separate human decision and commits one replayable result after a rolled-back failure", async () => {
    const key = randomUUID();
    const proposal = await propose(key);
    expect(await propose(key)).toEqual(proposal);
    expect(await moves()).toBe(0);
    await expect(
      reviews.proposeReplacement(agent, { bookingId, startAt: "2026-10-12T11:00:00Z" }, key)
    ).rejects.toThrow("different details");
    await expect(reviews.get({ ...agent, agentId: "agent-b" }, proposal.id)).rejects.toThrow(
      "not found"
    );
    await expect(
      reviews.get({ ...reviewer, workspaceId: randomUUID() }, proposal.id)
    ).rejects.toThrow("Manager required");
    await expect(
      reviews.decide(agent, proposal.id, { decision: "approve", digest: proposal.digest })
    ).rejects.toThrow("human browser");
    await expect(
      reviews.decide(reviewer, proposal.id, { decision: "approve", digest: "1".repeat(64) })
    ).rejects.toThrow("no longer match");
    expect((await reviews.apply(agent, proposal.id, "replacement")).state).toBe("pending");

    await reviews.decide(reviewer, proposal.id, { decision: "approve", digest: proposal.digest });
    denied.add(reviewer.userId);
    await expect(reviews.apply(agent, proposal.id, "replacement")).rejects.toThrow(
      "Manager required"
    );
    denied.delete(reviewer.userId);
    failure = "transient";
    expect(await reviews.apply(agent, proposal.id, "replacement")).toMatchObject({
      state: "failed",
      failureCode: "temporary-failure",
    });
    expect(await moves()).toBe(0);
    failure = "none";
    const [applied, replay] = await Promise.all([
      reviews.apply(agent, proposal.id, "replacement"),
      reviews.apply(agent, proposal.id, "replacement"),
    ]);
    expect(applied).toMatchObject({
      state: "applied",
      result: { bookingId, bookingVersion: changed },
    });
    expect(replay).toEqual(applied);
    expect(writes).toBe(2);
    expect(await moves()).toBe(1);

    const draft = await reviews.proposeMessage(
      agent,
      proposal.id,
      "Bitte bestätigen.",
      randomUUID()
    );
    expect(draft.action.kind === "message" && draft.action.payload).toMatchObject({
      recipient: customer.recipient,
      subject: "Ihr Termin wurde verschoben",
    });
    expect(await reviews.apply(agent, draft.id, "message")).toMatchObject({ state: "pending" });
    const revised = await reviews.proposeMessage(
      agent,
      proposal.id,
      "Neue Nachricht",
      randomUUID()
    );
    expect(revised.digest).not.toBe(draft.digest);
    await expect(
      reviews.decide(reviewer, revised.id, { digest: draft.digest, decision: "approve" })
    ).rejects.toThrow("no longer match");
    await reviews.decide(reviewer, draft.id, { digest: draft.digest, decision: "approve" });
    const queued = await reviews.apply(agent, draft.id, "message");
    expect(queued).toMatchObject({ state: "applied", delivery: { state: "pending", bookingId } });
    expect((await reviews.apply(agent, draft.id, "message")).delivery?.deliveryId).toBe(
      queued.delivery?.deliveryId
    );
    expect(await moves()).toBe(1);
  });

  it("records deterministic staleness, rejection and expiry without applying", async () => {
    const rejected = await propose();
    await reviews.decide(reviewer, rejected.id, { digest: rejected.digest, decision: "reject" });
    expect((await reviews.apply(agent, rejected.id, "replacement")).state).toBe("rejected");
    const old = await propose();
    await reviews.decide(reviewer, old.id, { digest: old.digest, decision: "approve" });
    failure = "stale";
    expect(await reviews.apply(agent, old.id, "replacement")).toMatchObject({
      state: "stale",
      failureCode: "booking-changed",
    });
    failure = "none";
    const expired = await propose();
    now = new Date(now.getTime() + 21 * 60_000);
    expect(
      (await reviews.decide(reviewer, expired.id, { digest: expired.digest, decision: "approve" }))
        .state
    ).toBe("expired");
    expect((await reviews.apply(agent, expired.id, "replacement")).state).toBe("expired");
    expect(await moves()).toBe(1);
  });
});
