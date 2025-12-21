import { ConflictError, NotFoundError } from "../../../../shared/errors/domain-errors";
import { Invoice } from "../../domain/invoice.entity";
import { InvoiceRepoPort } from "../ports/invoice-repo.port";
import { OutboxPort } from "../../../../shared/ports/outbox.port";
import { AuditPort } from "../../../../shared/ports/audit.port";
import { IdempotencyPort } from "../../../../shared/ports/idempotency.port";
import { ClockPort } from "../../../../shared/ports/clock.port";
import { RequestContext } from "../../../../shared/context/request-context";
import { InvoiceLine } from "../../domain/invoice-line.entity";

export interface IssueInvoiceInput {
  invoiceId: string;
  tenantId: string;
  idempotencyKey: string;
  actorUserId: string;
  context: RequestContext;
}

export class IssueInvoiceUseCase {
  private readonly actionKey = "invoices.issue";

  constructor(
    private readonly invoiceRepo: InvoiceRepoPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: IssueInvoiceInput): Promise<Invoice> {
    const cached = await this.idempotency.get(this.actionKey, input.tenantId, input.idempotencyKey);
    if (cached) {
      return this.hydrate(cached.body as any);
    }

    const invoice = await this.invoiceRepo.findById(input.tenantId, input.invoiceId);
    if (!invoice || invoice.tenantId !== input.tenantId) {
      throw new NotFoundError("Invoice not found");
    }

    if (invoice.status !== "DRAFT") {
      throw new ConflictError("Only draft invoices can be issued");
    }

    invoice.issue(this.clock.now());
    await this.invoiceRepo.save(input.tenantId, invoice);

    await this.audit.write({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "invoice.issued",
      targetType: "Invoice",
      targetId: invoice.id,
      context: input.context,
    });

    await this.outbox.enqueue({
      tenantId: input.tenantId,
      eventType: "invoice.issued",
      payload: { invoiceId: invoice.id, tenantId: invoice.tenantId },
    });

    await this.idempotency.store(this.actionKey, input.tenantId, input.idempotencyKey, {
      body: this.serialize(invoice),
    });

    return invoice;
  }

  private serialize(invoice: Invoice) {
    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      status: invoice.status,
      totalCents: invoice.totalCents,
      currency: invoice.currency,
      clientId: invoice.clientId,
      issuedAt: invoice.issuedAt?.toISOString() ?? null,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
      })),
      custom: invoice.custom ?? null,
    };
  }

  private hydrate(raw: any): Invoice {
    return new Invoice(
      raw.id,
      raw.tenantId,
      raw.status,
      raw.totalCents,
      raw.currency,
      raw.clientId ?? null,
      (raw.lines ?? []).map(
        (line: any) => new InvoiceLine(line.id, line.description, line.qty, line.unitPriceCents)
      ),
      raw.issuedAt ? new Date(raw.issuedAt) : null,
      (raw.custom ?? null) as Record<string, unknown> | null
    );
  }
}
