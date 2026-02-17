import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import type {
  CrmAiSnapshotRepositoryPort,
  DealAiSnapshotKind,
  DealAiSnapshotRecord,
} from "../../application/ports/crm-ai-snapshot-repository.port";

@Injectable()
export class PrismaCrmAiSnapshotRepoAdapter implements CrmAiSnapshotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findLatestActive(
    tenantId: string,
    workspaceId: string,
    dealId: string,
    kind: DealAiSnapshotKind
  ): Promise<DealAiSnapshotRecord | null> {
    const now = new Date();
    const row = await this.prisma.dealAiSnapshot.findFirst({
      where: {
        tenantId,
        workspaceId,
        dealId,
        kind,
        ttlExpiresAt: { gt: now },
      },
      orderBy: { generatedAt: "desc" },
    });

    if (!row) {
      return null;
    }

    const payloadJson =
      typeof row.payloadJson === "object" && row.payloadJson !== null
        ? (row.payloadJson as Record<string, unknown>)
        : {};

    return {
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      dealId: row.dealId,
      kind: row.kind as DealAiSnapshotKind,
      generatedAt: row.generatedAt,
      payloadJson,
      version: row.version,
      ttlExpiresAt: row.ttlExpiresAt,
    };
  }

  async save(record: DealAiSnapshotRecord): Promise<void> {
    await this.prisma.dealAiSnapshot.create({
      data: {
        tenantId: record.tenantId,
        workspaceId: record.workspaceId,
        dealId: record.dealId,
        kind: record.kind,
        generatedAt: record.generatedAt,
        payloadJson: record.payloadJson as Prisma.InputJsonValue,
        version: record.version,
        ttlExpiresAt: record.ttlExpiresAt,
      },
    });
  }
}
