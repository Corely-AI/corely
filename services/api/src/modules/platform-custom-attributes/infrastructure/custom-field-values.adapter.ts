import { Inject, Injectable } from "@nestjs/common";
import { PrismaService, EXT_ENTITY_ATTR_PORT, type ExtEntityAttrPort } from "@corely/data";
import {
  ValidationFailedError,
  buildCustomFieldIndexes,
  validateAndNormalizeCustomValues,
} from "@corely/domain";
import type { CustomFieldFilter, CustomEntityType, FilterOperator } from "@corely/contracts";
import type {
  CustomFieldsReadPort,
  CustomFieldsWritePort,
  IndexedCustomFieldMetadata,
} from "../application/ports/custom-attributes.ports";

const MODULE_ID = "customization";
const RESOLVE_ENTITY_IDS_LIMIT = 5000;

@Injectable()
export class CustomFieldValuesAdapter implements CustomFieldsReadPort, CustomFieldsWritePort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EXT_ENTITY_ATTR_PORT) private readonly extEntityAttr: ExtEntityAttrPort
  ) {}

  async getEntityValues(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<Record<string, unknown>> {
    const attrs = await this.extEntityAttr.list({
      tenantId,
      moduleId: MODULE_ID,
      entityType,
      entityId,
    });

    const values: Record<string, unknown> = {};
    for (const attr of attrs) {
      values[attr.attrKey] = attr.attrValue;
    }
    return values;
  }

  async setEntityValues(
    tenantId: string,
    entityType: string,
    entityId: string,
    values: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const typedEntityType = entityType as CustomEntityType;
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        entityType: typedEntityType,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const valuesByKey: Record<string, unknown> = {};
    for (const def of definitions) {
      if (Object.prototype.hasOwnProperty.call(values, def.id)) {
        valuesByKey[def.key] = values[def.id];
      } else if (Object.prototype.hasOwnProperty.call(values, def.key)) {
        valuesByKey[def.key] = values[def.key];
      }
    }

    const normalizedByKey = validateAndNormalizeCustomValues(definitions as any, valuesByKey);

    await this.prisma.$transaction(async (tx) => {
      await tx.extEntityAttr.deleteMany({
        where: {
          tenantId,
          moduleId: MODULE_ID,
          entityType,
          entityId,
        },
      });

      const attrs = definitions
        .filter((def) => Object.prototype.hasOwnProperty.call(normalizedByKey, def.key))
        .map((def) => ({
          tenantId,
          moduleId: MODULE_ID,
          entityType,
          entityId,
          attrKey: def.id,
          attrValue: (normalizedByKey as Record<string, unknown>)[def.key] as any,
        }));

      if (attrs.length) {
        await tx.extEntityAttr.createMany({ data: attrs });
      }

      const indexRows = buildCustomFieldIndexes({
        tenantId,
        entityType: typedEntityType,
        entityId,
        definitions: definitions as any,
        values: normalizedByKey,
      });

      await tx.customFieldIndex.deleteMany({ where: { tenantId, entityType, entityId } });
      if (indexRows.length) {
        await tx.customFieldIndex.createMany({
          data: indexRows.map((row) => ({
            tenantId: row.tenantId,
            entityType: row.entityType,
            entityId: row.entityId,
            fieldId: row.fieldId,
            fieldKey: row.fieldKey,
            valueText: row.valueText ?? null,
            valueNumber: row.valueNumber ?? null,
            valueDate: row.valueDate ?? null,
            valueBool: row.valueBool ?? null,
            valueJson: (row.valueJson ?? null) as any,
          })),
          skipDuplicates: true,
        });
      }
    });

    const responseValues: Record<string, unknown> = {};
    for (const def of definitions) {
      if (Object.prototype.hasOwnProperty.call(normalizedByKey, def.key)) {
        responseValues[def.id] = (normalizedByKey as Record<string, unknown>)[def.key];
      }
    }

    return responseValues;
  }

  async deleteEntityValues(tenantId: string, entityType: string, entityId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.extEntityAttr.deleteMany({
        where: {
          tenantId,
          moduleId: MODULE_ID,
          entityType,
          entityId,
        },
      }),
      this.prisma.customFieldIndex.deleteMany({
        where: {
          tenantId,
          entityType,
          entityId,
        },
      }),
    ]);
  }

  async resolveEntityIdsByCustomFieldFilters(
    tenantId: string,
    entityType: string,
    filters: CustomFieldFilter[]
  ): Promise<string[]> {
    if (filters.length === 0) {
      return [];
    }

    let intersection: Set<string> | null = null;

    for (const filter of filters) {
      const where = buildCustomFieldFilterWhere(filter.operator, filter.value);
      const rows = await this.prisma.customFieldIndex.findMany({
        where: {
          tenantId,
          entityType,
          fieldId: filter.fieldId,
          ...where,
        },
        select: { entityId: true },
        take: RESOLVE_ENTITY_IDS_LIMIT + 1,
      });

      if (rows.length > RESOLVE_ENTITY_IDS_LIMIT) {
        throw new ValidationFailedError("Custom field filter result set too large", [
          {
            message: `Result set exceeds ${RESOLVE_ENTITY_IDS_LIMIT} IDs`,
            members: ["customFieldFilters"],
          },
        ]);
      }

      const ids = new Set(rows.map((row) => row.entityId));
      if (intersection === null) {
        intersection = ids;
      } else {
        intersection = new Set(Array.from(intersection).filter((id) => ids.has(id)));
      }

      if (intersection.size === 0) {
        return [];
      }
    }

    return intersection ? Array.from(intersection) : [];
  }

  async listIndexedFields(
    tenantId: string,
    entityType: string
  ): Promise<IndexedCustomFieldMetadata[]> {
    const rows = await this.prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        entityType: entityType as CustomEntityType,
        isActive: true,
        isIndexed: true,
      },
      orderBy: [{ label: "asc" }],
      select: {
        id: true,
        key: true,
        label: true,
        type: true,
      },
    });

    return rows.map((row) => ({
      fieldId: row.id,
      key: row.key,
      label: row.label,
      type: row.type,
    }));
  }
}

function buildCustomFieldFilterWhere(operator: FilterOperator, value: unknown) {
  switch (operator) {
    case "eq": {
      if (typeof value === "number") {
        return { valueNumber: value };
      }
      if (typeof value === "boolean") {
        return { valueBool: value };
      }
      if (value == null) {
        return { valueJson: null };
      }
      return { valueText: String(value) };
    }
    case "in": {
      if (!Array.isArray(value)) {
        return { valueText: "__never__" };
      }
      const textValues = value.map((item) => String(item));
      return { valueText: { in: textValues } };
    }
    case "contains":
      return { valueText: { contains: String(value ?? ""), mode: "insensitive" as const } };
    case "startsWith":
      return { valueText: { startsWith: String(value ?? ""), mode: "insensitive" as const } };
    case "gte":
      return { valueNumber: { gte: Number(value ?? 0) } };
    case "lte":
      return { valueNumber: { lte: Number(value ?? 0) } };
    case "between": {
      if (!Array.isArray(value) || value.length !== 2) {
        return { valueNumber: { gte: 1, lte: 0 } };
      }
      return {
        valueNumber: {
          gte: Number(value[0]),
          lte: Number(value[1]),
        },
      };
    }
    case "isNull":
      return {
        valueText: null,
        valueNumber: null,
        valueDate: null,
        valueBool: null,
      };
    case "isNotNull":
      return {
        OR: [
          { valueText: { not: null } },
          { valueNumber: { not: null } },
          { valueDate: { not: null } },
          { valueBool: { not: null } },
          { valueJson: { not: null } },
        ],
      };
    default:
      return {};
  }
}
