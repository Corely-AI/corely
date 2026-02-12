import {
  CancelInvoiceInputSchema,
  CreateInvoiceInputSchema,
  DraftInvoiceIssueEmailInputSchema,
  DraftInvoiceReminderEmailInputSchema,
  FinalizeInvoiceInputSchema,
  GetInvoiceByIdInputSchema,
  ListInvoicesInputSchema,
  RecordPaymentInputSchema,
  SendInvoiceInputSchema,
  UpdateInvoiceInputSchema,
} from "@corely/contracts";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type InvoicesApplication } from "../../application/invoices.application";
import { mapToolResult } from "./mappers";

export const buildInvoiceTools = (app: InvoicesApplication): DomainToolPort[] => [
  {
    name: "invoice_get",
    description: "Fetch a single invoice by id for the current tenant.",
    kind: "server",
    inputSchema: GetInvoiceByIdInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = GetInvoiceByIdInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.getInvoiceById.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_list",
    description: "List invoices with optional filters (status, customer, date range).",
    kind: "server",
    inputSchema: ListInvoicesInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = ListInvoicesInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.listInvoices.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_create",
    description:
      "Create a draft invoice with line items when customerPartyId is known (use invoice_create_from_customer for names).",
    kind: "server",
    inputSchema: CreateInvoiceInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = CreateInvoiceInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.createInvoice.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_update",
    description: "Update invoice header or line items (draft only for lines).",
    kind: "server",
    inputSchema: UpdateInvoiceInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = UpdateInvoiceInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.updateInvoice.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_finalize",
    description: "Finalize a draft invoice (assigns number and marks issued).",
    kind: "server",
    inputSchema: FinalizeInvoiceInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = FinalizeInvoiceInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.finalizeInvoice.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_send",
    description: "Mark an invoice as sent (email/link).",
    kind: "server",
    inputSchema: SendInvoiceInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = SendInvoiceInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.sendInvoice.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_record_payment",
    description: "Record a payment for an invoice.",
    kind: "server",
    inputSchema: RecordPaymentInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = RecordPaymentInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.recordPayment.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_cancel",
    description: "Cancel an invoice.",
    kind: "server",
    inputSchema: CancelInvoiceInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = CancelInvoiceInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.cancelInvoice.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_draft_issue_email",
    description:
      "Draft the first invoice sent/issued email in de/vi/en with friendly or neutral tone (draft-only, no send).",
    kind: "server",
    inputSchema: DraftInvoiceIssueEmailInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = DraftInvoiceIssueEmailInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.draftInvoiceIssueEmail.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
  {
    name: "invoice_draft_reminder_email",
    description:
      "Draft a payment reminder email in de/vi/en with polite, normal, or firm tone (draft-only, no send).",
    kind: "server",
    inputSchema: DraftInvoiceReminderEmailInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = DraftInvoiceReminderEmailInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.draftReminderEmail.execute(
        parsed.data,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return mapToolResult(result);
    },
  },
];
