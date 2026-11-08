import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import type { StaffLinkScope, StaffWorkspaceAccess } from "@corely/contracts";
import { AuthorizeWorkspaceUseCase } from "../../application/use-cases/authorize-workspace.usecase";
@Injectable()
export class StaffWorkspaceAccessAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorize: AuthorizeWorkspaceUseCase,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}
  async inspect(
    scope: StaffLinkScope,
    actorId: string,
    targetId: string | null,
    tx: TransactionContext
  ): Promise<StaffWorkspaceAccess> {
    await this.authorize.execute({ ...scope, userId: actorId }, tx);
    if (!targetId) {
      return { linked: false, status: "UNLINKED", canDisable: false };
    }
    const client = getPrismaClient(this.prisma, tx);
    const [actor, target] = await Promise.all([
      client.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: scope.workspaceId, userId: actorId } },
      }),
      client.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: scope.workspaceId, userId: targetId } },
      }),
    ]);
    return {
      linked: true,
      status: target?.status ?? "MISSING",
      canDisable: Boolean(
        target &&
        target.status !== "DISABLED" &&
        target.role !== "OWNER" &&
        targetId !== actorId &&
        actor?.status === "ACTIVE" &&
        ["OWNER", "ADMIN"].includes(actor.role)
      ),
    };
  }
  async assertCanDisable(
    scope: StaffLinkScope,
    targetId: string | null,
    ctx: UseCaseContext,
    tx: TransactionContext
  ) {
    if (!ctx.userId) {
      throw new ForbiddenException("Workspace administration required");
    }
    await this.authorize.execute({ ...scope, userId: ctx.userId, manage: true }, tx);
    if (!targetId || targetId === ctx.userId) {
      throw new ForbiddenException("Cannot disable yourself or an unlinked account");
    }
    const target = await getPrismaClient(this.prisma, tx).workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId: scope.workspaceId, userId: targetId } },
    });
    if (!target || target.role === "OWNER") {
      throw new ForbiddenException("Cannot disable an owner or an unavailable workspace member");
    }
  }
  async disable(
    scope: StaffLinkScope,
    targetId: string | null,
    ctx: UseCaseContext,
    tx: TransactionContext
  ) {
    if (!ctx.userId) {
      throw new ForbiddenException("Workspace administration required");
    }
    const client = getPrismaClient(this.prisma, tx);
    await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify(["workspace-membership", scope.workspaceId])},0))::text`;
    // Row locks also coordinate with existing owner operations that update these
    // memberships without using the lifecycle advisory lock.
    await client.$queryRaw`SELECT "id" FROM "platform"."WorkspaceMembership"
      WHERE "workspaceId" = ${scope.workspaceId}
      AND ("userId" = ${ctx.userId} OR "userId" = ${targetId})
      ORDER BY "id" FOR UPDATE`;
    await this.assertCanDisable(scope, targetId, ctx, tx);
    const view = await this.inspect(scope, ctx.userId, targetId, tx);
    if (view.status === "DISABLED") {
      return;
    }
    if (!view.canDisable || !targetId) {
      throw new ForbiddenException(
        "Cannot disable an owner, yourself, or an unavailable workspace member"
      );
    }
    const membership = await client.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: scope.workspaceId, userId: targetId } },
      data: { status: "DISABLED" },
    });
    await this.audit.log(
      {
        tenantId: scope.tenantId,
        userId: ctx.userId,
        action: "workspaces.member.disable",
        entityType: "WorkspaceMembership",
        entityId: membership.id,
        metadata: { workspaceId: scope.workspaceId },
      },
      tx
    );
    await this.outbox.enqueue(
      {
        tenantId: scope.tenantId,
        eventType: "workspaces.member.disable",
        payload: { workspaceId: scope.workspaceId, userId: targetId },
        correlationId: ctx.correlationId,
      },
      tx
    );
  }
}
