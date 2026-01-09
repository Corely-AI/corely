import { z } from "zod";

export const CustomEntityTypes = ["expense", "invoice", "client"] as const;
export type CustomEntityType = (typeof CustomEntityTypes)[number];

export const CustomFieldTypes = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
  "MONEY",
] as const;
export type CustomFieldType = (typeof CustomFieldTypes)[number];

const BaseCustomFieldDefinitionSchema = z.object({
  tenantId: z.string(),
  entityType: z.enum(CustomEntityTypes),
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(CustomFieldTypes),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  options: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
  validation: z.record(z.any()).optional(),
  isIndexed: z.boolean().default(false),
});

export const CustomFieldDefinitionSchema = BaseCustomFieldDefinitionSchema.extend({
  id: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomFieldDefinition = z.infer<typeof CustomFieldDefinitionSchema>;

export const CreateCustomFieldDefinitionSchema = BaseCustomFieldDefinitionSchema.extend({
  isActive: z.boolean().optional(),
});
export type CreateCustomFieldDefinition = z.infer<typeof CreateCustomFieldDefinitionSchema>;

export const UpdateCustomFieldDefinitionSchema = z
  .object({
    label: z.string().min(1).optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    defaultValue: z.unknown().optional(),
    options: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
    validation: z.record(z.any()).optional(),
    isIndexed: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided to update a custom field definition",
  });
export type UpdateCustomFieldDefinition = z.infer<typeof UpdateCustomFieldDefinitionSchema>;

export const LayoutSectionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fieldKeys: z.array(z.string()),
});

export const EntityLayoutSchema = z.object({
  tenantId: z.string().optional(),
  entityType: z.enum(CustomEntityTypes),
  version: z.number().int().positive().default(1),
  layout: z.object({
    sections: z.array(LayoutSectionSchema),
  }),
  updatedAt: z.string().optional(),
});
export type EntityLayout = z.infer<typeof EntityLayoutSchema>;

export const CustomValuesSchema = z.record(z.string(), z.unknown());
export type CustomValues = z.infer<typeof CustomValuesSchema>;
