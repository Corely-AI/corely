import {
  type GetInvoiceByIdInput,
  type InvoiceDto,
  type InvoiceCapabilities,
} from "@corely/contracts";

export type GetInvoiceByIdCommand = GetInvoiceByIdInput;
export type GetInvoiceByIdResult = { invoice: InvoiceDto; capabilities?: InvoiceCapabilities };
