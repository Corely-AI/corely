import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import {
  WorkspacePublicModulesSchema,
  WorkspaceInviteDtoSchema,
  type StartPilotWorkspaceInput,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { randomBytes, randomUUID } from "node:crypto";
import type { PilotSetupRepositoryPort } from "../../application/ports/pilot-setup-repository.port";

@Injectable()
export class PrismaPilotSetupRepository implements PilotSetupRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}
  async lock(key: string, tx: TransactionContext) {
    await getPrismaClient(this.prisma, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pilot:${key}`}, 0))::text`;
  }
  async publishBooking(tenantId: string, workspaceId: string, tx: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    const workspace = await client.workspace.findFirstOrThrow({
      where: { id: workspaceId, tenantId, deletedAt: null },
    });
    const modules = WorkspacePublicModulesSchema.parse(workspace.publicModules ?? {});
    if (workspace.publicEnabled && modules.booking) {
      return false;
    }
    await client.workspace.update({
      where: { id: workspaceId, tenantId, deletedAt: null },
      data: {
        publicEnabled: true,
        publicModules: { ...modules, booking: true },
      },
    });
    return true;
  }
  async firstWorkspaces(tenantId: string, userId: string, tx: TransactionContext) {
    const rows = await getPrismaClient(this.prisma, tx).workspace.findMany({
      where: { tenantId, deletedAt: null, memberships: { some: { userId, status: "ACTIVE" } } },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
  async createInitial(
    tenantId: string,
    userId: string,
    input: StartPilotWorkspaceInput,
    tx: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    const entity = await client.legalEntity.create({
      data: {
        tenantId,
        kind: "COMPANY",
        legalName: input.name,
        countryCode: input.countryCode,
        currency: input.currency,
      },
    });
    const id = randomUUID();
    await client.workspace.create({
      data: {
        id,
        tenantId,
        legalEntityId: entity.id,
        name: input.name,
        slug: `studio-${id}`,
        publicEnabled: false,
        onboardingStatus: "PROFILE",
        memberships: { create: { userId, role: "OWNER", status: "ACTIVE" } },
      },
    });
    return id;
  }
  private dto(row: { createdAt: Date; expiresAt: Date; acceptedAt: Date | null }) {
    return WorkspaceInviteDtoSchema.parse({
      ...row,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
    });
  }
  async pendingInvite(workspaceId: string, email: string, now: Date, tx: TransactionContext) {
    const row = await getPrismaClient(this.prisma, tx).workspaceInvite.findFirst({
      where: { workspaceId, email, status: "PENDING", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    });
    return row ? this.dto(row) : null;
  }
  async createInvite(
    input: { workspaceId: string; email: string; userId: string; expiresAt: Date },
    tx: TransactionContext
  ) {
    const row = await getPrismaClient(this.prisma, tx).workspaceInvite.create({
      data: {
        workspaceId: input.workspaceId,
        email: input.email,
        role: "MEMBER",
        token: randomBytes(32).toString("hex"),
        createdByUserId: input.userId,
        expiresAt: input.expiresAt,
      },
    });
    return this.dto(row);
  }
  async invite(token: string, tx: TransactionContext) {
    const row = await getPrismaClient(this.prisma, tx).workspaceInvite.findUnique({
      where: { token },
      include: { workspace: { select: { tenantId: true, deletedAt: true } } },
    });
    return row && !row.workspace.deletedAt
      ? { ...this.dto(row), tenantId: row.workspace.tenantId }
      : null;
  }
  async accept(id: string, now: Date, tx: TransactionContext) {
    await getPrismaClient(this.prisma, tx).workspaceInvite.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: now },
    });
  }
  async member(workspaceId: string, userId: string, tx: TransactionContext) {
    return getPrismaClient(this.prisma, tx).workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: { id: true, status: true },
    });
  }
  async addMember(workspaceId: string, userId: string, tx: TransactionContext) {
    const member = await getPrismaClient(this.prisma, tx).workspaceMembership.create({
      data: { workspaceId, userId, role: "MEMBER", status: "ACTIVE" },
    });
    return member.id;
  }
}
