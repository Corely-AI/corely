import {
  describeReceiptAttachment,
  matchesReceiptAttachment,
  type InboundAttachment,
} from "../../../shared/inbound-email/receipt-attachment";
import { createHash } from "node:crypto";
import type { InvoiceEmailSettings } from "@corely/contracts";
import {
  type AuditPort,
  type ClockPort,
  type LoggerPort,
  type TransactionContext,
  type UnitOfWorkPort,
  NotFoundError,
  ValidationError,
} from "@corely/kernel";
import type { VendorBillDocumentsPort } from "../../documents/public";
import type { VendorBillRepositoryPort } from "./ports/vendor-bill-repository.port";
import { VendorBillAggregate } from "../domain/vendor-bill.aggregate";

export type WorkspaceScope = { tenantId: string; workspaceId: string };

type IncomingInvoiceEmail = {
  id: string;
  to: string[];
  attachments: InboundAttachment[];
};

export interface InvoiceEmailSettingsPort {
  enabled(scope: WorkspaceScope, tx?: TransactionContext): Promise<boolean>;
  setEnabled(scope: WorkspaceScope, enabled: boolean, tx: TransactionContext): Promise<void>;
}

const addressId = /^[a-z0-9-]{1,56}$/;

type Deps = {
  bills: VendorBillRepositoryPort;
  documents: VendorBillDocumentsPort;
  settings: InvoiceEmailSettingsPort;
  findActiveTenant: (workspaceId: string) => Promise<string | null>;
  download: (emailId: string, attachmentId: string) => Promise<Buffer | null>;
  unitOfWork: UnitOfWorkPort;
  audit: AuditPort;
  clock: ClockPort;
  logger: LoggerPort;
  domain: string | undefined;
};

export class InvoiceEmailIntake {
  constructor(private readonly deps: Deps) {}

  async getSettings(scope: WorkspaceScope): Promise<InvoiceEmailSettings> {
    const address = this.address(scope.workspaceId);
    return {
      available: Boolean(address),
      enabled: await this.deps.settings.enabled(scope),
      address,
    };
  }

  async setEnabled(scope: WorkspaceScope, userId: string, enabled: boolean) {
    if (enabled && !this.address(scope.workspaceId)) {
      throw new ValidationError("Invoice email receiving is unavailable");
    }
    await this.deps.unitOfWork.withinTransaction(async (tx) => {
      await this.deps.settings.setEnabled(scope, enabled, tx);
      await this.deps.audit.log(
        {
          tenantId: scope.tenantId,
          userId,
          action: "purchasing.invoice-email.settings-updated",
          entityType: "Workspace",
          entityId: scope.workspaceId,
          metadata: { enabled },
        },
        tx
      );
    });
    return this.getSettings(scope);
  }

  async original(scope: WorkspaceScope, billId: string) {
    const bill = await this.deps.bills.findById(scope.tenantId, billId, scope.workspaceId);
    if (!bill?.sourceFilename || bill.workspaceId !== scope.workspaceId) {
      throw new NotFoundError("Original invoice not found");
    }
    const original = await this.deps.documents.downloadUrl({ ...scope, billId });
    if (!original) {
      throw new NotFoundError("Original invoice not found");
    }
    return original;
  }

  async receive(email: IncomingInvoiceEmail): Promise<boolean> {
    const workspaces = new Set(email.to.map((recipient) => this.workspaceForRecipient(recipient)));
    let failed = false;
    for (const workspaceId of workspaces) {
      if (!workspaceId) {
        continue;
      }
      const tenantId = await this.deps.findActiveTenant(workspaceId);
      const scope = tenantId ? { tenantId, workspaceId } : null;
      if (!scope || !(await this.deps.settings.enabled(scope))) {
        continue;
      }
      for (const attachment of email.attachments) {
        try {
          await this.importAttachment(scope, email.id, attachment);
        } catch {
          failed = true;
          this.deps.logger.warn("Invoice email attachment import failed", {
            workspaceId,
            emailId: email.id,
            attachmentId: attachment.id,
          });
        }
      }
    }
    return !failed;
  }

  private address(workspaceId: string) {
    return this.deps.domain && addressId.test(workspaceId)
      ? `invoice+${workspaceId}@${this.deps.domain}`
      : null;
  }

  private workspaceForRecipient(recipient: string) {
    const [alias, domain, ...extra] = recipient.trim().toLowerCase().split("@");
    if (
      !this.deps.domain ||
      extra.length ||
      !alias?.startsWith("invoice+") ||
      domain !== this.deps.domain
    ) {
      return null;
    }
    const workspaceId = alias.slice("invoice+".length);
    return addressId.test(workspaceId) ? workspaceId : null;
  }

  private async importAttachment(
    scope: WorkspaceScope,
    emailId: string,
    attachment: InboundAttachment
  ) {
    const file = describeReceiptAttachment(attachment, "invoice");
    if (!file) {
      this.deps.logger.info("Invoice email attachment rejected", {
        emailId,
        attachmentId: attachment.id,
        reason: "unsupported-type-or-inline",
      });
      return;
    }
    const billId = createHash("sha256")
      .update(JSON.stringify([scope.tenantId, scope.workspaceId, "resend", emailId, attachment.id]))
      .digest("hex");
    if (await this.deps.bills.findById(scope.tenantId, billId, scope.workspaceId)) {
      return;
    }
    const bytes = await this.deps.download(emailId, attachment.id);
    if (!bytes || !matchesReceiptAttachment(file.contentType, bytes)) {
      this.deps.logger.info("Invoice email attachment rejected", {
        emailId,
        attachmentId: attachment.id,
        reason: "invalid-signature-or-size",
      });
      return;
    }
    const owner = { ...scope, billId };
    const document = await this.deps.documents.stage(owner, { ...file, bytes });
    const draft = VendorBillAggregate.createDraft({
      ...scope,
      id: billId,
      sourceFilename: file.filename,
      supplierPartyId: null,
      billDate: null,
      dueDate: null,
      currency: null,
      lineItems: [],
      now: this.deps.clock.now(),
    });
    await this.deps.unitOfWork.withinTransaction(async (tx) => {
      if (
        (await this.deps.settings.enabled(scope, tx)) &&
        (await this.deps.bills.createEmailDraft(draft, tx))
      ) {
        await this.deps.documents.register(owner, document, tx);
      }
    });
  }
}
