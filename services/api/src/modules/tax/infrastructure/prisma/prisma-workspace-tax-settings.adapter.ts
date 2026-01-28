import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { WorkspaceTaxSettingsPort } from "../../application/ports/workspace-tax-settings.port";

@Injectable()
export class PrismaWorkspaceTaxSettingsAdapter implements WorkspaceTaxSettingsPort {
  constructor(private readonly prisma: PrismaService) {}

  async getLegalEntityKind(workspaceId: string): Promise<string | null> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        legalEntity: {
          select: { kind: true },
        },
      },
    });
    return workspace?.legalEntity?.kind ?? null;
  }
}
