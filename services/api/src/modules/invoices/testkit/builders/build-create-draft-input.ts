import { CreateInvoiceDraftInput } from "../../application/use-cases/CreateInvoiceDraftUseCase";
import { buildRequestContext } from "../../../../shared/context/request-context";

export const buildCreateDraftInput = (
  overrides: Partial<CreateInvoiceDraftInput> = {}
): CreateInvoiceDraftInput => {
  return {
    tenantId: "tenant-1",
    currency: "USD",
    clientId: "client-1",
    lines: [{ description: "Line 1", qty: 1, unitPriceCents: 1000 }],
    idempotencyKey: "invoice-draft-1",
    actorUserId: "user-1",
    context: buildRequestContext({ tenantId: "tenant-1", actorUserId: "user-1" }),
    ...overrides,
  };
};
