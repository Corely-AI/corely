import { z } from "zod";
import { localDateSchema } from "@corely/contracts";
import { isErr, type Result, type UseCaseError } from "@corely/kernel";
import { type ModelMessage } from "ai";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type CreateExpenseUseCase } from "../../application/use-cases/create-expense.usecase";
import { type DocumentsApplication } from "../../../documents/application/documents.application";

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

type FilePartLike = {
  type: "file";
  data: unknown;
  mediaType: string;
  filename?: string;
};

const isFilePartLike = (value: unknown): value is FilePartLike => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const typed = value as Record<string, unknown>;
  return (
    typed.type === "file" &&
    "data" in typed &&
    typeof typed.mediaType === "string" &&
    typed.mediaType.length > 0
  );
};

const parseDataUrl = (
  value: string
): {
  base64: string;
  contentType: string;
} | null => {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    return null;
  }
  const contentType = match[1] || "application/octet-stream";
  const base64 = match[2] || "";
  if (!base64) {
    return null;
  }
  return { base64: base64.replace(/\s+/g, ""), contentType };
};

const toBase64Payload = (
  data: unknown,
  mediaType: string
): {
  base64: string;
  contentType: string;
} | null => {
  if (typeof data === "string") {
    const parsedDataUrl = parseDataUrl(data);
    if (parsedDataUrl) {
      return parsedDataUrl;
    }
    if (data.startsWith("http://") || data.startsWith("https://")) {
      return null;
    }
    return { base64: data.replace(/\s+/g, ""), contentType: mediaType };
  }
  if (data instanceof URL) {
    return null;
  }
  if (Buffer.isBuffer(data)) {
    return { base64: data.toString("base64"), contentType: mediaType };
  }
  if (data instanceof Uint8Array) {
    return { base64: Buffer.from(data).toString("base64"), contentType: mediaType };
  }
  if (data instanceof ArrayBuffer) {
    return { base64: Buffer.from(new Uint8Array(data)).toString("base64"), contentType: mediaType };
  }
  return null;
};

const extensionFromMediaType = (mediaType: string): string => {
  switch (mediaType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
};

const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, "_");

const normalizeAttachment = (
  filePart: FilePartLike,
  index: number
): {
  filename: string;
  contentType: string;
  base64: string;
} | null => {
  const payload = toBase64Payload(filePart.data, filePart.mediaType);
  if (!payload) {
    return null;
  }
  const fallbackName = `receipt-${index + 1}.${extensionFromMediaType(payload.contentType)}`;
  return {
    filename: sanitizeFilename(filePart.filename ?? fallbackName),
    contentType: payload.contentType,
    base64: payload.base64,
  };
};

const extractLatestUserAttachments = (messages?: ModelMessage[]): FilePartLike[] => {
  if (!messages?.length) {
    return [];
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }
    if (!Array.isArray(message.content)) {
      return [];
    }
    const attachments = (message.content as unknown[]).filter(isFilePartLike);
    return attachments;
  }
  return [];
};

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
