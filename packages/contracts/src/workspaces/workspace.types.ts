import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const WorkspaceKindSchema = z.enum(["PERSONAL", "COMPANY"]);
export type WorkspaceKind = z.infer<typeof WorkspaceKindSchema>;

export const WorkspaceMembershipRoleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "MEMBER",
  "ACCOUNTANT",
  "VIEWER",
]);
export type WorkspaceMembershipRole = z.infer<typeof WorkspaceMembershipRoleSchema>;

export const WorkspaceMembershipStatusSchema = z.enum(["ACTIVE", "INVITED", "DISABLED"]);
export type WorkspaceMembershipStatus = z.infer<typeof WorkspaceMembershipStatusSchema>;

export const WorkspaceOnboardingStatusSchema = z.enum(["NEW", "PROFILE", "TAX", "BANK", "DONE"]);
export type WorkspaceOnboardingStatus = z.infer<typeof WorkspaceOnboardingStatusSchema>;

export const WorkspaceAddressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  postalCode: z.string(),
  countryCode: z.string().length(2),
});
export type WorkspaceAddress = z.infer<typeof WorkspaceAddressSchema>;

export const WorkspaceBankAccountSchema = z.object({
  iban: z.string().min(1).optional(),
  bic: z.string().optional(),
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
});
export type WorkspaceBankAccount = z.infer<typeof WorkspaceBankAccountSchema>;

export const WorkspaceInvoiceSettingsSchema = z.object({
  prefix: z.string().optional(),
  nextNumber: z.number().int().positive().optional(),
  defaultPaymentTermsDays: z.number().int().nonnegative().optional(),
});
export type WorkspaceInvoiceSettings = z.infer<typeof WorkspaceInvoiceSettingsSchema>;

export const WorkspacePublicModulesSchema = z.record(z.boolean());
export type WorkspacePublicModules = z.infer<typeof WorkspacePublicModulesSchema>;

export const WorkspaceProfileSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  kind: WorkspaceKindSchema,
  legalName: z.string().min(1).optional(),
  countryCode: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  address: WorkspaceAddressSchema.optional(),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  website: z.union([z.string().url(), z.literal("")]).optional(),
  bankAccount: WorkspaceBankAccountSchema.optional(),
  invoiceSettings: WorkspaceInvoiceSettingsSchema.optional(),
  publicEnabled: z.boolean().optional(),
  publicModules: WorkspacePublicModulesSchema.optional(),
});
export type WorkspaceProfile = z.infer<typeof WorkspaceProfileSchema>;

export const WorkspaceDtoSchema = WorkspaceProfileSchema.extend({
  id: z.string(),
  legalEntityId: z.string(),
  onboardingStatus: WorkspaceOnboardingStatusSchema,
  onboardingCompletedAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type WorkspaceDto = z.infer<typeof WorkspaceDtoSchema>;

export const WorkspaceMembershipDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: WorkspaceMembershipRoleSchema,
  status: WorkspaceMembershipStatusSchema,
  createdAt: utcInstantSchema,
});
export type WorkspaceMembershipDto = z.infer<typeof WorkspaceMembershipDtoSchema>;

export const WorkspaceMemberSchema = z.object({
  membershipId: z.string(),
  workspaceId: z.string(),
  userId: z.string(),
  role: WorkspaceMembershipRoleSchema,
  status: WorkspaceMembershipStatusSchema,
  email: z.string().email().optional(),
  name: z.string().nullable().optional(),
  invitedAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema.optional(),
});
export type WorkspaceMemberDto = z.infer<typeof WorkspaceMemberSchema>;

export const WorkspaceInviteStatusSchema = z.enum(["PENDING", "ACCEPTED", "EXPIRED", "CANCELED"]);
export type WorkspaceInviteStatus = z.infer<typeof WorkspaceInviteStatusSchema>;

export const WorkspaceInviteDtoSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  email: z.string().email(),
  role: WorkspaceMembershipRoleSchema,
  status: WorkspaceInviteStatusSchema,
  token: z.string(),
  expiresAt: utcInstantSchema,
  acceptedAt: utcInstantSchema.nullable().optional(),
  createdByUserId: z.string().optional(),
  createdAt: utcInstantSchema,
});
export type WorkspaceInviteDto = z.infer<typeof WorkspaceInviteDtoSchema>;

export const WorkspaceOnboardingStatusResponseSchema = z.object({
  workspaceId: z.string(),
  status: WorkspaceOnboardingStatusSchema,
  missingFields: z.array(z.string()),
  nextStep: WorkspaceOnboardingStatusSchema.optional(),
});
export type WorkspaceOnboardingStatusResponse = z.infer<
  typeof WorkspaceOnboardingStatusResponseSchema
>;
