import type { TransactionContext } from "@corely/kernel";
import type {
  FormDefinition,
  FormField,
  FormSubmission,
  FormStatus,
  FormSubmissionSource,
} from "../../domain/form-definition.entity";

export interface FormListFilters {
  q?: string;
  status?: FormStatus;
  includeArchived?: boolean;
  sort?: string;
}

export interface FormListResult {
  items: FormDefinition[];
  total: number;
  nextCursor?: string | null;
}

export interface FormSubmissionListFilters {
  source?: FormSubmissionSource;
}

export interface FormSubmissionListResult {
  items: FormSubmission[];
  total: number;
  nextCursor?: string | null;
}

export interface FormRepositoryPort {
  createForm(form: FormDefinition, tx?: TransactionContext): Promise<FormDefinition>;
  updateForm(form: FormDefinition, tx?: TransactionContext): Promise<FormDefinition>;
  findFormById(
    tenantId: string,
    formId: string,
    opts?: { includeArchived?: boolean; includeFields?: boolean },
    tx?: TransactionContext
  ): Promise<FormDefinition | null>;
  findFormByPublicId(
    publicId: string,
    opts?: { includeFields?: boolean },
    tx?: TransactionContext
  ): Promise<FormDefinition | null>;
  findFormByName(
    tenantId: string,
    name: string,
    tx?: TransactionContext
  ): Promise<FormDefinition | null>;
  listForms(
    tenantId: string,
    filters: FormListFilters,
    pagination: { page: number; pageSize: number; cursor?: string | null },
    tx?: TransactionContext
  ): Promise<FormListResult>;

  addField(field: FormField, tx?: TransactionContext): Promise<FormField>;
  updateField(field: FormField, tx?: TransactionContext): Promise<FormField>;
  removeField(
    tenantId: string,
    formId: string,
    fieldId: string,
    tx?: TransactionContext
  ): Promise<void>;
  listFields(formId: string, tx?: TransactionContext): Promise<FormField[]>;
  findFieldById(
    tenantId: string,
    formId: string,
    fieldId: string,
    tx?: TransactionContext
  ): Promise<FormField | null>;
  fieldKeyExists(formId: string, key: string, tx?: TransactionContext): Promise<boolean>;
  getNextFieldOrder(formId: string, tx?: TransactionContext): Promise<number>;
  reorderFields(
    tenantId: string,
    formId: string,
    orders: { fieldId: string; order: number }[],
    tx?: TransactionContext
  ): Promise<void>;

  createSubmission(submission: FormSubmission, tx?: TransactionContext): Promise<FormSubmission>;
  listSubmissions(
    tenantId: string,
    formId: string,
    filters: FormSubmissionListFilters,
    pagination: { page: number; pageSize: number; cursor?: string | null },
    tx?: TransactionContext
  ): Promise<FormSubmissionListResult>;
  getSubmissionById(
    tenantId: string,
    formId: string,
    submissionId: string,
    tx?: TransactionContext
  ): Promise<FormSubmission | null>;
}

export const FORM_REPOSITORY = "forms/form-repository";
