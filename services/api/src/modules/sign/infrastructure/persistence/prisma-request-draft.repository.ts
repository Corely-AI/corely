import { effectiveCeremonyStatus } from "../../domain/signing-lifecycle";
import type { SignRequestFilter } from "@corely/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import {
  SignCeremonyStatusSchema,
  SignRequestDraftSchema,
  type CreateSignRequestDraft,
  type SignRequestDraftConfiguration,
  type UpdateSignRequestDraft,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import {
  RequestDraftRepository,
  type RequestOwner,
} from "../../application/ports/request-draft.repository";
export const signRequestDraftInclude = {
  publication: { select: { canonicalSha256: true, snapshot: { select: { title: true } } } },
};
type DraftRow = {
  requestId: string;
  templateId: string;
  templateRevision: number;
  recipients: unknown;
  routing: string;
  configuration: unknown;
  replacesRequestId: string | null;
  publication: { canonicalSha256: string; snapshot: { title: string } };
};
export function projectSignRequestDraft(row: DraftRow) {
  const { requestId, templateId, templateRevision, recipients, routing } = row;
  return SignRequestDraftSchema.parse({
    requestId,
    templateId,
    templateRevision,
    recipients,
    routing,
    title: row.publication.snapshot.title,
    canonicalSha256: row.publication.canonicalSha256,
    status: "DRAFT",
    configuration: row.configuration ?? undefined,
    replacesRequestId: row.replacesRequestId ?? undefined,
  });
}
@Injectable()
export class PrismaRequestDraftRepository extends RequestDraftRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }
  counts(owner: RequestOwner) {
    return this.db.$queryRaw<
      { status: string; total: number }[]
    >`SELECT CASE WHEN c.status='SENT' AND c."expiresAt"<=now() THEN 'EXPIRED' ELSE coalesce(c.status,'DRAFT') END AS status, count(*)::int AS total
    FROM platform."SignRequestDraft" d LEFT JOIN platform."SignCeremony" c USING ("tenantId","workspaceId","requestId")
    WHERE d."tenantId"=${owner.tenantId} AND d."workspaceId"=${owner.workspaceId} AND d."actorId"=${owner.actorId} GROUP BY 1`;
  }
  async lock(owner: RequestOwner, commandId: string, tx: TransactionContext) {
    const key = JSON.stringify([
      "sign.request.create",
      owner.tenantId,
      owner.workspaceId,
      owner.actorId,
      commandId,
    ]);
    await getPrismaClient(this.db, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))::text`;
  }
  async replay(owner: RequestOwner, commandId: string, tx: TransactionContext) {
    const row = await getPrismaClient(this.db, tx).signRequestDraft.findFirst({
      where: { ...owner, commandId },
      include: signRequestDraftInclude,
    });
    return row ? { fingerprint: row.fingerprint, draft: projectSignRequestDraft(row) } : null;
  }
  async list(owner: RequestOwner, after?: string, filters: SignRequestFilter = {}) {
    const now = new Date(),
      status = filters.status;
    const lifecycle =
      status === "DRAFT"
        ? { ceremony: null }
        : status === "EXPIRED"
          ? {
              OR: [
                { ceremony: { status: "EXPIRED" } },
                { ceremony: { status: "SENT", expiresAt: { lte: now } } },
              ],
            }
          : status
            ? { ceremony: { status, ...(status === "SENT" ? { expiresAt: { gt: now } } : {}) } }
            : {};

    const rows = await this.db.signRequestDraft.findMany({
      where: {
        ...owner,
        ...lifecycle,
        ...(filters.q
          ? {
              publication: {
                snapshot: { title: { contains: filters.q, mode: "insensitive" as const } },
              },
            }
          : {}),
        requestId: after ? { gt: after } : undefined,
      },
      orderBy: { requestId: "asc" },
      take: 26,
      select: {
        requestId: true,
        templateRevision: true,
        ceremony: { select: { status: true, expiresAt: true } },
        publication: { select: { snapshot: { select: { title: true } } } },
      },
    });
    return rows.map(({ requestId, templateRevision, publication, ceremony }) => ({
      requestId,
      templateRevision,
      title: publication.snapshot.title,
      status: SignCeremonyStatusSchema.parse(effectiveCeremonyStatus(ceremony, now)),
    }));
  }
  async get(owner: RequestOwner, requestId: string, tx?: TransactionContext) {
    const row = await getPrismaClient(this.db, tx).signRequestDraft.findFirst({
      where: { ...owner, requestId },
      include: signRequestDraftInclude,
    });
    return row ? projectSignRequestDraft(row) : null;
  }
  async create(
    owner: RequestOwner,
    requestId: string,
    commandId: string,
    fingerprint: string,
    input: CreateSignRequestDraft,
    tx: TransactionContext,
    replacement?: { requestId: string; configuration: SignRequestDraftConfiguration }
  ) {
    const { templateId, templateRevision, recipients, routing } = input;
    const row = await getPrismaClient(this.db, tx).signRequestDraft.create({
      data: {
        ...owner,
        requestId,
        commandId,
        fingerprint,
        templateId,
        templateRevision,
        recipients,
        routing,
        replacesRequestId: replacement?.requestId,
        configuration: replacement?.configuration,
      },
      include: signRequestDraftInclude,
    });
    return projectSignRequestDraft(row);
  }

  async update(
    owner: RequestOwner,
    requestId: string,
    input: UpdateSignRequestDraft,
    tx: TransactionContext
  ) {
    const row = await getPrismaClient(this.db, tx).signRequestDraft.update({
      where: {
        tenantId_workspaceId_requestId: {
          tenantId: owner.tenantId,
          workspaceId: owner.workspaceId,
          requestId,
        },
        actorId: owner.actorId,
      },
      data: {
        recipients: input.recipients,
        routing: input.routing,
        configuration: {
          revision: input.expectedRevision + 1,
          layout: input.layout,
          settings: input.settings,
        },
      },
      include: signRequestDraftInclude,
    });
    return projectSignRequestDraft(row);
  }

  async replacement(owner: RequestOwner, originalId: string, tx: TransactionContext) {
    const row = await getPrismaClient(this.db, tx).signRequestDraft.findFirst({
      where: { ...owner, replacesRequestId: originalId },
      include: signRequestDraftInclude,
    });
    return row ? projectSignRequestDraft(row) : null;
  }
}
