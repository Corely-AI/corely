import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  ExtKvPort,
  KvGetInput,
  KvSetInput,
  KvDeleteInput,
  KvListInput,
  KvEntry,
} from "../ports/ext-storage.port";

/**
 * Prisma adapter for ExtKv (Key-Value Storage)
 *
 * Implements the ExtKvPort interface using Prisma to access the ext.kv table.
 * Provides tenant-scoped and module-scoped key-value storage for small modules.
 *
 * See: docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md
 */
@Injectable()
export class PrismaExtKvAdapter implements ExtKvPort {
  // Maximum JSONB payload size (1MB)
  private readonly MAX_VALUE_SIZE = 1024 * 1024;

  constructor(private readonly prisma: PrismaService) {}

  async get(input: KvGetInput): Promise<KvEntry | null> {
    const record = await this.prisma.extKv.findUnique({
      where: {
        tenantId_moduleId_scope_key: {
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          scope: input.scope,
          key: input.key,
        },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async set(input: KvSetInput): Promise<KvEntry> {
    // Validate payload size
    const valueStr = JSON.stringify(input.value);
    if (Buffer.byteLength(valueStr, "utf8") > this.MAX_VALUE_SIZE) {
      throw new Error(`ExtKv value exceeds maximum size of ${this.MAX_VALUE_SIZE} bytes`);
    }

    const record = await this.prisma.extKv.upsert({
      where: {
        tenantId_moduleId_scope_key: {
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          scope: input.scope,
          key: input.key,
        },
      },
      create: {
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        scope: input.scope,
        key: input.key,
        value: input.value as any,
      },
      update: {
        value: input.value as any,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(record);
  }

  async delete(input: KvDeleteInput): Promise<void> {
    await this.prisma.extKv.delete({
      where: {
        tenantId_moduleId_scope_key: {
          tenantId: input.tenantId,
          moduleId: input.moduleId,
          scope: input.scope,
          key: input.key,
        },
      },
    });
  }

  async list(input: KvListInput): Promise<KvEntry[]> {
    const records = await this.prisma.extKv.findMany({
      where: {
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        ...(input.scope !== undefined ? { scope: input.scope } : {}),
      },
      orderBy: {
        key: "asc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  private toDomain(record: any): KvEntry {
    return {
      id: record.id,
      tenantId: record.tenantId,
      moduleId: record.moduleId,
      scope: record.scope,
      key: record.key,
      value: record.value,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
