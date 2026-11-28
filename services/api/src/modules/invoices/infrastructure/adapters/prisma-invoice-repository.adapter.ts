import { Injectable } from "@nestjs/common";
import { getPrismaClient, PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import {
  InvoiceChangedError,
  InvoiceNumberConflictError,
} from "../../application/ports/invoice-repository.port";
import {
  InvoiceReminderCandidate,
  InvoiceRepoPort,
  ListInvoicesFilters,
  ListInvoicesResult,
} from "../../application/ports/invoice-repository.port";
import { InvoiceAggregate } from "../../domain/invoice.aggregate";
import { invoiceListDeletionReasons } from "../../domain/invoice-list-visibility";
import {
  InvoiceLine,
  InvoicePayment,
  InvoiceStatus,
  PdfStatus,
  PaymentDetailsSnapshot,
} from "../../domain/invoice.types";
import { ConflictError, type LocalDate, type TransactionContext } from "@corely/kernel";

const toPrismaDate = (localDate: LocalDate | null): Date | null =>
  localDate ? new Date(`${localDate}T00:00:00.000Z`) : null;

const fromPrismaDate = (value: Date | null | undefined): LocalDate | null =>
  value ? (value.toISOString().slice(0, 10) as LocalDate) : null;

const toPrismaLine = ({ qty, ...line }: InvoiceLine) => ({
  ...line,
  qty: Math.ceil(qty),
  draftQuantity: Number.isInteger(qty) ? null : qty,
});

@Injectable()
export class PrismaInvoiceRepoAdapter implements InvoiceRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(
    workspaceId: string,
    invoice: InvoiceAggregate,
    options: { expectedRevision: number; tx?: TransactionContext }
  ): Promise<void> {
    if (workspaceId !== invoice.tenantId) {
      throw new Error("Workspace mismatch when saving invoice");
    }
    if (invoice.status === "PAID" && invoice.payments.length === 0) {
      throw new Error("Cannot persist PAID invoice without payment records");
    }

    const persist = async (client: Prisma.TransactionClient) => {
      const result = await client.invoice.updateMany({
        where: { id: invoice.id, tenantId: workspaceId, revision: options.expectedRevision },
        data: { ...this.invoiceData(invoice), revision: { increment: 1 } },
      });
      if (result.count !== 1) {
        throw new InvoiceChangedError();
      }

      if (invoice.status === "DRAFT") {
        await client.invoiceLine.deleteMany({
          where: { invoiceId: invoice.id, id: { notIn: invoice.lineItems.map(({ id }) => id) } },
        });
        for (const { id, ...line } of invoice.lineItems.map(toPrismaLine)) {
          await client.invoiceLine.upsert({
            where: { id, invoiceId: invoice.id },
            update: line,
            create: { id, invoiceId: invoice.id, ...line },
          });
        }
      }
      await this.syncPayments(client, invoice.id, invoice.payments);
    };

    try {
      if (options.tx) {
        await persist(getPrismaClient(this.prisma, options.tx));
      } else {
        await this.prisma.$transaction(persist);
      }
      invoice.revision = options.expectedRevision + 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const target = error.meta?.target;
        const driverError = error.meta?.driverAdapterError as
          | { cause?: { constraint?: { fields?: string[] } } }
          | undefined;
        const reportedFields = Array.isArray(target)
          ? target
          : driverError?.cause?.constraint?.fields;
        const fields = reportedFields?.map((field) => String(field).replace(/^"|"$/g, ""));
        if (
          target === "Invoice_tenantId_number_key" ||
          (fields?.includes("tenantId") && fields.includes("number"))
        ) {
          throw new InvoiceNumberConflictError("Invoice number is already in use.");
        }
        if (
          target === "Invoice_one_issued_correction_per_original" ||
          (fields?.includes("tenantId") && fields.includes("sourceId"))
        ) {
          throw new ConflictError("A correction has already been issued for the original invoice.");
        }
      }
      throw error;
    }
  }

  async create(workspaceId: string, invoice: InvoiceAggregate): Promise<void> {
    if (workspaceId !== invoice.tenantId || invoice.status !== "DRAFT") {
      throw new Error("Only a draft belonging to the workspace can be created");
    }
    await this.prisma.invoice.create({
      data: {
        ...this.invoiceData(invoice),
        id: invoice.id,
        tenantId: workspaceId,
        createdAt: invoice.createdAt,
        lines: { create: invoice.lineItems.map(toPrismaLine) },
      },
    });
  }

  private invoiceData(invoice: InvoiceAggregate) {
    // Snapshots originate from wire-safe DTOs and contain only JSON values.
    const snapshot = (value: unknown) =>
      value === null ? Prisma.DbNull : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
    return {
      customerPartyId: invoice.customerPartyId,
      number: invoice.number,
      status: invoice.status,
      currency: invoice.currency,
      notes: invoice.notes,
      terms: invoice.terms,
      invoiceDate: toPrismaDate(invoice.invoiceDate),
      dueDate: toPrismaDate(invoice.dueDate),
      issuedAt: invoice.issuedAt,
      sentAt: invoice.sentAt,
      billToName: invoice.billToName,
      billToEmail: invoice.billToEmail,
      billToVatId: invoice.billToVatId,
      billToAddressLine1: invoice.billToAddressLine1,
      billToAddressLine2: invoice.billToAddressLine2,
      billToCity: invoice.billToCity,
      billToPostalCode: invoice.billToPostalCode,
      billToCountry: invoice.billToCountry,
      updatedAt: invoice.updatedAt,
      hiddenFromList: invoice.hiddenFromList,
      pdfStorageKey: invoice.pdfStorageKey,
      pdfGeneratedAt: invoice.pdfGeneratedAt,
      pdfSourceVersion: invoice.pdfSourceVersion,
      pdfStatus: invoice.pdfStatus,
      pdfFailureReason: invoice.pdfFailureReason,
      sourceType: invoice.sourceType,
      sourceId: invoice.sourceId,
      paymentDetails: snapshot(invoice.paymentDetails),
      taxSnapshot: snapshot(invoice.taxSnapshot),
      issuerSnapshot: snapshot(invoice.issuerSnapshot),
      paymentSnapshot: snapshot(invoice.paymentSnapshot),
      legalEntityId: invoice.legalEntityId,
      paymentMethodId: invoice.paymentMethodId,
    };
  }

  async findById(workspaceId: string, id: string): Promise<InvoiceAggregate | null> {
    const data = await this.prisma.invoice.findFirst({
      where: { id, tenantId: workspaceId },
      include: {
        lines: true,
        payments: {
          orderBy: { paidAt: "asc" },
        },
      },
    });
    return data ? this.toAggregate(data) : null;
  }

  async findBySource(
    workspaceId: string,
    sourceType: string,
    sourceId: string
  ): Promise<InvoiceAggregate | null> {
    const data = await this.prisma.invoice.findFirst({
      where: {
        tenantId: workspaceId,
        sourceType,
        sourceId,
      },
      include: {
        lines: true,
        payments: {
          orderBy: { paidAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return data ? this.toAggregate(data) : null;
  }

  async list(
    workspaceId: string,
    filters: ListInvoicesFilters,
    pagination: { page?: number; pageSize: number; cursor?: string }
  ): Promise<ListInvoicesResult> {
    const { page = 1, pageSize, cursor } = pagination;
    const where: any = {
      tenantId: workspaceId,
      AND: [
        {
          OR: [
            { hiddenFromList: false },
            {
              hiddenFromList: null,
              OR: [
                { status: { not: "CANCELED" } },
                { notes: null },
                { notes: { notIn: invoiceListDeletionReasons } },
              ],
            },
          ],
        },
      ],
    };

    // Standard filters
    if (filters.status) {
      where.status = filters.status; // Legacy scalar status
    }
    // Handle status array if passed via standard list kit filters?
    // For now, if 'filters.structuredFilters' contains status, we could use it, but keeping legacy valid is priority.

    if (filters.customerPartyId) {
      where.customerPartyId = filters.customerPartyId;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {}; // Note: Legacy used createdAt, ideally should be issuedAt? Keeping legacy behavior.
      if (filters.fromDate) {
        where.createdAt.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.createdAt.lte = filters.toDate;
      }
    }

    // New "q" search
    if (filters.q) {
      where.OR = [
        { number: { contains: filters.q, mode: "insensitive" } },
        { billToName: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    // Sort
    let orderBy: any = { issuedAt: "desc" };
    if (filters.sort) {
      // Simple single sort support for now, e.g. "issuedAt:asc" or "totalCents:desc"
      const [field, dir] = filters.sort.split(":");
      const direction = dir === "asc" ? "asc" : "desc";

      const allowedSorts = ["issuedAt", "createdAt", "totalCents", "number", "status", "dueDate"];
      if (allowedSorts.includes(field)) {
        orderBy = { [field]: direction };
      }
    }

    // Structured filters (placeholder for robust implementation)
    if (filters.structuredFilters && Array.isArray(filters.structuredFilters)) {
      // Loop through and apply additional Prisma where clauses for known fields
      // e.g. [{ field: "status", value: ["DRAFT", "ISSUED"], operator: "in" }]
      for (const f of filters.structuredFilters) {
        if (f.field === "status" && f.operator === "in" && Array.isArray(f.value)) {
          where.status = { in: f.value };
        }
        if (f.field === "issueDate" && f.operator === "between" && Array.isArray(f.value)) {
          // Handle range
          where.issuedAt = { gte: new Date(f.value[0]), lte: new Date(f.value[1]) };
        }
      }
    }

    const [total, results] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        take: pageSize,
        skip: cursor ? 1 : (page - 1) * pageSize,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        orderBy,
        include: {
          lines: true,
          payments: {
            orderBy: { paidAt: "asc" },
          },
        },
      }),
    ]);

    const items = results.map((row) => this.toAggregate(row));

    const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
    return { items, nextCursor, total };
  }

  async listReminderCandidates(
    workspaceId: string,
    sentBefore: Date
  ): Promise<InvoiceReminderCandidate[]> {
    const rows = await this.prisma.invoice.findMany({
      where: {
        tenantId: workspaceId,
        status: "SENT",
        sentAt: { lte: sentBefore },
      },
      select: {
        id: true,
        number: true,
        billToEmail: true,
        sentAt: true,
        status: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      number: row.number ?? null,
      billToEmail: row.billToEmail ?? null,
      sentAt: row.sentAt ?? null,
      status: row.status as any,
    }));
  }

  async isInvoiceNumberTaken(workspaceId: string, number: string): Promise<boolean> {
    const count = await this.prisma.invoice.count({ where: { tenantId: workspaceId, number } });
    return count > 0;
  }

  private async syncPayments(
    client: Prisma.TransactionClient,
    invoiceId: string,
    payments: InvoicePayment[]
  ): Promise<void> {
    if (payments.length === 0) {
      await client.invoicePayment.deleteMany({ where: { invoiceId } });
      return;
    }

    const paymentIds = payments.map((payment) => payment.id);
    await client.invoicePayment.deleteMany({
      where: {
        invoiceId,
        id: {
          notIn: paymentIds,
        },
      },
    });

    for (const payment of payments) {
      await client.invoicePayment.upsert({
        where: { id: payment.id, invoiceId },
        update: {
          invoiceId,
          amountCents: payment.amountCents,
          paidAt: payment.paidAt,
          note: payment.note ?? null,
        },
        create: {
          id: payment.id,
          invoiceId,
          amountCents: payment.amountCents,
          paidAt: payment.paidAt,
          note: payment.note ?? null,
        },
      });
    }
  }

  private toAggregate(data: {
    id: string;
    tenantId: string;
    currency: string;
    status: InvoiceStatus;
    issuedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    revision: number;
    hiddenFromList: boolean | null;
    lines: Array<{
      id: string;
      description: string;
      qty: number;
      draftQuantity: number | null;
      unitPriceCents: number;
    }>;
    payments: Array<{ id: string; amountCents: number; paidAt: Date; note: string | null }>;
  }) {
    const lineItems: InvoiceLine[] = data.lines.map((line) => ({
      id: line.id,
      description: line.description,
      qty: line.draftQuantity ?? line.qty,
      unitPriceCents: line.unitPriceCents,
    }));
    const payments: InvoicePayment[] = data.payments.map((payment) => ({
      id: payment.id,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt,
      note: payment.note ?? undefined,
    }));

    return new InvoiceAggregate({
      id: data.id,
      tenantId: data.tenantId,
      customerPartyId: (data as any).customerPartyId ?? "",
      currency: data.currency,
      notes: (data as any).notes ?? null,
      terms: (data as any).terms ?? null,
      number: (data as any).number ?? null,
      status: data.status as any,
      lineItems,
      payments,
      issuedAt: data.issuedAt,
      invoiceDate: fromPrismaDate((data as any).invoiceDate ?? null),
      dueDate: fromPrismaDate((data as any).dueDate ?? null),
      sentAt: (data as any).sentAt ?? null,
      billToName: (data as any).billToName ?? null,
      billToEmail: (data as any).billToEmail ?? null,
      billToVatId: (data as any).billToVatId ?? null,
      billToAddressLine1: (data as any).billToAddressLine1 ?? null,
      billToAddressLine2: (data as any).billToAddressLine2 ?? null,
      billToCity: (data as any).billToCity ?? null,
      billToPostalCode: (data as any).billToPostalCode ?? null,
      billToCountry: (data as any).billToCountry ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      revision: data.revision,
      hiddenFromList: data.hiddenFromList,
      pdfStorageKey: (data as any).pdfStorageKey ?? null,
      pdfGeneratedAt: (data as any).pdfGeneratedAt ?? null,
      pdfSourceVersion: (data as any).pdfSourceVersion ?? null,
      pdfStatus: ((data as any).pdfStatus as PdfStatus) ?? "NONE",
      pdfFailureReason: (data as any).pdfFailureReason ?? null,
      sourceType: (data as any).sourceType ?? null,
      sourceId: (data as any).sourceId ?? null,
      paymentDetails: ((data as any).paymentDetails as PaymentDetailsSnapshot) ?? null,
      taxSnapshot: ((data as any).taxSnapshot as any) ?? null,
      issuerSnapshot: ((data as any).issuerSnapshot as any) ?? null,
      paymentSnapshot: ((data as any).paymentSnapshot as PaymentDetailsSnapshot) ?? null,
      legalEntityId: (data as any).legalEntityId ?? null,
      paymentMethodId: (data as any).paymentMethodId ?? null,
    });
  }
}
