import { z } from "zod";
import { FilterOperatorSchema } from "../list.contract";

export const CustomizableEntityTypes = ["party", "expense", "invoice", "bill", "client"] as const;
export const CustomizableEntityTypeSchema = z.enum(CustomizableEntityTypes);
export type CustomizableEntityType = z.infer<typeof CustomizableEntityTypeSchema>;

export const EntityRefSchema = z.object({
  entityType: z.union([CustomizableEntityTypeSchema, z.string().min(1)]),
  entityId: z.string().min(1),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

export const DimensionFilterSchema = z.object({
  typeId: z.string().min(1),
  valueIds: z.array(z.string().min(1)).min(1),
});
export type DimensionFilter = z.infer<typeof DimensionFilterSchema>;

export const CustomFieldFilterSchema = z.object({
  fieldId: z.string().min(1),
  operator: FilterOperatorSchema,
  value: z.unknown().optional(),
});
export type CustomFieldFilter = z.infer<typeof CustomFieldFilterSchema>;

export const DimensionTypeSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  appliesTo: z.array(CustomizableEntityTypeSchema),
  requiredFor: z.array(CustomizableEntityTypeSchema).default([]),
  allowMultiple: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type DimensionTypeDto = z.infer<typeof DimensionTypeSchema>;

export const CreateDimensionTypeInputSchema = DimensionTypeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  idempotencyKey: z.string().optional(),
});
export type CreateDimensionTypeInput = z.infer<typeof CreateDimensionTypeInputSchema>;

export const UpdateDimensionTypeInputSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  appliesTo: z.array(CustomizableEntityTypeSchema).optional(),
  requiredFor: z.array(CustomizableEntityTypeSchema).optional(),
  allowMultiple: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateDimensionTypeInput = z.infer<typeof UpdateDimensionTypeInputSchema>;

export const DimensionValueSchema = z.object({
  id: z.string(),
  typeId: z.string(),
  code: z.string().min(1),
  name: z.string().min(1),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type DimensionValueDto = z.infer<typeof DimensionValueSchema>;

export const CreateDimensionValueInputSchema = DimensionValueSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  idempotencyKey: z.string().optional(),
});
export type CreateDimensionValueInput = z.infer<typeof CreateDimensionValueInputSchema>;

export const UpdateDimensionValueInputSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateDimensionValueInput = z.infer<typeof UpdateDimensionValueInputSchema>;

export const EntityDimensionAssignmentSchema = z.object({
  typeId: z.string().min(1),
  valueIds: z.array(z.string().min(1)),
});
export type EntityDimensionAssignment = z.infer<typeof EntityDimensionAssignmentSchema>;

export const EntityDimensionsSchema = z.object({
  entityRef: EntityRefSchema,
  assignments: z.array(EntityDimensionAssignmentSchema),
});
export type EntityDimensionsDto = z.infer<typeof EntityDimensionsSchema>;

export const SetEntityDimensionsInputSchema = z.object({
  assignments: z.array(EntityDimensionAssignmentSchema),
});
export type SetEntityDimensionsInput = z.infer<typeof SetEntityDimensionsInputSchema>;

export const EntityCustomFieldValuesSchema = z.object({
  entityRef: EntityRefSchema,
  values: z.record(z.string(), z.unknown()),
});
export type EntityCustomFieldValuesDto = z.infer<typeof EntityCustomFieldValuesSchema>;

export const SetEntityCustomFieldValuesInputSchema = z.object({
  values: z.record(z.string(), z.unknown()),
});
export type SetEntityCustomFieldValuesInput = z.infer<typeof SetEntityCustomFieldValuesInputSchema>;
