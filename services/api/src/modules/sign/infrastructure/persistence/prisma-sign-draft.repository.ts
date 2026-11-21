import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import {
  SignLayoutSchema,
  SignDraftSummarySchema,
  SignPublicationSchema,
  type SignPublication,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import {
  SignDraftRepository,
  type SignScope,
  type DraftEntry,
} from "../../application/ports/sign-draft.repository";

@Injectable()
export class PrismaSignDraftRepository extends SignDraftRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }
  async publication(
    scope: SignScope,
    templateId: string,
    revision: number,
    tx?: TransactionContext
  ) {
    const row = await getPrismaClient(this.db, tx).signTemplatePublication.findUnique({
      where: { tenantId_workspaceId_templateId_revision: { ...scope, templateId, revision } },
    });
    return row ? SignPublicationSchema.parse(row) : null;
  }
  async publish(
    scope: SignScope,
    record: SignPublication,
    actorId: string,
    tx: TransactionContext
  ) {
    const { templateId, revision, originalSha256, canonicalSha256, profile } = record;
    await getPrismaClient(this.db, tx).signTemplatePublication.create({
      data: { ...scope, templateId, revision, originalSha256, canonicalSha256, profile, actorId },
    });
  }
  async list(scope: SignScope, cursor: string | null) {
    const rows = await this.db.$queryRaw<
      unknown[]
    >`SELECT DISTINCT ON ("templateId") "templateId","revision","title","archived"
      FROM "platform"."SignTemplateRevision" WHERE "tenantId"=${scope.tenantId} AND "workspaceId"=${scope.workspaceId}
      AND (${cursor}::uuid IS NULL OR "templateId" > ${cursor}::uuid)
      ORDER BY "templateId", "revision" DESC LIMIT 26`;
    return SignDraftSummarySchema.array().parse(rows);
  }
  async version(scope: SignScope, templateId: string, revision: number, tx?: TransactionContext) {
    const row = await getPrismaClient(this.db, tx).signTemplateRevision.findUnique({
      where: { tenantId_workspaceId_templateId_revision: { ...scope, templateId, revision } },
    });
    return row
      ? {
          templateId,
          revision,
          title: row.title,
          archived: row.archived,
          layout: SignLayoutSchema.parse(row.layout),
        }
      : null;
  }
  async latest(scope: SignScope, templateId: string, tx?: TransactionContext) {
    const row = await getPrismaClient(this.db, tx).signTemplateRevision.findFirst({
      where: { ...scope, templateId },
      orderBy: { revision: "desc" },
    });
    return row
      ? {
          templateId,
          revision: row.revision,
          title: row.title,
          archived: row.archived,
          layout: SignLayoutSchema.parse(row.layout),
        }
      : null;
  }
  async lock(scope: SignScope, id: string, tx: TransactionContext) {
    const key = JSON.stringify(["sign.template", scope.tenantId, scope.workspaceId, id]);
    await getPrismaClient(this.db, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))::text`;
  }
  async replay(
    scope: SignScope,
    templateId: string,
    actorId: string,
    commandId: string,
    tx: TransactionContext
  ) {
    const row = await getPrismaClient(this.db, tx).signTemplateRevision.findFirst({
      where: { ...scope, templateId, actorId, commandId },
    });
    return row ? { ...row, layout: SignLayoutSchema.parse(row.layout) } : null;
  }
  async append(scope: SignScope, record: DraftEntry, tx: TransactionContext) {
    await getPrismaClient(this.db, tx).signTemplateRevision.create({
      data: {
        ...scope,
        templateId: record.templateId,
        revision: record.revision,
        title: record.title,
        archived: record.archived,
        layout: record.layout,
        actorId: record.actorId,
        commandId: record.commandId,
        fingerprint: record.fingerprint,
      },
    });
  }
}
