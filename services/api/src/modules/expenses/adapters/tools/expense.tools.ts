import { z } from "zod";
import { localDateSchema } from "@corely/contracts";
import { isErr, type Result, type UseCaseError } from "@corely/kernel";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type CreateExpenseUseCase } from "../../application/use-cases/create-expense.usecase";
import { type DocumentsApplication } from "../../../documents/application/documents.application";
import {
  extractLatestUserAttachments,
  normalizeAttachment,
} from "../../../../shared/adapters/tools/file-parts";

const ExpenseCreateDraftToolInputSchema = z.object({
  merchantName: z.string().min(1),
  totalAmountCents: z.number().int().positive(),
  expenseDate: localDateSchema.optional(),
  currency: z.string().min(1).optional(),
  taxAmountCents: z.number().int().nonnegative().optional(),
  category: z.string().min(1).optional(),
  idempotencyKey: z.string().min(1).optional(),
  receiptDocumentIds: z.array(z.string().min(1)).optional(),
});

const toExpenseDate = (value?: string): Date => {
  if (!value) {
    return new Date();
  }
  return new Date(`${value}T00:00:00.000Z`);
};

const toLocalDate = (value: Date): string => value.toISOString().slice(0, 10);

const ensureSuccess = <T>(result: Result<T, UseCaseError>, operation: string): T => {
  if (!isErr(result)) {
    return result.value;
  }
  throw new Error(`${operation} failed: ${result.error.message ?? "unknown error"}`);
};

export const buildExpenseTools = (
  createExpense: CreateExpenseUseCase,
  documentsApp: DocumentsApplication
): DomainToolPort[] => [
  {
    name: "expense_create_draft",
    description:
      "Create a new expense in DRAFT status. Use this after extracting receipt details (merchant, amount, date).",
    kind: "server",
    inputSchema: ExpenseCreateDraftToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId, messages }) => {
      const parsed = ExpenseCreateDraftToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const scopedTenantId = workspaceId ?? tenantId;
      const ctx = buildToolCtx({
        tenantId: scopedTenantId,
        workspaceId: workspaceId ?? scopedTenantId,
        userId,
        toolCallId,
        runId,
      });

      const created = await createExpense.execute(
        {
          tenantId: scopedTenantId,
          merchant: parsed.data.merchantName,
          totalCents: parsed.data.totalAmountCents,
          taxAmountCents: parsed.data.taxAmountCents ?? null,
          currency: parsed.data.currency ?? "EUR",
          category: parsed.data.category ?? null,
          issuedAt: toExpenseDate(parsed.data.expenseDate),
          createdByUserId: userId,
          idempotencyKey:
            parsed.data.idempotencyKey ??
            `${runId ?? "copilot"}:${toolCallId ?? "expense-create-draft"}`,
          initialStatusOverride: "DRAFT",
        },
        ctx
      );

      const receiptDocumentIds = new Set<string>(parsed.data.receiptDocumentIds ?? []);
      const receiptAttachments = extractLatestUserAttachments(messages);
      for (const [index, attachment] of receiptAttachments.entries()) {
        const normalized = normalizeAttachment(attachment, index);
        if (!normalized) {
          continue;
        }
        const uploaded = await documentsApp.uploadFile.execute(
          {
            filename: normalized.filename,
            contentType: normalized.contentType,
            base64: normalized.base64,
            isPublic: false,
            category: "expense-receipt",
            purpose: "copilot.expense.receipt",
          },
          ctx
        );
        const uploadedValue = ensureSuccess(uploaded, "receipt upload");
        receiptDocumentIds.add(uploadedValue.document.id);
      }

      for (const documentId of receiptDocumentIds) {
        const linked = await documentsApp.linkDocument.execute(
          {
            documentId,
            entityType: "EXPENSE",
            entityId: created.id,
          },
          ctx
        );
        ensureSuccess(linked, "receipt link");
      }

      return {
        ok: true,
        expense: {
          id: created.id,
          tenantId: created.tenantId,
          status: created.status,
          expenseDate: toLocalDate(created.issuedAt),
          merchantName: created.merchant,
          supplierPartyId: null,
          currency: created.currency,
          notes: null,
          category: created.category,
          totalAmountCents: created.totalCents,
          taxAmountCents: created.taxAmountCents ?? null,
          archivedAt: created.archivedAt?.toISOString() ?? null,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.createdAt.toISOString(),
          lines: [],
          receipts: Array.from(receiptDocumentIds).map((documentId) => ({ documentId })),
          custom: created.custom ?? undefined,
        },
      };
    },
  },
];
