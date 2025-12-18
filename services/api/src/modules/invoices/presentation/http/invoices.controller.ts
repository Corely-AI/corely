import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { CreateInvoiceDraftUseCase } from "../../application/use-cases/CreateInvoiceDraftUseCase";
import { IssueInvoiceUseCase } from "../../application/use-cases/IssueInvoiceUseCase";
import { CreateInvoiceDraftInputSchema, IssueInvoiceInputSchema } from "@kerniflow/contracts";
import { buildRequestContext } from "../../../../shared/context/request-context";
import { Request } from "express";

@Controller("invoices")
export class InvoicesController {
  constructor(
    private readonly createDraftUseCase: CreateInvoiceDraftUseCase,
    private readonly issueInvoiceUseCase: IssueInvoiceUseCase
  ) {}

  @Post("draft")
  async createDraft(@Body() body: unknown, @Req() req: Request) {
    const input = CreateInvoiceDraftInputSchema.parse(body);
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
    });
    const invoice = await this.createDraftUseCase.execute({
      ...input,
      idempotencyKey: (req.headers["x-idempotency-key"] as string) ?? "default",
      context: ctx,
    });
    return {
      id: invoice.id,
      status: invoice.status,
      tenantId: invoice.tenantId,
      totalCents: invoice.totalCents,
      currency: invoice.currency,
      lines: invoice.lines.map((l) => ({
        id: l.id,
        description: l.description,
        qty: l.qty,
        unitPriceCents: l.unitPriceCents,
      })),
      custom: invoice.custom ?? undefined,
    };
  }

  @Post(":id/issue")
  async issue(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = IssueInvoiceInputSchema.parse({ ...body, invoiceId: id });
    const ctx = buildRequestContext({
      requestId: req.headers["x-request-id"] as string | undefined,
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
    });
    const invoice = await this.issueInvoiceUseCase.execute({
      ...input,
      idempotencyKey: (req.headers["x-idempotency-key"] as string) ?? "default",
      context: ctx,
    });
    return {
      id: invoice.id,
      status: invoice.status,
      tenantId: invoice.tenantId,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      custom: invoice.custom ?? undefined,
    };
  }
}
