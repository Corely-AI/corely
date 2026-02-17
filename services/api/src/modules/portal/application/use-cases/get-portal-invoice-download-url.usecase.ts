import {
  BaseUseCase,
  ok,
  err,
  ForbiddenError,
  ConflictError,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  type LoggerPort,
  isErr,
} from "@corely/kernel";
import { type DocumentsApplication } from "../../../documents/application/documents.application";
import { type GetStudentInvoicesUseCase } from "./get-student-invoices.usecase";

type Deps = {
  logger: LoggerPort;
  documentsApp: DocumentsApplication;
  getStudentInvoices: GetStudentInvoicesUseCase;
};

export class GetPortalInvoiceDownloadUrlUseCase extends BaseUseCase<
  { studentId: string; invoiceId: string },
  { url: string; expiresAt?: string }
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: { studentId: string; invoiceId: string },
    ctx: UseCaseContext
  ): Promise<Result<{ url: string; expiresAt?: string }, UseCaseError>> {
    const invoices = await this.useCaseDeps.getStudentInvoices.execute(
      { studentId: input.studentId },
      ctx
    );
    if (isErr(invoices)) {
      return err(invoices.error);
    }

    const isVisible = invoices.value.items.some((invoice) => invoice.id === input.invoiceId);
    if (!isVisible) {
      return err(new ForbiddenError("Access denied to this invoice"));
    }

    const invoicePdf = await this.useCaseDeps.documentsApp.getInvoicePdf.execute(
      { invoiceId: input.invoiceId },
      ctx
    );
    if (isErr(invoicePdf)) {
      return err(invoicePdf.error);
    }

    if (invoicePdf.value.status === "READY" && invoicePdf.value.downloadUrl) {
      return ok({
        url: invoicePdf.value.downloadUrl,
        expiresAt: invoicePdf.value.expiresAt,
      });
    }

    if (invoicePdf.value.status === "FAILED") {
      return err(
        new ConflictError(invoicePdf.value.errorMessage ?? "Invoice PDF generation failed")
      );
    }

    return err(
      new ConflictError("Invoice PDF is being generated. Please try again in a few seconds.")
    );
  }
}
