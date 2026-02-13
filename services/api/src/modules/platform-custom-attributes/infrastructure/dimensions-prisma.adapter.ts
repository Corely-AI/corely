import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { NotFoundError, ValidationFailedError } from "@corely/domain";
import type {
  CreateDimensionTypeInput,
  CreateDimensionValueInput,
  DimensionFilter,
  DimensionTypeDto,
  DimensionValueDto,
  EntityDimensionAssignment,
  EntityDimensionsDto,
} from "@corely/contracts";
import type {
  DimensionsReadPort,
  DimensionsWritePort,
} from "../application/ports/custom-attributes.ports";

@Injectable()
export class DimensionsPrismaAdapter implements DimensionsReadPort, DimensionsWritePort {
  constructor(private readonly prisma: PrismaService) {}

  async listTypes(tenantId: string, appliesTo?: string): Promise<DimensionTypeDto[]> {
    const rows = await this.prisma.dimensionType.findMany({
      where: {
        tenantId,
        ...(appliesTo ? { appliesTo: { has: appliesTo } } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toTypeDto);
  }

  async listValues(tenantId: string, typeId: string): Promise<DimensionValueDto[]> {
    const rows = await this.prisma.dimensionValue.findMany({
      where: { tenantId, typeId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toValueDto);
  }

  async createType(tenantId: string, input: CreateDimensionTypeInput): Promise<DimensionTypeDto> {
    const code = input.code.trim();
    if (!code) {
      throw new ValidationFailedError("code is required", [
        { message: "code is required", members: ["code"] },
      ]);
    }

    const row = await this.prisma.dimensionType.create({
      data: {
        tenantId,
        code,
        name: input.name,
        description: input.description ?? null,
        appliesTo: input.appliesTo,
        requiredFor: input.requiredFor ?? [],
        allowMultiple: input.allowMultiple ?? false,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return toTypeDto(row);
  }

  async updateType(
    tenantId: string,
    id: string,
    patch: Partial<CreateDimensionTypeInput>
  ): Promise<DimensionTypeDto> {
    const existing = await this.prisma.dimensionType.findFirst({ where: { tenantId, id } });
    if (!existing) {
      throw new NotFoundError("Dimension type not found");
    }

    const row = await this.prisma.dimensionType.update({
      where: { id },
      data: {
        code: patch.code?.trim(),
        name: patch.name,
        description: patch.description,
        appliesTo: patch.appliesTo,
        requiredFor: patch.requiredFor,
        allowMultiple: patch.allowMultiple,
        isActive: patch.isActive,
        sortOrder: patch.sortOrder,
      },
    });

    return toTypeDto(row);
  }

  async deleteType(tenantId: string, id: string): Promise<void> {
    await this.prisma.dimensionType.updateMany({
      where: { tenantId, id },
      data: { isActive: false },
    });
  }

  async createValue(
    tenantId: string,
    typeId: string,
    input: CreateDimensionValueInput
  ): Promise<DimensionValueDto> {
    const type = await this.prisma.dimensionType.findFirst({ where: { tenantId, id: typeId } });
    if (!type) {
      throw new NotFoundError("Dimension type not found");
    }

    const row = await this.prisma.dimensionValue.create({
      data: {
        tenantId,
        typeId,
        code: input.code.trim(),
        name: input.name,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    return toValueDto(row);
  }

  async updateValue(
    tenantId: string,
    id: string,
    patch: Partial<CreateDimensionValueInput>
  ): Promise<DimensionValueDto> {
    const existing = await this.prisma.dimensionValue.findFirst({ where: { tenantId, id } });
    if (!existing) {
      throw new NotFoundError("Dimension value not found");
    }

    const row = await this.prisma.dimensionValue.update({
      where: { id },
      data: {
        code: patch.code?.trim(),
        name: patch.name,
        isActive: patch.isActive,
        sortOrder: patch.sortOrder,
      },
    });

    return toValueDto(row);
  }

  async deleteValue(tenantId: string, id: string): Promise<void> {
    await this.prisma.dimensionValue.updateMany({
      where: { tenantId, id },
      data: { isActive: false },
    });
  }

  async getEntityAssignments(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<EntityDimensionsDto> {
    const rows = await this.prisma.entityDimension.findMany({
      where: { tenantId, entityType, entityId },
      include: {
        type: true,
        value: true,
      },
      orderBy: [{ type: { sortOrder: "asc" } }, { value: { sortOrder: "asc" } }],
    });

    const grouped = new Map<string, Set<string>>();
    for (const row of rows) {
      if (!grouped.has(row.typeId)) {
        grouped.set(row.typeId, new Set<string>());
      }
      grouped.get(row.typeId)!.add(row.valueId);
    }

    return {
      entityRef: { entityType, entityId },
      assignments: Array.from(grouped.entries()).map(([typeId, valueIds]) => ({
        typeId,
        valueIds: Array.from(valueIds),
      })),
    };
  }

  async setEntityAssignments(
    tenantId: string,
    entityType: string,
    entityId: string,
    assignments: EntityDimensionAssignment[]
  ): Promise<EntityDimensionsDto> {
    const activeTypes = await this.prisma.dimensionType.findMany({
      where: {
        tenantId,
        isActive: true,
        appliesTo: { has: entityType },
      },
    });
    const typeById = new Map(activeTypes.map((type) => [type.id, type]));

    for (const assignment of assignments) {
      const type = typeById.get(assignment.typeId);
      if (!type) {
        throw new ValidationFailedError("Invalid dimension type assignment", [
          {
            message: `Type ${assignment.typeId} is not active for entity type ${entityType}`,
            members: ["assignments"],
          },
        ]);
      }

      if (!type.allowMultiple && assignment.valueIds.length > 1) {
        throw new ValidationFailedError("Dimension type does not allow multiple values", [
          {
            message: `Type ${type.code} allows only one value`,
            members: ["assignments"],
          },
        ]);
      }
    }

    const requiredTypeIds = activeTypes
      .filter((type) => type.requiredFor.includes(entityType))
      .map((type) => type.id);

    for (const requiredTypeId of requiredTypeIds) {
      const assignment = assignments.find((item) => item.typeId === requiredTypeId);
      if (!assignment || assignment.valueIds.length === 0) {
        throw new ValidationFailedError("Missing required dimension assignment", [
          {
            message: `Missing assignment for required dimension type ${requiredTypeId}`,
            members: ["assignments"],
          },
        ]);
      }
    }

    const requestedTypeIds = [...new Set(assignments.map((item) => item.typeId))];
    if (requestedTypeIds.length) {
      const activeValues = await this.prisma.dimensionValue.findMany({
        where: {
          tenantId,
          typeId: { in: requestedTypeIds },
          isActive: true,
        },
      });
      const valuesByType = new Map<string, Set<string>>();
      for (const value of activeValues) {
        if (!valuesByType.has(value.typeId)) {
          valuesByType.set(value.typeId, new Set<string>());
        }
        valuesByType.get(value.typeId)!.add(value.id);
      }

      for (const assignment of assignments) {
        const allowedValues = valuesByType.get(assignment.typeId) ?? new Set<string>();
        for (const valueId of assignment.valueIds) {
          if (!allowedValues.has(valueId)) {
            throw new ValidationFailedError("Invalid dimension value assignment", [
              {
                message: `Value ${valueId} is not valid for type ${assignment.typeId}`,
                members: ["assignments"],
              },
            ]);
          }
        }
      }
    }

    const rows = assignments.flatMap((assignment) =>
      assignment.valueIds.map((valueId) => ({
        tenantId,
        entityType,
        entityId,
        typeId: assignment.typeId,
        valueId,
      }))
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.entityDimension.deleteMany({ where: { tenantId, entityType, entityId } });
      if (rows.length) {
        await tx.entityDimension.createMany({
          data: rows,
          skipDuplicates: true,
        });
      }
    });

    return this.getEntityAssignments(tenantId, entityType, entityId);
  }

  async deleteEntityAssignments(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<void> {
    await this.prisma.entityDimension.deleteMany({ where: { tenantId, entityType, entityId } });
  }

  async resolveEntityIdsByDimensionFilters(
    tenantId: string,
    entityType: string,
    filters: DimensionFilter[]
  ): Promise<string[]> {
    if (filters.length === 0) {
      return [];
    }

    let intersection: Set<string> | null = null;

    for (const filter of filters) {
      if (filter.valueIds.length === 0) {
        continue;
      }

      const rows = await this.prisma.entityDimension.findMany({
        where: {
          tenantId,
          entityType,
          typeId: filter.typeId,
          valueId: { in: filter.valueIds },
        },
        select: { entityId: true },
      });

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
}

function toTypeDto(row: any): DimensionTypeDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? null,
    appliesTo: row.appliesTo,
    requiredFor: row.requiredFor,
    allowMultiple: row.allowMultiple,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString?.(),
    updatedAt: row.updatedAt?.toISOString?.(),
  };
}

function toValueDto(row: any): DimensionValueDto {
  return {
    id: row.id,
    typeId: row.typeId,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt?.toISOString?.(),
    updatedAt: row.updatedAt?.toISOString?.(),
  };
}
