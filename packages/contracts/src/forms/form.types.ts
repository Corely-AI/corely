import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const FormStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export type FormStatus = z.infer<typeof FormStatusSchema>;

export const FormFieldTypeSchema = z.enum([
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SINGLE_SELECT",
  "MULTI_SELECT",
  "EMAIL",
]);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

export const FormSubmissionSourceSchema = z.enum(["PUBLIC", "INTERNAL"]);
export type FormSubmissionSource = z.infer<typeof FormSubmissionSourceSchema>;

export const FormFieldDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  formId: z.string(),
  key: z.string(),
  label: z.string(),
  type: FormFieldTypeSchema,
  required: z.boolean(),
  helpText: z.string().optional().nullable(),
  order: z.number().int(),
  configJson: z.record(z.any()).optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type FormFieldDto = z.infer<typeof FormFieldDtoSchema>;

export const FormDefinitionDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  status: FormStatusSchema,
  publicId: z.string().optional().nullable(),
  publishedAt: utcInstantSchema.optional().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  archivedAt: utcInstantSchema.optional().nullable(),
  fields: z.array(FormFieldDtoSchema).optional(),
});
export type FormDefinitionDto = z.infer<typeof FormDefinitionDtoSchema>;

export const FormSubmissionDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  formId: z.string(),
  source: FormSubmissionSourceSchema,
  payloadJson: z.record(z.any()),
  submittedAt: utcInstantSchema,
  createdAt: utcInstantSchema,
  createdByUserId: z.string().optional().nullable(),
});
export type FormSubmissionDto = z.infer<typeof FormSubmissionDtoSchema>;

export const PublicFormFieldDtoSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: FormFieldTypeSchema,
  required: z.boolean(),
  helpText: z.string().optional().nullable(),
  order: z.number().int(),
  configJson: z.record(z.any()).optional().nullable(),
});
export type PublicFormFieldDto = z.infer<typeof PublicFormFieldDtoSchema>;

export const PublicFormDtoSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  fields: z.array(PublicFormFieldDtoSchema),
});
export type PublicFormDto = z.infer<typeof PublicFormDtoSchema>;

export type Paginated<T> = {
  items: T[];
  pageInfo: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
  };
};
