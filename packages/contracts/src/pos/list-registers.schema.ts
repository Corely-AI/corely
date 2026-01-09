import { z } from "zod";
import { RegisterSchema } from "./register.types";

/**
 * List Registers input schema
 */
export const ListRegistersInputSchema = z.object({
  workspaceId: z.string().uuid().optional(), // Optional if coming from auth context
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type ListRegistersInput = z.infer<typeof ListRegistersInputSchema>;

/**
 * List Registers output schema
 */
export const ListRegistersOutputSchema = z.object({
  registers: z.array(RegisterSchema),
});

export type ListRegistersOutput = z.infer<typeof ListRegistersOutputSchema>;
