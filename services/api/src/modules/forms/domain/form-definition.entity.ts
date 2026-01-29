export type FormStatus = "DRAFT" | "PUBLISHED";

export type FormFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "BOOLEAN"
  | "SINGLE_SELECT"
  | "MULTI_SELECT"
  | "EMAIL";

export type FormSubmissionSource = "PUBLIC" | "INTERNAL";

export type FormFieldConfig = Record<string, unknown> | null;

export interface FormField {
  id: string;
  tenantId: string;
  formId: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  helpText: string | null;
  order: number;
  configJson: FormFieldConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: FormStatus;
  publicId: string | null;
  publicTokenHash: string | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  fields?: FormField[];
}

export interface FormSubmission {
  id: string;
  tenantId: string;
  formId: string;
  source: FormSubmissionSource;
  payloadJson: Record<string, unknown>;
  submittedAt: Date;
  createdAt: Date;
  createdByUserId: string | null;
}
