import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { PaymentMethodQueryPort } from "../../application/ports/payment-method-query.port";
import { PaymentDetailsSnapshot } from "../../domain/invoice.types";

@Injectable()
export class PrismaPaymentMethodQueryAdapter implements PaymentMethodQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getPaymentMethodSnapshot(
    tenantId: string,
    paymentMethodId?: string
  ): Promise<PaymentDetailsSnapshot | null> {
    const where = paymentMethodId
      ? { id: paymentMethodId, tenantId }
      : { tenantId, isDefaultForInvoicing: true };

    const method = await this.prisma.paymentMethod.findFirst({
      where,
      include: { bankAccount: true },
    });

    if (!method) {
      return null;
    }

    const bank = method.bankAccount;

    return {
      type: method.type,
      bankName: bank?.bankName ?? undefined,
      accountHolderName: bank?.accountHolderName,
      iban: bank?.iban,
      bic: bank?.bic ?? undefined,
      label: method.label,
      instructions: method.instructions ?? undefined,
      referenceTemplate: method.referenceTemplate,
      payUrl: method.payUrl ?? undefined,
    };
  }
}
