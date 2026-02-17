import { z } from "zod";
import {
  EntityDimensionAssignmentSchema,
  SetEntityCustomFieldValuesInputSchema,
} from "../common/customization/custom-attributes";

export const SetAccountCustomAttributesInputSchema = z.object({
  customFieldValues: SetEntityCustomFieldValuesInputSchema.shape.values.default({}),
  dimensionAssignments: z.array(EntityDimensionAssignmentSchema).default([]),
});

export type SetAccountCustomAttributesInput = z.infer<typeof SetAccountCustomAttributesInputSchema>;

export const AccountCustomAttributesSchema = z.object({
  customFieldValues: z.record(z.string(), z.unknown()),
  dimensionAssignments: z.array(EntityDimensionAssignmentSchema),
});

export type AccountCustomAttributes = z.infer<typeof AccountCustomAttributesSchema>;
