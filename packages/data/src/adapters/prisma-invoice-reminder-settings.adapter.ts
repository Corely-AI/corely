import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WorkspaceInvoiceSettingsSchema } from "@corely/contracts";
import { InvoiceReminderSettingsPort } from "@corely/kernel";
import { normalizeReminderPolicy, InvoiceReminderPolicy } from "@corely/domain";

@Injectable()
export class PrismaInvoiceReminderSettingsAdapter implements InvoiceReminderSettingsPort {
  private readonly logger = new Logger(PrismaInvoiceReminderSettingsAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(tenantId: string, workspaceId: string): Promise<InvoiceReminderPolicy> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { tenantId, id: workspaceId, deletedAt: null },
      select: { invoiceSettings: true },
    });

    const parsed = WorkspaceInvoiceSettingsSchema.safeParse(workspace?.invoiceSettings ?? {});
    if (!parsed.success) {
      this.logger.warn(`Invalid invoiceSettings for workspace ${workspaceId}; using defaults.`);
      return normalizeReminderPolicy();
    }

    return normalizeReminderPolicy(parsed.data.reminderPolicy ?? undefined);
  }
}
