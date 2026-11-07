import { z } from "zod";

export const StaffIdentityLinkConflictCode = "People:IdentityLinkConflict";

const id = z.string().trim().min(1).max(160);
const label = z.string().trim().min(1).max(160);
export const StaffProfileFieldsSchema = z
  .object({
    displayName: label,
    jobTitle: label.nullable().default(null),
    team: label.nullable().default(null),
    location: label.nullable().default(null),
    managerStaffId: id.nullable().default(null),
    accountId: id.nullable().default(null),
    partyId: id.nullable().default(null),
    resourceId: id.nullable().default(null),
  })
  .strict();
export const StaffProfileSchema = StaffProfileFieldsSchema.extend({
  id,
  workspaceId: id,
  version: z.number().int().positive(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();
// Neutral results intentionally omit account/Party links and all private fields.
export const StaffDirectoryEntrySchema = StaffProfileSchema.omit({
  accountId: true,
  partyId: true,
});
export const StaffPrivateFieldsSchema = z
  .object({
    personalEmail: z.string().trim().email().max(254).nullable().default(null),
    personalPhone: z.string().trim().min(1).max(80).nullable().default(null),
    notes: z.string().trim().max(4000).nullable().default(null),
  })
  .strict();
export const StaffPrivateSchema = StaffPrivateFieldsSchema.extend({
  version: z.number().int().nonnegative(),
}).strict();
export const CreateStaffSchema = StaffProfileFieldsSchema;
export const UpdateStaffSchema = StaffProfileFieldsSchema.extend({
  version: z.number().int().positive(),
});
export const ArchiveStaffSchema = z.object({ version: z.number().int().positive() }).strict();
export const UpdateStaffPrivateSchema = StaffPrivateFieldsSchema.extend({
  version: z.number().int().nonnegative(),
}).strict();
export const ListStaffSchema = z
  .object({
    q: z.string().trim().max(160).default(""),
    archived: z.enum(["active", "archived", "all"]).default("active"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export type StaffProfile = z.infer<typeof StaffProfileSchema>;
export type StaffDirectoryEntry = z.infer<typeof StaffDirectoryEntrySchema>;
export type StaffPrivate = z.infer<typeof StaffPrivateSchema>;
export type CreateStaff = z.infer<typeof CreateStaffSchema>;
export type UpdateStaff = z.infer<typeof UpdateStaffSchema>;
export type ListStaff = z.infer<typeof ListStaffSchema>;
export type UpdateStaffPrivate = z.infer<typeof UpdateStaffPrivateSchema>;
export type StaffList = {
  items: StaffDirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
};
// Owner APIs return existence only; no linked private master data is retrieved.
export interface StaffLinkScope {
  tenantId: string;
  workspaceId: string;
}
export interface StaffLinkLookup {
  exists(scope: StaffLinkScope, id: string): Promise<boolean>;
}
