import { effectiveCeremonyStatus } from "../../domain/signing-lifecycle";
import type { SignRequestFilter } from "@corely/contracts";
import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import {
  SignCeremonyStatusSchema,
  SignRequestDraftSchema,
  type CreateSignRequestDraft,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import {
  RequestDraftRepository,
  type RequestOwner,
} from "../../application/ports/request-draft.repository";
const include = {
  publication: { select: { canonicalSha256: true, snapshot: { select: { title: true } } } },
};
type DraftRow = {
  requestId: string;
  templateId: string;
  templateRevision: number;
  recipients: unknown;
  routing: string;
  publication: { canonicalSha256: string; snapshot: { title: string } };
};
function project(row: DraftRow) {
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
      include,
    });
    return row ? { fingerprint: row.fingerprint, draft: project(row) } : null;
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
      include,
    });
    return row ? project(row) : null;
  }
  async create(
    owner: RequestOwner,
    requestId: string,
    commandId: string,
    fingerprint: string,
    input: CreateSignRequestDraft,
    tx: TransactionContext
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
      },
      include,
    });
    return project(row);
  }
}
