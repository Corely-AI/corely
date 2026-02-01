import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  ExtEntityAttrPort,
  EntityAttrGetInput,
  EntityAttrSetInput,
  EntityAttrDeleteInput,
  EntityAttrListInput,
  EntityAttr,
} from "../ports/ext-storage.port";

/**
 * Prisma adapter for ExtEntityAttr (Entity Attributes)
 *
 * Implements the ExtEntityAttrPort interface using Prisma to access the ext.entity_attr table.
 * Provides module-scoped custom attributes on core entities without schema changes.
 *
 * See: docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md
 */
@Injectable()
export class PrismaExtEntityAttrAdapter implements ExtEntityAttrPort {
  // Maximum JSONB payload size (1MB)
  private readonly MAX_VALUE_SIZE = 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async get(input: EntityAttrGetInput): Promise<EntityAttr | null> {
    const record = await this.prisma.extEntityAttr.findUnique({
      where: {
        tenantId_moduleId_entityType_entityId_attrKey: {
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          entityType: input.entityType,
          entityId: input.entityId,
          attrKey: input.attrKey,
        },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async set(input: EntityAttrSetInput): Promise<EntityAttr> {
    // Validate payload size
    const valueStr = JSON.stringify(input.attrValue);
    if (Buffer.byteLength(valueStr, "utf8") > this.MAX_VALUE_SIZE) {
      throw new Error(`ExtEntityAttr value exceeds maximum size of ${this.MAX_VALUE_SIZE} bytes`);
    }

    const record = await this.prisma.extEntityAttr.upsert({
      where: {
        tenantId_moduleId_entityType_entityId_attrKey: {
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          entityType: input.entityType,
          entityId: input.entityId,
          attrKey: input.attrKey,
        },
      },
      create: {
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        entityType: input.entityType,
        entityId: input.entityId,
        attrKey: input.attrKey,
        attrValue: input.attrValue as any,
      },
      update: {
        attrValue: input.attrValue as any,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(record);
  }

  async delete(input: EntityAttrDeleteInput): Promise<void> {
    await this.prisma.extEntityAttr.delete({
      where: {
        tenantId_moduleId_entityType_entityId_attrKey: {
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          entityType: input.entityType,
          entityId: input.entityId,
          attrKey: input.attrKey,
        },
      },
    });
  }

  async list(input: EntityAttrListInput): Promise<EntityAttr[]> {
    const records = await this.prisma.extEntityAttr.findMany({
      where: {
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        ...(input.moduleId !== undefined ? { moduleId: input.moduleId } : {}),
      },
      orderBy: {
        attrKey: "asc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): EntityAttr {
    return {
      id: record.id,
      tenantId: record.tenantId,
      moduleId: record.moduleId,
      entityType: record.entityType,
      entityId: record.entityId,
      attrKey: record.attrKey,
      attrValue: record.attrValue,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
