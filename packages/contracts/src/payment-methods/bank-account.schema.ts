import { z } from "zod";

export const BankAccountSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  legalEntityId: z.string(),
  label: z.string().min(1).max(255),
  accountHolderName: z.string().min(1).max(255),
  iban: z.string().min(15).max(34),
  bic: z.string().max(11).optional().nullable(),
  bankName: z.string().max(255).optional().nullable(),
  currency: z.string().length(3).default("EUR"),
  country: z.string().length(2).optional().nullable(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BankAccount = z.infer<typeof BankAccountSchema>;

export const CreateBankAccountInputSchema = z.object({
  label: z.string().min(1, "Label is required").max(255),
  accountHolderName: z.string().min(1, "Account holder name is required").max(255),
  iban: z.string().min(15, "IBAN must be valid").max(34),
  bic: z.string().max(11).optional(),
  bankName: z.string().max(255).optional(),
  currency: z.string().length(3).default("EUR"),
  country: z.string().length(2).optional(),
  isDefault: z.boolean().optional().default(false),
});

export type CreateBankAccountInput = z.infer<typeof CreateBankAccountInputSchema>;

export const UpdateBankAccountInputSchema = z.object({
  label: z.string().min(1).max(255).optional(),
  accountHolderName: z.string().min(1).max(255).optional(),
  iban: z.string().min(15).max(34).optional(),
  bic: z.string().max(11).optional(),
  bankName: z.string().max(255).optional(),
  currency: z.string().length(3).optional(),
  country: z.string().length(2).optional(),
});

export type UpdateBankAccountInput = z.infer<typeof UpdateBankAccountInputSchema>;

export const ListBankAccountsOutputSchema = z.object({
  bankAccounts: z.array(BankAccountSchema),
});

export type ListBankAccountsOutput = z.infer<typeof ListBankAccountsOutputSchema>;

export const CreateBankAccountOutputSchema = z.object({
  bankAccount: BankAccountSchema,
});

export type CreateBankAccountOutput = z.infer<typeof CreateBankAccountOutputSchema>;
