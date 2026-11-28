import type { TransactionContext } from "@corely/kernel";
import { randomUUID } from "node:crypto";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import { Injectable } from "@nestjs/common";
import type { ExtKv as PrismaExtKvRecord } from "@prisma/client";
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

  async get(input: KvGetInput, tx?: TransactionContext): Promise<KvEntry | null> {
    const record = await getPrismaClient(this.prisma, tx).extKv.findUnique({
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

  async set(input: KvSetInput, tx?: TransactionContext): Promise<KvEntry> {
    // Validate payload size
    const valueStr = JSON.stringify(input.value);
    if (Buffer.byteLength(valueStr, "utf8") > this.MAX_VALUE_SIZE) {
      throw new Error(`ExtKv value exceeds maximum size of ${this.MAX_VALUE_SIZE} bytes`);
    }

    const record = await getPrismaClient(this.prisma, tx).extKv.upsert({
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

  /** The unique key serializes claims across connections. PostgreSQL supplies the shared clock. */
  async claimFixedWindow(input: KvGetInput, limit: number, windowMs: number): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ claimed: number }[]>`
      INSERT INTO "ext"."ExtKv" AS counter
        ("id", "tenantId", "moduleId", "scope", "key", "value", "createdAt", "updatedAt")
      VALUES (
        ${randomUUID()}, ${input.tenantId}, ${input.moduleId}, ${input.scope}, ${input.key},
        jsonb_build_object('window', floor(extract(epoch from statement_timestamp()) * 1000 / ${windowMs})::bigint, 'count', 1),
        statement_timestamp(), statement_timestamp()
      )
      ON CONFLICT ("tenantId", "moduleId", "scope", "key") DO UPDATE SET
        "value" = CASE
          WHEN (counter."value"->>'window')::bigint = (excluded."value"->>'window')::bigint
          THEN jsonb_set(counter."value", '{count}', to_jsonb((counter."value"->>'count')::integer + 1))
          ELSE excluded."value"
        END,
        "updatedAt" = excluded."updatedAt"
      WHERE (counter."value"->>'window')::bigint < (excluded."value"->>'window')::bigint
         OR ((counter."value"->>'window')::bigint = (excluded."value"->>'window')::bigint
           AND (counter."value"->>'count')::integer < ${limit})
      RETURNING 1::integer AS claimed
    `;
    return result.length === 1;
  }

  async list(input: KvListInput): Promise<KvEntry[]> {
    const records = await this.prisma.extKv.findMany({
      where: {
        tenantId: input.tenantId,
        moduleId: input.moduleId,
        ...(input.scope !== undefined ? { scope: input.scope } : {}),
        ...(input.keys !== undefined ? { key: { in: input.keys } } : {}),
      },
      orderBy: {
        key: "asc",
      },
    });

    return records.map((record: PrismaExtKvRecord) => this.toDomain(record));
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
