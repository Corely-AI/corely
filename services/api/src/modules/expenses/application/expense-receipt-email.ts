import { createHash, createHmac } from "node:crypto";
import type { ExpenseReceiptDraft, ExpenseReceiptDraftFields } from "@corely/contracts";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  parseLocalDate,
  type AuditPort,
  type LoggerPort,
  type UnitOfWorkPort,
  type TransactionContext,
} from "@corely/kernel";
import type { ExpenseReceiptDocumentsPort } from "../../documents/public";
import {
  describeReceiptAttachment,
  matchesReceiptAttachment,
  type InboundAttachment,
} from "../../../shared/inbound-email/receipt-attachment";
import type {
  ExpenseReceiptDraftStore,
  ReceiptActor,
  ReceiptWorkspace,
} from "./expense-receipt-draft-store";
import { EMAILED_EXPENSE_PREFIX } from "../domain/emailed-expense";

const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const personalPattern = /^([a-z0-9-]{1,39})\+([0-9a-f]{24})$/;
const blankFields: ExpenseReceiptDraftFields = {
  merchant: null,
  expenseDate: null,
  amountCents: null,
  currency: null,
  category: null,
};

export type ReceiptSubmission = {
  id: string;
  merchant: string;
  issuedAt: Date;
  amountCents: number;
  currency: string;
  category: string;
};
type IncomingEmail = { id: string; to: string[]; attachments: InboundAttachment[] };

type Deps = {
  store: ExpenseReceiptDraftStore;
  unitOfWork: UnitOfWorkPort;
  documents: ExpenseReceiptDocumentsPort;
  audit: AuditPort;
  log: LoggerPort;
  domain?: string;
  secret?: string;
  tenantForWorkspace: (workspaceId: string) => Promise<string | null>;
  workspaceForSlug: (slug: string) => Promise<ReceiptWorkspace | null>;
  canClaim: (scope: ReceiptWorkspace, userId: string) => Promise<boolean>;
  download: (emailId: string, attachmentId: string) => Promise<Buffer | null>;
  submit: (actor: ReceiptActor, input: ReceiptSubmission, tx: TransactionContext) => Promise<void>;
};

export class ExpenseReceiptEmail {
  constructor(private readonly deps: Deps) {}

  async settings(actor: ReceiptActor, slug?: string) {
    const address = this.sharedAddress(slug);
    const enabled = await this.deps.store.enabled(actor);
    const personal = enabled && actor.canWrite && this.personal(actor);
    return {
      available: Boolean(address),
      enabled,
      address,
      personalAddress:
        personal && (await this.deps.store.userForToken(actor, personal.token)) === actor.userId
          ? personal.address
          : null,
      canManage: actor.canReview,
      canForward: actor.canWrite,
    };
  }

  async setEnabled(actor: ReceiptActor, slug: string | undefined, enabled: boolean) {
    if (!actor.canReview) {
      throw new ForbiddenError("Workspace administrator required");
    }
    if (enabled && !this.sharedAddress(slug)) {
      throw new ValidationError(
        "Expense email receiving needs a configured domain and workspace address"
      );
    }
    await this.deps.unitOfWork.withinTransaction(async (tx) => {
      await this.deps.store.setEnabled(actor, enabled, tx);
      await this.audit(actor, "expense.receipt-email.settings-updated", actor.workspaceId, tx, {
        enabled,
      });
    });
    return this.settings(actor, slug);
  }

  async enablePersonal(actor: ReceiptActor, slug?: string) {
    const personal = this.personal(actor);
    if (!actor.canWrite || !personal || !(await this.deps.store.enabled(actor))) {
      throw new ForbiddenError("Personal receipt forwarding is unavailable");
    }
    await this.deps.store.bindToken(actor, personal.token, actor.userId);
    return this.settings(actor, slug);
  }

  async list(actor: ReceiptActor, after?: string) {
    return { ...(await this.deps.store.list(actor, after)), canReview: actor.canReview };
  }

  async get(actor: ReceiptActor, id: string) {
    const draft = await this.deps.store.find(actor, id);
    return this.requireVisible(actor, draft);
  }

  async original(actor: ReceiptActor, id: string) {
    await this.get(actor, id);
    const original = await this.deps.documents.downloadUrl({ ...actor, receiptId: id });
    if (!original) {
      throw new NotFoundError("Receipt original not found");
    }
    return original;
  }

  async assign(actor: ReceiptActor, id: string, userId: string) {
    if (!actor.canReview || !actor.canWrite || !(await this.deps.canClaim(actor, userId))) {
      throw new ForbiddenError("An authorized reviewer must select a current expense claimant");
    }
    return this.deps.unitOfWork.withinTransaction(async (tx) => {
      const draft = this.requireVisible(actor, await this.deps.store.lock(actor, id, tx));
      if (draft.submittedExpenseId || draft.claimantUserId) {
        throw new ValidationError("This receipt is already assigned");
      }
      const assigned = { ...draft, claimantUserId: userId };
      await this.deps.store.save(actor, assigned, tx);
      await this.audit(actor, "expense.receipt-email.assigned", id, tx, { claimantUserId: userId });
      return assigned;
    });
  }

  async update(
    actor: ReceiptActor,
    id: string,
    fields: ExpenseReceiptDraftFields,
    submit: boolean
  ) {
    if (!actor.canWrite) {
      throw new ForbiddenError("Expense write permission required");
    }
    return this.deps.unitOfWork.withinTransaction(async (tx) => {
      const draft = this.requireVisible(actor, await this.deps.store.lock(actor, id, tx));
      if (draft.claimantUserId !== actor.userId) {
        throw new ForbiddenError("Only the claimant can edit and submit this receipt");
      }
      if (draft.submittedExpenseId) {
        if (submit) {
          return draft;
        }
        throw new ValidationError("This expense has already been submitted");
      }
      const next = { ...draft, ...fields };
      if (submit) {
        const { merchant, expenseDate, amountCents, currency, category } = next;
        if (!merchant || !expenseDate || !amountCents || !currency || !category) {
          throw new ValidationError(
            "Complete the merchant, date, amount, currency and category before submitting"
          );
        }
        const issuedAt = new Date(`${parseLocalDate(expenseDate)}T00:00:00.000Z`);
        await this.deps.submit(
          actor,
          { id, merchant, issuedAt, amountCents, currency, category },
          tx
        );
        next.submittedExpenseId = id;
      }
      await this.deps.store.save(actor, next, tx);
      return next;
    });
  }

  async receive(email: IncomingEmail): Promise<boolean> {
    const routes = new Map<string, { scope: ReceiptWorkspace; claimants: Set<string> }>();
    for (const recipient of new Set(email.to.map((address) => address.trim().toLowerCase()))) {
      const route = await this.resolveRecipient(recipient);
      if (!route) {
        continue;
      }
      const { scope, claimant } = route;
      const entry = routes.get(scope.workspaceId) ?? { scope, claimants: new Set<string>() };
      if (claimant) {
        entry.claimants.add(claimant);
      }
      routes.set(scope.workspaceId, entry);
    }
    if (routes.size !== 1) {
      return true;
    }
    const [route] = routes.values();
    if (!(await this.deps.store.enabled(route.scope))) {
      return true;
    }
    const [first] = route.claimants;
    const claimant = route.claimants.size === 1 ? first : null;
    let succeeded = true;
    for (const attachment of email.attachments) {
      try {
        await this.importAttachment(route.scope, email.id, attachment, claimant);
      } catch {
        succeeded = false;
        this.deps.log.warn("Expense receipt attachment import failed", {
          workspaceId: route.scope.workspaceId,
          emailId: email.id,
          attachmentId: attachment.id,
        });
      }
    }
    return succeeded;
  }

  private async importAttachment(
    scope: ReceiptWorkspace,
    emailId: string,
    attachment: InboundAttachment,
    claimantUserId: string | null
  ) {
    const file = describeReceiptAttachment(attachment, "receipt");
    if (!file) {
      return;
    }
    const id =
      EMAILED_EXPENSE_PREFIX +
      createHash("sha256")
        .update(JSON.stringify([scope.tenantId, scope.workspaceId, emailId, attachment.id]))
        .digest("hex");
    if (await this.deps.store.find(scope, id)) {
      return;
    }
    const bytes = await this.deps.download(emailId, attachment.id);
    if (!bytes || !matchesReceiptAttachment(file.contentType, bytes)) {
      this.deps.log.info("Expense receipt rejected", { emailId, attachmentId: attachment.id });
      return;
    }
    const owner = { ...scope, receiptId: id };
    const document = await this.deps.documents.stage(owner, { ...file, bytes });
    await this.deps.unitOfWork.withinTransaction(async (tx) => {
      if (
        (await this.deps.store.enabled(scope, tx)) &&
        (await this.deps.store.create(
          scope,
          {
            ...blankFields,
            id,
            filename: file.filename,
            receivedAt: new Date().toISOString(),
            claimantUserId,
            submittedExpenseId: null,
          },
          tx
        ))
      ) {
        await this.deps.documents.register(owner, document, tx);
      }
    });
  }

  private async resolveRecipient(recipient: string) {
    const [local, domain, ...extra] = recipient.split("@");
    if (!this.deps.domain || domain !== this.deps.domain || extra.length) {
      return null;
    }
    const personal = personalPattern.exec(local);
    if (personal) {
      const [, workspaceId, token] = personal;
      const tenantId = await this.deps.tenantForWorkspace(workspaceId);
      if (!tenantId) {
        return null;
      }
      const scope = { tenantId, workspaceId };
      const claimant = await this.deps.store.userForToken(scope, token);
      if (
        !claimant ||
        this.personal({ ...scope, userId: claimant })?.token !== token ||
        !(await this.deps.canClaim(scope, claimant))
      ) {
        return null;
      }
      return { scope, claimant };
    }
    const scope = slugPattern.test(local) ? await this.deps.workspaceForSlug(local) : null;
    return scope ? { scope, claimant: null } : null;
  }

  private sharedAddress(slug?: string) {
    return slug && slugPattern.test(slug) && this.deps.domain && this.deps.secret
      ? `${slug}@${this.deps.domain}`
      : null;
  }

  private personal(scope: ReceiptWorkspace & { userId: string }) {
    const { domain, secret } = this.deps;
    if (!domain || !secret || !/^[a-z0-9-]{1,39}$/.test(scope.workspaceId)) {
      return null;
    }
    const token = createHmac("sha256", secret)
      .update(JSON.stringify([scope.tenantId, scope.workspaceId, scope.userId]))
      .digest("hex")
      .slice(0, 24);
    return { token, address: `${scope.workspaceId}+${token}@${domain}` };
  }

  private requireVisible(actor: ReceiptActor, draft: ExpenseReceiptDraft | null) {
    if (
      !draft ||
      (draft.claimantUserId !== actor.userId &&
        !(actor.canReview && (!draft.claimantUserId || draft.submittedExpenseId)))
    ) {
      throw new NotFoundError("Receipt draft not found");
    }
    return draft;
  }

  private audit(
    actor: ReceiptActor,
    action: string,
    entityId: string,
    tx: TransactionContext,
    metadata: Record<string, unknown>
  ) {
    return this.deps.audit.log(
      {
        tenantId: actor.tenantId,
        userId: actor.userId,
        action,
        entityType: "ExpenseReceipt",
        entityId,
        metadata: { ...metadata, workspaceId: actor.workspaceId },
      },
      tx
    );
  }
}
