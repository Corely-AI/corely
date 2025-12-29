import { z } from "zod";
import { RegisterSchema } from "./register.types";

/**
 * Create Register input schema
 */
export const CreateRegisterInputSchema = z.object({
  name: z.string().min(1).max(100),
  defaultWarehouseId: z.string().uuid().optional(),
  defaultBankAccountId: z.string().uuid().optional(),
});

export type CreateRegisterInput = z.infer<typeof CreateRegisterInputSchema>;

/**
 * Create Register output schema
 */
export const CreateRegisterOutputSchema = RegisterSchema.pick({
  registerId: true,
  workspaceId: true,
  name: true,
  status: true,
  defaultWarehouseId: true,
  defaultBankAccountId: true,
});

export type CreateRegisterOutput = z.infer<typeof CreateRegisterOutputSchema>;
