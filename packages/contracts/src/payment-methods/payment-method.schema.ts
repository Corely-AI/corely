import { z } from "zod";
import { PaymentMethodTypeEnum } from "./payment-method-type.enum";

export const PaymentMethodSnapshotSchema = z.object({
  type: PaymentMethodTypeEnum,
  label: z.string(),
  accountHolderName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  currency: z.string(),
  instructions: z.string().optional().nullable(),
  payUrl: z.string().url().optional().nullable(),
  referenceText: z.string(),
  snapshotVersion: z.number().default(1),
  snapshotedAt: z.date(),
});

export type PaymentMethodSnapshot = z.infer<typeof PaymentMethodSnapshotSchema>;

export const PaymentMethodSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  legalEntityId: z.string(),
  type: PaymentMethodTypeEnum,
  label: z.string().min(1).max(255),
  isActive: z.boolean().default(true),
  isDefaultForInvoicing: z.boolean().default(false),
  bankAccountId: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  payUrl: z.string().url().nullable().optional(),
  referenceTemplate: z.string().default("INV-{invoiceNumber}"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const CreatePaymentMethodInputSchema = z
  .object({
    type: PaymentMethodTypeEnum,
    label: z.string().min(1, "Label is required").max(255),
    bankAccountId: z.string().optional(),
    instructions: z.string().optional(),
    payUrl: z.string().url().optional(),
    referenceTemplate: z.string().max(500).optional().default("INV-{invoiceNumber}"),
    isDefaultForInvoicing: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (data.type === "BANK_TRANSFER" && !data.bankAccountId) {
        return false;
      }
      return true;
    },
    {
      message: "Bank Account ID is required for BANK_TRANSFER payment method",
      path: ["bankAccountId"],
    }
  )
  .refine(
    (data) => {
      if (data.type !== "BANK_TRANSFER" && data.bankAccountId) {
        return false;
      }
      return true;
    },
    {
      message: "Bank Account ID should only be set for BANK_TRANSFER payment method",
      path: ["bankAccountId"],
    }
  );

export type CreatePaymentMethodInput = z.infer<typeof CreatePaymentMethodInputSchema>;

export const UpdatePaymentMethodInputSchema = z
  .object({
    label: z.string().min(1).max(255).optional(),
    bankAccountId: z.string().nullable().optional(),
    instructions: z.string().nullable().optional(),
    payUrl: z.string().url().nullable().optional(),
    referenceTemplate: z.string().max(500).optional(),
  })
  .refine((data) => {
    // Only validate if type is being updated (which we don't allow, but just in case)
    // This is a partial update, so bankAccountId presence depends on type
    return true; // Skip validation for partial updates
  });

export type UpdatePaymentMethodInput = z.infer<typeof UpdatePaymentMethodInputSchema>;

export const ListPaymentMethodsOutputSchema = z.object({
  paymentMethods: z.array(PaymentMethodSchema),
});

export type ListPaymentMethodsOutput = z.infer<typeof ListPaymentMethodsOutputSchema>;

export const CreatePaymentMethodOutputSchema = z.object({
  paymentMethod: PaymentMethodSchema,
});

export type CreatePaymentMethodOutput = z.infer<typeof CreatePaymentMethodOutputSchema>;
