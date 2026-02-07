import { Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "@corely/data";
import { WorkspaceInvoiceSettingsSchema } from "@corely/contracts";
import type { InvoiceReminderSettingsPort } from "../../application/ports/invoice-reminder-settings.port";
import { normalizeReminderPolicy } from "../../application/helpers/reminder-policy";

@Injectable()
export class PrismaInvoiceReminderSettingsAdapter implements InvoiceReminderSettingsPort {
  private readonly logger = new Logger(PrismaInvoiceReminderSettingsAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(tenantId: string, workspaceId: string) {
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
