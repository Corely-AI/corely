import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  VatPeriodQueryPort,
  type VatPeriodInputs,
  type VatPeriodDetails,
} from "../../domain/ports/vat-period-query.port";
import type { VatAccountingMethod } from "@corely/contracts";

@Injectable()
export class PrismaVatPeriodQueryAdapter extends VatPeriodQueryPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getInputs(
    workspaceId: string,
    start: Date,
    end: Date,
    method: VatAccountingMethod
  ): Promise<VatPeriodInputs> {
    const sales = await this.getSalesInputs(workspaceId, start, end, method);
    const purchases = await this.getPurchasesInputs(workspaceId, start, end); // Purchases usually by invoice date

    return {
      salesNetCents: sales.net,
      salesVatCents: sales.vat,
      purchaseNetCents: purchases.net,
      purchaseVatCents: purchases.vat,
    };
  }

  async getDetails(
    workspaceId: string,
    start: Date,
    end: Date,
    method: VatAccountingMethod
  ): Promise<VatPeriodDetails> {
    const sales = [];

    if (method === "SOLL") {
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId: workspaceId,
          status: { in: ["ISSUED", "SENT", "PAID"] },
          issuedAt: { gte: start, lt: end },
        },
        select: {
          id: true,
          number: true,
          issuedAt: true,
          billToName: true,
          status: true,
          currency: true,
          taxSnapshot: true,
        },
      });

      for (const inv of invoices) {
        let net = 0;
        let vat = 0;
        let gross = 0;

        if (inv.taxSnapshot) {
          const snap = inv.taxSnapshot as any;
          net = snap.subtotalAmountCents || 0;
          vat = snap.taxTotalAmountCents || 0;
          gross = snap.totalAmountCents || 0;
        }

        sales.push({
          sourceType: "INVOICE",
          sourceId: inv.id,
          displayNumber: inv.number,
          customer: inv.billToName,
          dateUsed: inv.issuedAt ?? new Date(),
          netAmountCents: net,
          taxAmountCents: vat,
          grossAmountCents: gross,
          currency: inv.currency ?? "EUR",
          status: inv.status ?? null,
        });
      }
    } else {
      // IST
      const payments = await this.prisma.invoicePayment.findMany({
        where: {
          invoice: {
            tenantId: workspaceId,
            status: { in: ["ISSUED", "SENT", "PAID"] },
          },
          paidAt: { gte: start, lt: end },
        },
        include: {
          invoice: {
            select: {
              id: true,
              number: true,
              billToName: true,
              status: true,
              currency: true,
              taxSnapshot: true,
            },
          },
        },
      });

      for (const p of payments) {
        const inv = p.invoice;
        let invTotal = 0;
        let invTax = 0;
        let invNet = 0;
        if (inv.taxSnapshot) {
          const snap = inv.taxSnapshot as any;
          invTotal = snap.totalAmountCents || 0;
          invTax = snap.taxTotalAmountCents || 0;
          invNet = snap.subtotalAmountCents || 0;
        }

        let net = 0;
        let vat = 0;
        let gross = 0;

        if (invTotal > 0) {
          const ratio = p.amountCents / invTotal;
          net = Math.round(invNet * ratio);
          vat = Math.round(invTax * ratio);
          gross = p.amountCents;
        }

        sales.push({
          sourceType: "PAYMENT",
          sourceId: p.id,
          displayNumber: inv.number,
          customer: inv.billToName,
          dateUsed: p.paidAt,
          netAmountCents: net,
          taxAmountCents: vat,
          grossAmountCents: gross,
          currency: inv.currency ?? "EUR",
          status: inv.status ?? null,
        });
      }
    }

    // Purchases
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId: workspaceId,
        status: { not: "DRAFT" },
        expenseDate: { gte: start, lt: end },
        archivedAt: null,
      },
      select: {
        id: true,
        expenseDate: true,
        merchantName: true,
        totalAmountCents: true,
        taxAmountCents: true,
        currency: true,
        status: true,
      },
    });

    const purchases = expenses.map((e) => ({
      sourceType: "EXPENSE" as const,
      sourceId: e.id,
      displayNumber: null,
      customer: e.merchantName,
      dateUsed: e.expenseDate,
      grossAmountCents: e.totalAmountCents,
      taxAmountCents: e.taxAmountCents || 0,
      netAmountCents: e.totalAmountCents - (e.taxAmountCents || 0),
      currency: e.currency ?? "EUR",
      status: e.status ?? null,
    }));

    return { sales, purchases };
  }

  private async getSalesInputs(
    workspaceId: string,
    start: Date,
    end: Date,
    method: VatAccountingMethod
  ): Promise<{ net: number; vat: number }> {
    if (method === "SOLL") {
      // Accrual basis: VAT due when invoice is issued
      // Find invoices issued within range
      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId: workspaceId,
          status: { in: ["ISSUED", "SENT", "PAID"] },
          issuedAt: {
            gte: start,
            lt: end,
          },
        },
        select: {
          taxSnapshot: true,
          // Fallback if no snapshot (but should have snapshot if issued)
          lines: {
            select: {
              qty: true,
              unitPriceCents: true,
            },
          },
        },
      });

      let net = 0;
      let vat = 0;

      for (const inv of invoices) {
        if (inv.taxSnapshot) {
          const snap = inv.taxSnapshot as any; // Typed as Json
          net += snap.subtotalAmountCents || 0;
          vat += snap.taxTotalAmountCents || 0;
        } else {
          // Fallback approximate (assuming standard rate if no snapshot? or 0?)
          // Safe to assume 0 or try to calculate?
          // If status is ISSUED, it SHOULD have a snapshot.
          // If not, maybe migrated data.
        }
      }
      return { net, vat };
    } else {
      // Cash basis (IST): VAT due when payment received
      // Find payments received within range
      const payments = await this.prisma.invoicePayment.findMany({
        where: {
          invoice: {
            tenantId: workspaceId,
            status: { in: ["ISSUED", "SENT", "PAID"] }, // Just to be safe
          },
          paidAt: {
            gte: start,
            lt: end,
          },
        },
        include: {
          invoice: {
            select: {
              id: true,
              taxSnapshot: true,
              lines: true, // needed if we want to recalc total?
              // We need total amount to calculate ratio
            },
          },
        },
      });

      let net = 0;
      let vat = 0;

      for (const p of payments) {
        const inv = p.invoice;
        let invTotal = 0;
        let invTax = 0;
        let invNet = 0;

        if (inv.taxSnapshot) {
          const snap = inv.taxSnapshot as any;
          invTotal = snap.totalAmountCents || 0;
          invTax = snap.taxTotalAmountCents || 0;
          invNet = snap.subtotalAmountCents || 0;
        }

        if (invTotal > 0) {
          const ratio = p.amountCents / invTotal;
          // Add proportional amounts
          net += Math.round(invNet * ratio);
          vat += Math.round(invTax * ratio);
        }
      }
      return { net, vat };
    }
  }

  private async getPurchasesInputs(
    workspaceId: string,
    start: Date,
    end: Date
  ): Promise<{ net: number; vat: number }> {
    // Input VAT usually deductible on invoice date (at least in many jurisdictions like DE)
    // We use expenseDate
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId: workspaceId,
        status: { not: "DRAFT" }, // Assumed submitted/paid/etc
        expenseDate: {
          gte: start,
          lt: end,
        },
        archivedAt: null,
      },
      select: {
        totalAmountCents: true,
        taxAmountCents: true,
      },
    });

    let net = 0;
    let vat = 0;

    for (const exp of expenses) {
      const total = exp.totalAmountCents || 0;
      const tax = exp.taxAmountCents || 0;
      vat += tax;
      net += total - tax;
    }

    return { net, vat };
  }
}
