import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "@corely/kernel";
import { buildExpenseTools } from "./expense.tools";
import { type CreateExpenseUseCase } from "../../application/use-cases/create-expense.usecase";
import { type DocumentsApplication } from "../../../documents/application/documents.application";

describe("expense tools", () => {
  const createExpenseExecute = vi.fn();
  const uploadFileExecute = vi.fn();
  const linkDocumentExecute = vi.fn();

  const createdExpense = {
    id: "exp-1",
    tenantId: "tenant-1",
    status: "DRAFT" as const,
    issuedAt: new Date("2026-03-03T00:00:00.000Z"),
    merchant: "Burger Vision",
    currency: "EUR",
    category: "Meals",
    totalCents: 2910,
    taxAmountCents: 217,
    archivedAt: null,
    createdAt: new Date("2026-03-03T10:00:00.000Z"),
    custom: null,
  };

  const createExpense = {
    execute: createExpenseExecute,
  } as unknown as CreateExpenseUseCase;

  const documentsApp = {
    uploadFile: { execute: uploadFileExecute },
    linkDocument: { execute: linkDocumentExecute },
  } as unknown as DocumentsApplication;

  beforeEach(() => {
    createExpenseExecute.mockReset();
    uploadFileExecute.mockReset();
    linkDocumentExecute.mockReset();

    createExpenseExecute.mockResolvedValue(createdExpense);
    linkDocumentExecute.mockResolvedValue(ok({ entityId: "exp-1", entityType: "EXPENSE" }));
  });

  it("uploads latest user attachments and links them to created expense", async () => {
    uploadFileExecute
      .mockResolvedValueOnce(ok({ document: { id: "doc-1" } }))
      .mockResolvedValueOnce(ok({ document: { id: "doc-2" } }));

    const [tool] = buildExpenseTools(createExpense, documentsApp);
    const result = await tool.execute?.({
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      toolCallId: "tool-1",
      runId: "run-1",
      input: {
        merchantName: "Burger Vision",
        totalAmountCents: 2910,
        expenseDate: "2026-02-20",
        currency: "EUR",
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "file", data: "data:image/png;base64,aGVsbG8=", mediaType: "image/png" },
          ],
        },
        {
          role: "user",
          content: [
            { type: "text", text: "create expense from receipt" },
            {
              type: "file",
              data: "data:image/jpeg;base64,Zmlyc3Q=",
              mediaType: "image/jpeg",
              filename: "receipt-photo.jpg",
            },
            {
              type: "file",
              data: "data:application/pdf;base64,c2Vjb25k",
              mediaType: "application/pdf",
              filename: "invoice.pdf",
            },
          ],
        },
      ] as any,
    });

    expect(createExpenseExecute).toHaveBeenCalledTimes(1);
    expect(uploadFileExecute).toHaveBeenCalledTimes(2);
    expect(linkDocumentExecute).toHaveBeenCalledTimes(2);
    expect(linkDocumentExecute).toHaveBeenNthCalledWith(
      1,
      {
        documentId: "doc-1",
        entityType: "EXPENSE",
        entityId: "exp-1",
      },
      expect.objectContaining({ tenantId: "workspace-1", workspaceId: "workspace-1" })
    );
    expect(linkDocumentExecute).toHaveBeenNthCalledWith(
      2,
      {
        documentId: "doc-2",
        entityType: "EXPENSE",
        entityId: "exp-1",
      },
      expect.objectContaining({ tenantId: "workspace-1", workspaceId: "workspace-1" })
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        expense: expect.objectContaining({
          id: "exp-1",
          receipts: [{ documentId: "doc-1" }, { documentId: "doc-2" }],
        }),
      })
    );
  });

  it("links explicit receipt document ids without uploading files", async () => {
    const [tool] = buildExpenseTools(createExpense, documentsApp);
    const result = await tool.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: {
        merchantName: "Burger Vision",
        totalAmountCents: 2910,
        receiptDocumentIds: ["doc-a", "doc-b"],
      },
      messages: [],
    });

    expect(uploadFileExecute).not.toHaveBeenCalled();
    expect(linkDocumentExecute).toHaveBeenCalledTimes(2);
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        expense: expect.objectContaining({
          receipts: [{ documentId: "doc-a" }, { documentId: "doc-b" }],
        }),
      })
    );
  });
});
