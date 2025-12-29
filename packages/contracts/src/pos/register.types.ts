import { z } from "zod";

/**
 * Register (POS device/location) schema
 */
export const RegisterSchema = z.object({
  registerId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(100),
  defaultWarehouseId: z.string().uuid().nullable(),
  defaultBankAccountId: z.string().uuid().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Register = z.infer<typeof RegisterSchema>;

/**
 * Register status enum
 */
export const RegisterStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
