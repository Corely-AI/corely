import { z } from "zod";

// CRM Account Profile enums
export const AccountStatusSchema = z.enum(["ACTIVE", "INACTIVE", "PROSPECT"]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

export const CrmAccountTypeSchema = z.enum(["CUSTOMER", "VENDOR", "PARTNER", "OTHER"]);
export type CrmAccountType = z.infer<typeof CrmAccountTypeSchema>;

// ────────────────────────────────────────────
// Composed Account DTO (Party + CrmProfile)
// ────────────────────────────────────────────
export const AccountDtoSchema = z.object({
  /** CrmAccountProfile.id */
  id: z.string(),
  tenantId: z.string(),
  /** Party.id — canonical identity */
  partyId: z.string(),

  // Identity fields (from Party)
  name: z.string(),
  website: z.string().nullish(),
  industry: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),

  // CRM profile fields
  accountType: CrmAccountTypeSchema,
  status: AccountStatusSchema,
  ownerUserId: z.string().nullish(),
  notes: z.string().nullish(),

  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AccountDto = z.infer<typeof AccountDtoSchema>;

// ────────────────────────────────────────────
// Create Account Input
// Orchestrates both Party + CrmAccountProfile
// ────────────────────────────────────────────
export const CreateAccountInputSchema = z.object({
  // Party identity fields
  name: z.string().min(1, "Account name is required"),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  industry: z.string().optional(),

  // CRM profile fields
  accountType: CrmAccountTypeSchema.default("CUSTOMER"),
  status: AccountStatusSchema.default("ACTIVE"),
  ownerUserId: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateAccountInput = z.infer<typeof CreateAccountInputSchema>;

// ────────────────────────────────────────────
// Update Account Input (profile.id in URL)
// ────────────────────────────────────────────
export const UpdateAccountInputSchema = z.object({
  // Party identity fields (optional patches)
  name: z.string().min(1).optional(),
  website: z.string().url().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  industry: z.string().optional(),

  // CRM profile fields
  accountType: CrmAccountTypeSchema.optional(),
  status: AccountStatusSchema.optional(),
  ownerUserId: z.string().optional(),
  notes: z.string().optional(),
});
export type UpdateAccountInput = z.infer<typeof UpdateAccountInputSchema>;

// ────────────────────────────────────────────
// List Accounts Query
// ────────────────────────────────────────────
export const ListAccountsQuerySchema = z.object({
  q: z.string().optional(),
  status: AccountStatusSchema.optional(),
  accountType: CrmAccountTypeSchema.optional(),
  ownerUserId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListAccountsQuery = z.infer<typeof ListAccountsQuerySchema>;

// ────────────────────────────────────────────
// List Response (with page info)
// ────────────────────────────────────────────
export const ListAccountsResponseSchema = z.object({
  items: z.array(AccountDtoSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type ListAccountsResponse = z.infer<typeof ListAccountsResponseSchema>;

// ────────────────────────────────────────────
// Use-case output wrappers
// ────────────────────────────────────────────
export type CreateAccountOutput = { account: AccountDto };
export type GetAccountOutput = { account: AccountDto };
