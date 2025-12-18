import { Invoice } from "../../domain/entities/Invoice";
import { InvoiceLine } from "../../domain/entities/InvoiceLine";
import { InvoiceRepositoryPort } from "../ports/InvoiceRepositoryPort";
import { OutboxPort } from "../../../../shared/ports/outbox.port";
import { AuditPort } from "../../../../shared/ports/audit.port";
import { IdempotencyPort } from "../../../../shared/ports/idempotency.port";
import { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { ClockPort } from "../../../../shared/ports/clock.port";
import { RequestContext } from "../../../../shared/context/request-context";
import {
  CustomFieldDefinitionPort,
  CustomFieldIndexPort,
  buildCustomFieldIndexes,
  validateAndNormalizeCustomValues,
} from "@kerniflow/domain";

export interface CreateInvoiceDraftInput {
  tenantId: string;
  currency: string;
  clientId?: string;
  lines: Array<{ description: string; qty: number; unitPriceCents: number }>;
  idempotencyKey: string;
  actorUserId: string;
  custom?: Record<string, unknown>;
  context: RequestContext;
}

export class CreateInvoiceDraftUseCase {
  private readonly actionKey = "invoices.create_draft";
  constructor(
    private readonly invoiceRepo: InvoiceRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly customFieldDefinitions: CustomFieldDefinitionPort,
    private readonly customFieldIndexes: CustomFieldIndexPort
  ) {}

  async execute(input: CreateInvoiceDraftInput): Promise<Invoice> {
    const cached = await this.idempotency.get(this.actionKey, input.tenantId, input.idempotencyKey);
    if (cached) {
      const body = cached.body as any;
      return this.hydrate(body);
    }

    const lines = input.lines.map(
      (line) =>
        new InvoiceLine(this.idGenerator.next(), line.description, line.qty, line.unitPriceCents)
    );
    const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const definitions = await this.customFieldDefinitions.listActiveByEntityType(
      input.tenantId,
      "invoice"
    );
    const normalizedCustom = validateAndNormalizeCustomValues(definitions, input.custom);

    const invoice = new Invoice(
      this.idGenerator.next(),
      input.tenantId,
      "DRAFT",
      total,
      input.currency,
      input.clientId ?? null,
      lines,
      null,
      Object.keys(normalizedCustom).length ? normalizedCustom : null
    );

    await this.invoiceRepo.save(invoice);
    await this.audit.write({
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      action: "invoice.draft_created",
      targetType: "Invoice",
      targetId: invoice.id,
      context: input.context,
    });

    await this.idempotency.store(this.actionKey, input.tenantId, input.idempotencyKey, {
      body: this.serialize(invoice),
    });

    await this.outbox.enqueue({
      tenantId: input.tenantId,
      eventType: "invoice.draft_created",
      payload: { invoiceId: invoice.id, totalCents: invoice.totalCents },
    });

    const indexRows = buildCustomFieldIndexes({
      tenantId: input.tenantId,
      entityType: "invoice",
      entityId: invoice.id,
      definitions,
      values: normalizedCustom,
    });
    if (indexRows.length) {
      await this.customFieldIndexes.upsertIndexesForEntity(
        input.tenantId,
        "invoice",
        invoice.id,
        indexRows
      );
    }

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
    const lines = (raw.lines ?? []).map(
      (line: any) => new InvoiceLine(line.id, line.description, line.qty, line.unitPriceCents)
    );
    return new Invoice(
      raw.id,
      raw.tenantId,
      raw.status,
      raw.totalCents,
      raw.currency,
      raw.clientId ?? null,
      lines,
      raw.issuedAt ? new Date(raw.issuedAt) : null,
      (raw.custom ?? null) as Record<string, unknown> | null
    );
  }
}
