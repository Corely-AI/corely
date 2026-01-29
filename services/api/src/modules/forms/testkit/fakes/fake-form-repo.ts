import type {
  FormListFilters,
  FormListResult,
  FormRepositoryPort,
  FormSubmissionListFilters,
  FormSubmissionListResult,
} from "../../application/ports/form-repository.port";
import type {
  FormDefinition,
  FormField,
  FormSubmission,
} from "../../domain/form-definition.entity";

export class FakeFormRepository implements FormRepositoryPort {
  forms: FormDefinition[] = [];
  fields: FormField[] = [];
  submissions: FormSubmission[] = [];

  async createForm(form: FormDefinition): Promise<FormDefinition> {
    this.forms.push({ ...form });
    return this.attachFields(form);
  }

  async updateForm(form: FormDefinition): Promise<FormDefinition> {
    const idx = this.forms.findIndex((f) => f.id === form.id);
    if (idx >= 0) {
      this.forms[idx] = { ...form };
    } else {
      this.forms.push({ ...form });
    }
    return this.attachFields(form);
  }

  async findFormById(
    tenantId: string,
    formId: string,
    opts?: { includeArchived?: boolean; includeFields?: boolean }
  ): Promise<FormDefinition | null> {
    const form = this.forms.find(
      (f) =>
        f.id === formId && f.tenantId === tenantId && (opts?.includeArchived ? true : !f.archivedAt)
    );
    if (!form) {
      return null;
    }
    return opts?.includeFields ? this.attachFields(form) : { ...form };
  }

  async findFormByPublicId(
    publicId: string,
    opts?: { includeFields?: boolean }
  ): Promise<FormDefinition | null> {
    const form = this.forms.find((f) => f.publicId === publicId && !f.archivedAt);
    if (!form) {
      return null;
    }
    return opts?.includeFields ? this.attachFields(form) : { ...form };
  }

  async findFormByName(tenantId: string, name: string): Promise<FormDefinition | null> {
    const form = this.forms.find(
      (f) => f.tenantId === tenantId && f.name === name && !f.archivedAt
    );
    return form ? { ...form } : null;
  }

  async listForms(
    tenantId: string,
    filters: FormListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<FormListResult> {
    let items = this.forms.filter(
      (f) => f.tenantId === tenantId && (filters.includeArchived ? true : !f.archivedAt)
    );

    if (filters.status) {
      items = items.filter((f) => f.status === filters.status);
    }

    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (f) => f.name.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q)
      );
    }

    const start = (pagination.page - 1) * pagination.pageSize;
    const paged = items.slice(start, start + pagination.pageSize);
    const total = items.length;
    const nextCursor = start + pagination.pageSize < total ? paged[paged.length - 1]?.id : null;

    return {
      items: paged.map((form) => ({ ...form })),
      total,
      nextCursor,
    };
  }

  async addField(field: FormField): Promise<FormField> {
    this.fields.push({ ...field });
    return { ...field };
  }

  async updateField(field: FormField): Promise<FormField> {
    const idx = this.fields.findIndex((f) => f.id === field.id);
    if (idx >= 0) {
      this.fields[idx] = { ...field };
    } else {
      this.fields.push({ ...field });
    }
    return { ...field };
  }

  async removeField(tenantId: string, formId: string, fieldId: string): Promise<void> {
    this.fields = this.fields.filter((f) => f.id !== fieldId);
  }

  async listFields(formId: string): Promise<FormField[]> {
    return this.fields.filter((f) => f.formId === formId).sort((a, b) => a.order - b.order);
  }

  async findFieldById(
    tenantId: string,
    formId: string,
    fieldId: string
  ): Promise<FormField | null> {
    const field = this.fields.find(
      (f) => f.id === fieldId && f.formId === formId && f.tenantId === tenantId
    );
    return field ? { ...field } : null;
  }

  async fieldKeyExists(formId: string, key: string): Promise<boolean> {
    return this.fields.some((f) => f.formId === formId && f.key === key);
  }

  async getNextFieldOrder(formId: string): Promise<number> {
    const max = this.fields
      .filter((f) => f.formId === formId)
      .reduce((acc, f) => Math.max(acc, f.order), -1);
    return max + 1;
  }

  async reorderFields(
    tenantId: string,
    formId: string,
    orders: { fieldId: string; order: number }[]
  ): Promise<void> {
    for (const order of orders) {
      const idx = this.fields.findIndex((f) => f.id === order.fieldId);
      if (idx >= 0) {
        this.fields[idx] = { ...this.fields[idx], order: order.order } as FormField;
      }
    }
  }

  async createSubmission(submission: FormSubmission): Promise<FormSubmission> {
    this.submissions.push({ ...submission });
    return { ...submission };
  }

  async listSubmissions(
    tenantId: string,
    formId: string,
    filters: FormSubmissionListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<FormSubmissionListResult> {
    let items = this.submissions.filter((s) => s.tenantId === tenantId && s.formId === formId);
    if (filters.source) {
      items = items.filter((s) => s.source === filters.source);
    }
    items = items.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

    const start = (pagination.page - 1) * pagination.pageSize;
    const paged = items.slice(start, start + pagination.pageSize);
    const total = items.length;
    const nextCursor = start + pagination.pageSize < total ? paged[paged.length - 1]?.id : null;

    return { items: paged.map((s) => ({ ...s })), total, nextCursor };
  }

  async getSubmissionById(
    tenantId: string,
    formId: string,
    submissionId: string
  ): Promise<FormSubmission | null> {
    const submission = this.submissions.find(
      (s) => s.id === submissionId && s.formId === formId && s.tenantId === tenantId
    );
    return submission ? { ...submission } : null;
  }

  private attachFields(form: FormDefinition): FormDefinition {
    const fields = this.fields
      .filter((f) => f.formId === form.id)
      .sort((a, b) => a.order - b.order);
    return { ...form, fields };
  }
}
