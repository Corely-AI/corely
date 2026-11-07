import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  CLOCK_PORT_TOKEN,
  type AuditPort,
  type OutboxPort,
  type UnitOfWorkPort,
  type ClockPort,
  type UseCaseContext,
  type TransactionContext,
} from "@corely/kernel";
import {
  type StartPilotWorkspaceInput,
  CreatePilotInviteInputSchema,
  AcceptPilotWorkspaceInviteInputSchema,
} from "@corely/contracts";
import { AssociateInvitedAccountUseCase } from "../../../identity/public";
import { AuthorizeWorkspaceUseCase } from "./authorize-workspace.usecase";
import { GetWorkspaceUseCase } from "./get-workspace.usecase";
import {
  PILOT_SETUP_REPOSITORY,
  type PilotSetupRepositoryPort,
} from "../ports/pilot-setup-repository.port";

@Injectable()
export class PilotSetupUseCase {
  constructor(
    @Inject(PILOT_SETUP_REPOSITORY) private readonly repo: PilotSetupRepositoryPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    private readonly authorize: AuthorizeWorkspaceUseCase,
    private readonly getWorkspace: GetWorkspaceUseCase,
    private readonly accounts: AssociateInvitedAccountUseCase
  ) {}
  private actor(ctx: UseCaseContext) {
    if (!ctx.tenantId || !ctx.userId) {
      throw new BadRequestException("Authenticated tenant required");
    }
    return { tenantId: ctx.tenantId, userId: ctx.userId };
  }
  private async record(
    action: string,
    workspaceId: string,
    ctx: { tenantId: string; userId: string },
    tx: TransactionContext
  ) {
    await this.audit.log(
      { ...ctx, action, entityType: "Workspace", entityId: workspaceId, metadata: { workspaceId } },
      tx
    );
    await this.outbox.enqueue(
      { tenantId: ctx.tenantId, eventType: action, payload: { workspaceId, userId: ctx.userId } },
      tx
    );
  }
  async start(input: StartPilotWorkspaceInput, ctx: UseCaseContext) {
    const actor = this.actor(ctx);
    const workspaceId = await this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(`start:${actor.tenantId}:${actor.userId}`, tx);
      const existing = await this.repo.firstWorkspaces(actor.tenantId, actor.userId, tx);
      if (existing.length > 1) {
        throw new ConflictException("Select an existing workspace");
      }
      if (existing[0]) {
        return existing[0];
      }
      const id = await this.repo.createInitial(actor.tenantId, actor.userId, input, tx);
      await this.record("workspace.pilot.started", id, actor, tx);
      return id;
    });
    await this.authorize.execute({ ...actor, workspaceId, manage: true });
    return this.getWorkspace.execute({ ...actor, workspaceId });
  }
  /** Booking invokes this public Workspaces interface after deterministic setup validation, in its transaction. */
  async publish(ctx: UseCaseContext, tx: TransactionContext) {
    const actor = this.actor(ctx);
    if (!ctx.workspaceId) {
      throw new BadRequestException("Select a workspace");
    }
    await this.repo.lock(`publication:${ctx.workspaceId}`, tx);
    await this.authorize.execute({ ...actor, workspaceId: ctx.workspaceId, manage: true });
    if (await this.repo.publishBooking(actor.tenantId, ctx.workspaceId, tx)) {
      await this.record("workspace.booking.published", ctx.workspaceId, actor, tx);
    }
  }
  async invite(workspaceId: string, email: string, ctx: UseCaseContext) {
    const actor = this.actor(ctx);
    const input = CreatePilotInviteInputSchema.parse({ email });
    await this.authorize.execute({ ...actor, workspaceId, manage: true });
    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(`invite:${workspaceId}:${input.email}`, tx);
      // Revalidate after waiting; a stale owner action must not create an invitation.
      await this.authorize.execute({ ...actor, workspaceId, manage: true });
      const now = this.clock.now();
      const previous = await this.repo.pendingInvite(workspaceId, input.email, now, tx);
      if (previous) {
        return { invite: previous };
      }
      const invite = await this.repo.createInvite(
        {
          ...actor,
          workspaceId,
          email: input.email,
          expiresAt: new Date(now.getTime() + 7 * 86400000),
        },
        tx
      );
      await this.record("workspace.staff.invited", workspaceId, actor, tx);
      return { invite };
    });
  }
  async accept(token: string, ctx: UseCaseContext) {
    const actor = this.actor(ctx);
    AcceptPilotWorkspaceInviteInputSchema.parse({ token });
    return this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(`accept:${token}`, tx);
      const invite = await this.repo.invite(token, tx);
      const now = this.clock.now();
      if (
        !invite ||
        !["PENDING", "ACCEPTED"].includes(invite.status) ||
        (invite.status === "PENDING" && Date.parse(invite.expiresAt) <= now.getTime()) ||
        invite.role !== "MEMBER"
      ) {
        throw new ForbiddenException("Invitation unavailable or expired");
      }
      await this.repo.lock(`member:${invite.workspaceId}:${actor.userId}`, tx);
      const member = await this.repo.member(invite.workspaceId, actor.userId, tx);
      if ((member && member.status !== "ACTIVE") || (invite.status === "ACCEPTED" && !member)) {
        throw new ForbiddenException("Invitation no longer grants access");
      }
      await this.accounts.execute(
        {
          tenantId: invite.tenantId,
          userId: actor.userId,
          email: invite.email,
          allowCreate: invite.status === "PENDING",
        },
        tx
      );
      const membershipId =
        member?.id ?? (await this.repo.addMember(invite.workspaceId, actor.userId, tx));
      if (invite.status === "PENDING") {
        await this.repo.accept(invite.id, now, tx);
        await this.record(
          "workspace.staff.joined",
          invite.workspaceId,
          { tenantId: invite.tenantId, userId: actor.userId },
          tx
        );
      }
      return { workspaceId: invite.workspaceId, membershipId, tenantId: invite.tenantId };
    });
  }
}
