import { IssueInvoiceInput } from "../../application/use-cases/IssueInvoiceUseCase";
import { buildRequestContext } from "../../../../shared/context/request-context";

export const buildIssueInput = (overrides: Partial<IssueInvoiceInput> = {}): IssueInvoiceInput => {
  return {
    invoiceId: "invoice-1",
    tenantId: "tenant-1",
    idempotencyKey: "issue-1",
    actorUserId: "user-1",
    context: buildRequestContext({ tenantId: "tenant-1", actorUserId: "user-1" }),
    ...overrides,
  };
};
