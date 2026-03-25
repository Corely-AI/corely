import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { InvoicePdfModelPort } from "../../application/ports/invoice-pdf-model.port";
import { IssuerSnapshot, PaymentDetailsSnapshot } from "../../domain/invoice.types";
import type { Prisma } from "@prisma/client";

type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { lines: true; legalEntity: true };
}>;

type PaymentMethodWithBankAccount = Prisma.PaymentMethodGetPayload<{
  include: { bankAccount: true };
}>;

function resolveReferenceTemplate(template: string, invoiceNumber: string): string {
  const normalizedInvoiceNumber = invoiceNumber.trim() || "DRAFT";

  return template.replace(/{invoiceNumber}/g, (_match, offset: number) => {
    const prefix = template.slice(0, offset);
    const hasInvPrefixBeforePlaceholder = /INV-\s*$/i.test(prefix);

    if (hasInvPrefixBeforePlaceholder && /^INV-/i.test(normalizedInvoiceNumber)) {
      return normalizedInvoiceNumber.replace(/^INV-/i, "");
    }

    return normalizedInvoiceNumber;
  });
}

function readLockedTaxSnapshot(value: unknown):
  | {
      subtotalAmountCents: number;
      taxTotalAmountCents: number;
      totalAmountCents: number;
      vatRateBps?: number;
    }
  | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const snapshot = value as Record<string, unknown>;
  const subtotalAmountCents = snapshot.subtotalAmountCents;
  const taxTotalAmountCents = snapshot.taxTotalAmountCents;
  const totalAmountCents = snapshot.totalAmountCents;

  if (
    typeof subtotalAmountCents !== "number" ||
    typeof taxTotalAmountCents !== "number" ||
    typeof totalAmountCents !== "number"
  ) {
    return undefined;
  }

  const lines = Array.isArray(snapshot.lines) ? snapshot.lines : [];
  const firstRateBps = lines
    .map((line) =>
      typeof line === "object" &&
      line &&
      typeof (line as { rateBps?: unknown }).rateBps === "number"
        ? ((line as { rateBps: number }).rateBps ?? 0)
        : null
    )
    .find((rateBps): rateBps is number => rateBps !== null);

  return {
    subtotalAmountCents,
    taxTotalAmountCents,
    totalAmountCents,
    vatRateBps: firstRateBps ?? undefined,
  };
}

@Injectable()
export class PrismaInvoicePdfModelAdapter implements InvoicePdfModelPort {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoicePdfModel(
    tenantId: string,
    invoiceId: string
  ): Promise<{
    invoiceNumber: string;
    billFromName?: string;
    billFromAddress?: string;
    billToName: string;
    billToAddress?: string;
    issueDate: string;
    serviceDate?: string;
    dueDate?: string;
    currency: string;
    items: Array<{ description: string; qty: string; unitPrice: string; lineTotal: string }>;
    totals: { subtotal: string; vatRate?: string; vatAmount?: string; total: string };
    notes?: string;
    issuerInfo?: {
      taxId?: string;
      vatId?: string;
      phone?: string;
      email?: string;
      website?: string;
    };
    paymentSnapshot?: {
      type?: string;
      bankName?: string;
      accountHolderName?: string;
      iban?: string;
      bic?: string;
      label?: string;
      instructions?: string;
      referenceText?: string;
      payUrl?: string;
    };
  } | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        OR: [{ id: tenantId }, { tenantId }],
      },
      include: { legalEntity: true },
      orderBy: { createdAt: "asc" },
    });
    const workspaceId = workspace?.id ?? tenantId;
    const platformTenantId = workspace?.tenantId ?? tenantId;

    let invoice: InvoiceWithLines | null = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId: workspaceId },
      include: { lines: true, legalEntity: true },
    });

    // Backward compatibility for callers still passing platform tenant id instead of workspace id.
    if (!invoice && workspaceId !== tenantId) {
      invoice = await this.prisma.invoice.findFirst({
        where: { id: invoiceId, tenantId },
        include: { lines: true, legalEntity: true },
      });
    }

    if (!invoice) {
      return null;
    }

    if (!invoice.number) {
      return null;
    }

    const issuerSnapshot = ((invoice as any).issuerSnapshot as IssuerSnapshot | null) ?? undefined;
    let legalEntity = invoice.legalEntity;

    if (!legalEntity) {
      legalEntity = workspace?.legalEntity ?? null;
    }

    const buildAddress = (address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      postalCode?: string | null;
      countryCode?: string | null;
      country?: string | null;
    }) => {
      if (!address) {
        return undefined;
      }
      const cityLine = [address.postalCode, address.city].filter(Boolean).join(" ");
      const parts = [
        address.line1,
        address.line2,
        cityLine,
        address.country ?? address.countryCode,
      ];
      return parts.filter(Boolean).join(", ");
    };

    const billFromAddress =
      buildAddress(issuerSnapshot?.address as any) ||
      (legalEntity?.address ? buildAddress(legalEntity.address as any) : undefined);

    // Build bill-to address
    const addressParts: string[] = [];
    if (invoice.billToAddressLine1) {
      addressParts.push(invoice.billToAddressLine1);
    }
    if (invoice.billToAddressLine2) {
      addressParts.push(invoice.billToAddressLine2);
    }
    const billToCityLine = [invoice.billToPostalCode, invoice.billToCity].filter(Boolean).join(" ");
    if (billToCityLine) {
      addressParts.push(billToCityLine);
    }
    if (invoice.billToCountry) {
      addressParts.push(invoice.billToCountry);
    }
    const billToAddress = addressParts.length > 0 ? addressParts.join(", ") : undefined;

    const formatDate = (value: Date | null | undefined) => {
      if (!value) {
        return undefined;
      }
      const iso = value.toISOString().slice(0, 10);
      return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
    };

    const issueDateValue = invoice.invoiceDate ?? invoice.issuedAt ?? new Date();
    const issueDate = formatDate(issueDateValue) ?? formatDate(new Date())!;
    const dueDate = formatDate(invoice.dueDate);
    const serviceDate = issueDate ? `${issueDate} - ${issueDate}` : undefined;

    const lockedTaxSnapshot = readLockedTaxSnapshot((invoice as any).taxSnapshot);
    let subtotalCents = invoice.lines.reduce(
      (sum, line) => sum + line.qty * line.unitPriceCents,
      0
    );
    let vatCents = lockedTaxSnapshot?.taxTotalAmountCents ?? 0;
    let totalCents = lockedTaxSnapshot?.totalAmountCents ?? subtotalCents;
    let vatRateBps = lockedTaxSnapshot?.vatRateBps ?? 0;

    if (lockedTaxSnapshot) {
      subtotalCents = lockedTaxSnapshot.subtotalAmountCents;
      totalCents = lockedTaxSnapshot.totalAmountCents;
    } else {
      const taxProfile = await this.prisma.taxProfile.findFirst({
        where: { tenantId: platformTenantId },
        orderBy: { effectiveFrom: "desc" },
      });

      if (taxProfile?.vatEnabled && taxProfile.regime !== "SMALL_BUSINESS") {
        const rate = await this.prisma.taxRate.findFirst({
          where: {
            tenantId: platformTenantId,
            effectiveFrom: { lte: issueDateValue },
            taxCode: { kind: "STANDARD", isActive: true },
          },
          orderBy: { effectiveFrom: "desc" },
        });
        vatRateBps = rate?.rateBps ?? 0;
      }
      if (
        vatRateBps === 0 &&
        legalEntity?.countryCode === "DE" &&
        taxProfile?.vatEnabled !== false
      ) {
        vatRateBps = 1900;
      }

      vatCents = Math.round((subtotalCents * vatRateBps) / 10000);
      totalCents = subtotalCents + vatCents;
    }

    // Format currency helper
    const formatCurrency = (cents: number): string => {
      const amount = cents / 100;
      const locale = legalEntity?.countryCode === "DE" ? "de-DE" : "en-US";
      const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return `${formatted} ${invoice.currency}`;
    };

    // Map line items
    const items = invoice.lines.map((line) => ({
      description: line.description,
      qty: String(line.qty),
      unitPrice: formatCurrency(line.unitPriceCents),
      lineTotal: formatCurrency(line.qty * line.unitPriceCents),
    }));

    const paymentDetailsSnapshot =
      ((invoice as any).paymentSnapshot as PaymentDetailsSnapshot | null) ??
      ((invoice as any).paymentDetails as PaymentDetailsSnapshot | null) ??
      undefined;
    let paymentSnapshot:
      | {
          type?: string;
          bankName?: string;
          accountHolderName?: string;
          iban?: string;
          bic?: string;
          label?: string;
          instructions?: string;
          referenceText?: string;
          payUrl?: string;
        }
      | undefined;

    if (paymentDetailsSnapshot) {
      const referenceTemplate = paymentDetailsSnapshot.referenceTemplate || "INV-{invoiceNumber}";
      const referenceText = resolveReferenceTemplate(referenceTemplate, invoice.number);

      paymentSnapshot = {
        ...paymentDetailsSnapshot,
        referenceText,
      };
    }

    if (!paymentSnapshot) {
      let paymentMethod: PaymentMethodWithBankAccount | null = null;

      if (invoice.paymentMethodId) {
        paymentMethod = await this.prisma.paymentMethod.findFirst({
          where: { id: invoice.paymentMethodId, isActive: true },
          include: { bankAccount: true },
        });
      }

      if (!paymentMethod) {
        const fallbackLegalEntityId = invoice.legalEntityId ?? workspace?.legalEntityId;
        if (fallbackLegalEntityId) {
          paymentMethod = await this.prisma.paymentMethod.findFirst({
            where: {
              tenantId: platformTenantId,
              legalEntityId: fallbackLegalEntityId,
              isActive: true,
            },
            include: { bankAccount: true },
            orderBy: [{ isDefaultForInvoicing: "desc" }, { updatedAt: "desc" }],
          });
        }
      }

      if (paymentMethod) {
        paymentSnapshot = this.toPaymentSnapshot(paymentMethod, invoice.number);
      }
    }

    return {
      invoiceNumber: invoice.number,
      billFromName: issuerSnapshot?.name ?? legalEntity?.legalName,
      billFromAddress,
      billToName: invoice.billToName || "Unknown",
      billToAddress,
      issueDate,
      serviceDate,
      dueDate,
      currency: invoice.currency,
      items,
      totals: {
        subtotal: formatCurrency(subtotalCents),
        vatRate: vatRateBps ? `${(vatRateBps / 100).toFixed(0)}%` : undefined,
        vatAmount: vatRateBps ? formatCurrency(vatCents) : undefined,
        total: formatCurrency(totalCents),
      },
      notes: invoice.notes || undefined,
      issuerInfo: {
        taxId: issuerSnapshot?.taxId ?? legalEntity?.taxId ?? undefined,
        vatId: issuerSnapshot?.vatId ?? legalEntity?.vatId ?? undefined,
        phone: issuerSnapshot?.contact?.phone ?? legalEntity?.phone ?? undefined,
        email: issuerSnapshot?.contact?.email ?? legalEntity?.email ?? undefined,
        website: issuerSnapshot?.contact?.website ?? legalEntity?.website ?? undefined,
      },
      paymentSnapshot,
    };
  }

  private toPaymentSnapshot(paymentMethod: PaymentMethodWithBankAccount, invoiceNumber: string) {
    const referenceTemplate = paymentMethod.referenceTemplate || "INV-{invoiceNumber}";
    const referenceText = resolveReferenceTemplate(referenceTemplate, invoiceNumber);
    const bankAccount = paymentMethod.bankAccount;

    return {
      type: paymentMethod.type,
      label: paymentMethod.label,
      instructions: paymentMethod.instructions ?? undefined,
      payUrl: paymentMethod.payUrl ?? undefined,
      referenceText,
      accountHolderName: bankAccount?.accountHolderName ?? undefined,
      iban: bankAccount?.iban ?? undefined,
      bic: bankAccount?.bic ?? undefined,
      bankName: bankAccount?.bankName ?? undefined,
    };
  }
}
