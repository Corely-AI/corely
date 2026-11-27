import { Injectable } from "@nestjs/common";
import { PrismaExtKvAdapter } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import type {
  InvoiceEmailSettingsPort,
  WorkspaceScope,
} from "../../application/invoice-email-intake";

const keyFor = (scope: WorkspaceScope) => ({
  tenantId: scope.tenantId,
  moduleId: "purchasing",
  scope: `workspace:${scope.workspaceId}`,
  key: "invoice-email-enabled",
});

@Injectable()
export class InvoiceEmailSettingsAdapter implements InvoiceEmailSettingsPort {
  constructor(private readonly kv: PrismaExtKvAdapter) {}

  async enabled(scope: WorkspaceScope, tx?: TransactionContext) {
    const entry = await this.kv.get(keyFor(scope), tx);
    return entry?.value === true;
  }

  async setEnabled(scope: WorkspaceScope, enabled: boolean, tx: TransactionContext) {
    await this.kv.set({ ...keyFor(scope), value: enabled }, tx);
  }
}
