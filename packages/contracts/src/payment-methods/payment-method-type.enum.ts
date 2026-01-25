import { z } from "zod";

export const PaymentMethodTypeEnum = z.enum(["BANK_TRANSFER", "PAYPAL", "CASH", "CARD", "OTHER"]);

export type PaymentMethodType = z.infer<typeof PaymentMethodTypeEnum>;

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  BANK_TRANSFER: "Bank Transfer",
  PAYPAL: "PayPal",
  CASH: "Cash",
  CARD: "Card",
  OTHER: "Other",
};
