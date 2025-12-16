export type Currency = "EUR";
export type Locale = "de-DE" | "en-US";

export type ExpenseCategory = "Office" | "Meals" | "Travel" | "Software" | "Other";

export interface Receipt {
  id: string;
  merchant: string;
  issuedAtISO: string; // ISO string for easy transport
  totalCents: number;
  vatRate: number; // e.g. 0.19
  currency: Currency;
  category?: ExpenseCategory;
}

export const mockReceipts: Receipt[] = [
  {
    id: "rcpt_001",
    merchant: "REWE",
    issuedAtISO: "2025-12-01T12:34:00.000Z",
    totalCents: 1899,
    vatRate: 0.07,
    currency: "EUR",
    category: "Meals"
  },
  {
    id: "rcpt_002",
    merchant: "Deutsche Bahn",
    issuedAtISO: "2025-12-03T08:10:00.000Z",
    totalCents: 4990,
    vatRate: 0.19,
    currency: "EUR",
    category: "Travel"
  }
];

export const CONTRACTS_HELLO = "Kerniflow contracts loaded ✅";

// New schemas for architecture patterns
import { z } from 'zod';

export const ExpenseCreateInputSchema = z.object({
  tenantId: z.string(),
  amount: z.number().positive(),
  description: z.string().min(1),
});

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateInputSchema>;

export const ExpenseCreateOutputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  amount: z.number(),
  description: z.string(),
  createdAt: z.string(),
});

export type ExpenseCreateOutput = z.infer<typeof ExpenseCreateOutputSchema>;

export const OutboxEventPayloadSchema = z.object({
  eventType: z.string(),
  tenantId: z.string(),
  payload: z.record(z.any()),
});

export type OutboxEventPayload = z.infer<typeof OutboxEventPayloadSchema>;

export const EVENT_NAMES = {
  EXPENSE_CREATED: 'expense.created',
  INVOICE_ISSUED: 'invoice.issued',
} as const;

// ============================================================================
// AUTH / IDENTITY CONTRACTS
// ============================================================================

export const SignUpInputSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantName: z.string().min(1, 'Tenant name is required'),
  userName: z.string().optional(),
});

export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const SignInInputSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().optional(),
});

export type SignInInput = z.infer<typeof SignInInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

export const SwitchTenantInputSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
});

export type SwitchTenantInput = z.infer<typeof SwitchTenantInputSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type AuthTokens = z.infer<typeof AuthTokensSchema>;

export const UserDtoSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  status: z.string().default('ACTIVE'),
});

export type UserDto = z.infer<typeof UserDtoSchema>;

export const TenantDtoSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.string().default('ACTIVE'),
});

export type TenantDto = z.infer<typeof TenantDtoSchema>;

export const MembershipDtoSchema = z.object({
  membershipId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  roleId: z.string(),
});

export type MembershipDto = z.infer<typeof MembershipDtoSchema>;

export const SignUpResponseSchema = AuthTokensSchema.extend({
  userId: z.string(),
  email: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  membershipId: z.string(),
});

export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;

export const SignInResponseSchema = AuthTokensSchema.extend({
  userId: z.string(),
  email: z.string(),
  tenantId: z.string(),
  memberships: z.array(z.object({
    tenantId: z.string(),
    tenantName: z.string(),
    roleId: z.string(),
  })).optional(),
});

export type SignInResponse = z.infer<typeof SignInResponseSchema>;

export const CurrentUserResponseSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  activeTenantId: z.string(),
  memberships: z.array(z.object({
    tenantId: z.string(),
    tenantName: z.string(),
    roleId: z.string(),
  })),
});

export type CurrentUserResponse = z.infer<typeof CurrentUserResponseSchema>;
