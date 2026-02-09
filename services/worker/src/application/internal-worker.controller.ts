import { Controller, Post, Param, Body, Headers, UnauthorizedException } from "@nestjs/common";
import { InvoicePdfService } from "../modules/invoices/application/invoice-pdf.service";

@Controller("internal")
export class InternalWorkerController {
  constructor(private readonly invoicePdfService: InvoicePdfService) {}

  @Post("invoices/:invoiceId/pdf")
  async generateInvoicePdf(
    @Param("invoiceId") invoiceId: string,
    @Body() body: { tenantId: string },
    @Headers("x-worker-key") workerKey: string
  ) {
    // Simple shared secret check for internal API
    const expectedKey = process.env.INTERNAL_WORKER_KEY;
    if (expectedKey && workerKey !== expectedKey) {
      throw new UnauthorizedException("Invalid worker key");
    }

    return await this.invoicePdfService.generateAndStore({
      tenantId: body.tenantId,
      invoiceId,
    });
  }
}
