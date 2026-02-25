import { z } from "zod";
import { PackageUsageSchema } from "./package-usage.types";

export const ListPackageUsageInputSchema = z.object({
  customerPackageId: z.string().uuid(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
});

export const ListPackageUsageOutputSchema = z.object({
  items: z.array(PackageUsageSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListPackageUsageInput = z.infer<typeof ListPackageUsageInputSchema>;
export type ListPackageUsageOutput = z.infer<typeof ListPackageUsageOutputSchema>;
