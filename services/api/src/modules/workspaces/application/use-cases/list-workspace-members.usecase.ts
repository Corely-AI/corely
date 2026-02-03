import { Inject, Injectable, ForbiddenException } from "@nestjs/common";
import type { ListWorkspaceMembersOutput } from "@corely/contracts";
import { PrismaService } from "@corely/data";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../ports/workspace-repository.port";

export interface ListWorkspaceMembersCommand {
  tenantId: string;
  userId: string;
  workspaceId: string;
}

@Injectable()
export class ListWorkspaceMembersUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  async execute(command: ListWorkspaceMembersCommand): Promise<ListWorkspaceMembersOutput> {
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      command.tenantId,
      command.workspaceId,
      command.userId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const memberships = await this.prisma.workspaceMembership.findMany({
      where: { workspaceId: command.workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const invites = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId: command.workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return {
      members: memberships.map((membership) => ({
        membershipId: membership.id,
        workspaceId: membership.workspaceId,
        userId: membership.userId,
        role: membership.role,
        status: membership.status,
        email: membership.user?.email ?? undefined,
        name: membership.user?.name ?? null,
        createdAt: membership.createdAt.toISOString(),
      })),
      invites: invites.length
        ? invites.map((invite) => ({
            id: invite.id,
            workspaceId: invite.workspaceId,
            email: invite.email,
            role: invite.role,
            status: invite.status,
            token: invite.token,
            expiresAt: invite.expiresAt.toISOString(),
            acceptedAt: invite.acceptedAt?.toISOString() ?? null,
            createdByUserId: invite.createdByUserId ?? undefined,
            createdAt: invite.createdAt.toISOString(),
          }))
        : undefined,
    };
  }
}
