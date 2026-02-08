import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
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

@Injectable()
export class PrismaFormRepository implements FormRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createForm(form: FormDefinition, tx?: TransactionContext): Promise<FormDefinition> {
    const client = getPrismaClient(this.prisma, tx as any);
    const created = await client.formDefinition.create({
      data: {
        id: form.id,
        tenantId: form.tenantId,
        name: form.name,
        description: form.description ?? undefined,
        status: form.status,
        publicId: form.publicId ?? undefined,
        publicTokenHash: form.publicTokenHash ?? undefined,
        postSubmitAction: form.postSubmitAction,
        publishedAt: form.publishedAt ?? undefined,
        archivedAt: form.archivedAt ?? undefined,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
      },
      include: { fields: true },
    });
    return this.mapFormDefinition(created);
  }

  async updateForm(form: FormDefinition, tx?: TransactionContext): Promise<FormDefinition> {
    const client = getPrismaClient(this.prisma, tx as any);
    const updated = await client.formDefinition.update({
      where: { id: form.id },
      data: {
        name: form.name,
        description: form.description ?? undefined,
        status: form.status,
        publicId: form.publicId ?? undefined,
        publicTokenHash: form.publicTokenHash ?? undefined,
        postSubmitAction: form.postSubmitAction,
        publishedAt: form.publishedAt ?? undefined,
        archivedAt: form.archivedAt ?? undefined,
        updatedAt: form.updatedAt,
      },
      include: { fields: true },
    });
    return this.mapFormDefinition(updated);
  }

  async findFormById(
    tenantId: string,
    formId: string,
    opts?: { includeArchived?: boolean; includeFields?: boolean },
    tx?: TransactionContext
  ): Promise<FormDefinition | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const data = await client.formDefinition.findFirst({
      where: {
        id: formId,
        tenantId,
        archivedAt: opts?.includeArchived ? undefined : null,
      },
      include: opts?.includeFields ? { fields: { orderBy: { order: "asc" } } } : undefined,
    });
    return data ? this.mapFormDefinition(data) : null;
  }

  async findFormByPublicId(
    publicId: string,
    opts?: { includeFields?: boolean },
    tx?: TransactionContext
  ): Promise<FormDefinition | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const data = await client.formDefinition.findFirst({
      where: {
        publicId,
        archivedAt: null,
      },
      include: opts?.includeFields ? { fields: { orderBy: { order: "asc" } } } : undefined,
    });
    return data ? this.mapFormDefinition(data) : null;
  }

  async findFormByName(
    tenantId: string,
    name: string,
    tx?: TransactionContext
  ): Promise<FormDefinition | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const data = await client.formDefinition.findFirst({
      where: {
        tenantId,
        name,
        archivedAt: null,
      },
    });
    return data ? this.mapFormDefinition(data) : null;
  }

  async listForms(
    tenantId: string,
    filters: FormListFilters,
    pagination: { page: number; pageSize: number; cursor?: string | null },
    tx?: TransactionContext
  ): Promise<FormListResult> {
    const client = getPrismaClient(this.prisma, tx as any);
    const where: any = {
      tenantId,
      archivedAt: filters.includeArchived ? undefined : null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const take = pagination.pageSize;

    let orderBy: any[] = [{ updatedAt: "desc" }];
    if (filters.sort) {
      const [field, dir] = filters.sort.split(":");
      const direction = dir === "asc" ? "asc" : "desc";
      const map: Record<string, string> = {
        name: "name",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
        status: "status",
      };
      if (map[field]) {
        orderBy = [{ [map[field]]: direction }];
        if (field !== "updatedAt") {
          orderBy.push({ updatedAt: "desc" });
        }
      }
    }

    const [rows, total] = await Promise.all([
      client.formDefinition.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      client.formDefinition.count({ where }),
    ]);

    const nextCursor =
      rows.length === pagination.pageSize && skip + rows.length < total
        ? (rows[rows.length - 1]?.id ?? null)
        : null;

    return {
      items: rows.map((row) => this.mapFormDefinition(row)),
      total,
      nextCursor,
    };
  }

  async addField(field: FormField, tx?: TransactionContext): Promise<FormField> {
    const client = getPrismaClient(this.prisma, tx as any);
    const created = await client.formField.create({
      data: {
        id: field.id,
        tenantId: field.tenantId,
        formId: field.formId,
        key: field.key,
        label: field.label,
        type: field.type,
        required: field.required,
        helpText: field.helpText ?? undefined,
        order: field.order,
        configJson: field.configJson as any,
        createdAt: field.createdAt,
        updatedAt: field.updatedAt,
      },
    });
    return this.mapFormField(created);
  }

  async updateField(field: FormField, tx?: TransactionContext): Promise<FormField> {
    const client = getPrismaClient(this.prisma, tx as any);
    const updated = await client.formField.update({
      where: { id: field.id },
      data: {
        label: field.label,
        required: field.required,
        helpText: field.helpText ?? undefined,
        order: field.order,
        configJson: field.configJson as any,
        updatedAt: field.updatedAt,
      },
    });
    return this.mapFormField(updated);
  }

  async removeField(
    tenantId: string,
    formId: string,
    fieldId: string,
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await client.formField.delete({
      where: { id: fieldId },
    });
  }

  async listFields(formId: string, tx?: TransactionContext): Promise<FormField[]> {
    const client = getPrismaClient(this.prisma, tx as any);
    const rows = await client.formField.findMany({
      where: { formId },
      orderBy: { order: "asc" },
    });
    return rows.map((row) => this.mapFormField(row));
  }

  async findFieldById(
    tenantId: string,
    formId: string,
    fieldId: string,
    tx?: TransactionContext
  ): Promise<FormField | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.formField.findFirst({
      where: { id: fieldId, tenantId, formId },
    });
    return row ? this.mapFormField(row) : null;
  }

  async fieldKeyExists(formId: string, key: string, tx?: TransactionContext): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx as any);
    const existing = await client.formField.findFirst({
      where: { formId, key },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async getNextFieldOrder(formId: string, tx?: TransactionContext): Promise<number> {
    const client = getPrismaClient(this.prisma, tx as any);
    const result = await client.formField.aggregate({
      where: { formId },
      _max: { order: true },
    });
    const max = result._max.order ?? -1;
    return max + 1;
  }

  async reorderFields(
    tenantId: string,
    formId: string,
    orders: { fieldId: string; order: number }[],
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);
    await Promise.all(
      orders.map((item) =>
        client.formField.update({
          where: { id: item.fieldId },
          data: { order: item.order },
        })
      )
    );
  }

  async createSubmission(
    submission: FormSubmission,
    tx?: TransactionContext
  ): Promise<FormSubmission> {
    const client = getPrismaClient(this.prisma, tx as any);
    const created = await client.formSubmission.create({
      data: {
        id: submission.id,
        tenantId: submission.tenantId,
        formId: submission.formId,
        source: submission.source,
        payloadJson: submission.payloadJson as any,
        submittedAt: submission.submittedAt,
        createdByUserId: submission.createdByUserId ?? undefined,
        createdAt: submission.createdAt,
      },
    });
    return this.mapFormSubmission(created);
  }

  async listSubmissions(
    tenantId: string,
    formId: string,
    filters: FormSubmissionListFilters,
    pagination: { page: number; pageSize: number; cursor?: string | null },
    tx?: TransactionContext
  ): Promise<FormSubmissionListResult> {
    const client = getPrismaClient(this.prisma, tx as any);
    const where: any = {
      tenantId,
      formId,
    };
    if (filters.source) {
      where.source = filters.source;
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const take = pagination.pageSize;

    const [rows, total] = await Promise.all([
      client.formSubmission.findMany({
        where,
        orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      client.formSubmission.count({ where }),
    ]);

    const nextCursor =
      rows.length === pagination.pageSize && skip + rows.length < total
        ? (rows[rows.length - 1]?.id ?? null)
        : null;

    return {
      items: rows.map((row) => this.mapFormSubmission(row)),
      total,
      nextCursor,
    };
  }

  async getSubmissionById(
    tenantId: string,
    formId: string,
    submissionId: string,
    tx?: TransactionContext
  ): Promise<FormSubmission | null> {
    const client = getPrismaClient(this.prisma, tx as any);
    const row = await client.formSubmission.findFirst({
      where: { id: submissionId, tenantId, formId },
    });
    return row ? this.mapFormSubmission(row) : null;
  }

  private mapFormDefinition(data: any): FormDefinition {
    return {
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      description: data.description ?? null,
      status: data.status,
      publicId: data.publicId ?? null,
      publicTokenHash: data.publicTokenHash ?? null,
      postSubmitAction: data.postSubmitAction,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      archivedAt: data.archivedAt ? new Date(data.archivedAt) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      fields: data.fields ? data.fields.map((row: any) => this.mapFormField(row)) : undefined,
    };
  }

  private mapFormField(data: any): FormField {
    return {
      id: data.id,
      tenantId: data.tenantId,
      formId: data.formId,
      key: data.key,
      label: data.label,
      type: data.type,
      required: data.required,
      helpText: data.helpText ?? null,
      order: data.order,
      configJson: (data.configJson as Record<string, unknown>) ?? null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  private mapFormSubmission(data: any): FormSubmission {
    return {
      id: data.id,
      tenantId: data.tenantId,
      formId: data.formId,
      source: data.source,
      payloadJson: (data.payloadJson as Record<string, unknown>) ?? {},
      submittedAt: new Date(data.submittedAt),
      createdAt: new Date(data.createdAt),
      createdByUserId: data.createdByUserId ?? null,
    };
  }
}
