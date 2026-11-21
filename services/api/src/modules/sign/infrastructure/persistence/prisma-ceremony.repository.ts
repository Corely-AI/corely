import { Injectable } from "@nestjs/common";
import { getPrismaClient, PrismaService } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { SignRequestDraftSchema } from "@corely/contracts";
import {
  CeremonyRepository,
  type CeremonyPatch,
  type SignerPatch,
} from "../../application/ports/ceremony.repository";
import type { Ceremony, RequestRef } from "../../domain/ceremony";

@Injectable()
export class PrismaCeremonyRepository extends CeremonyRepository {
  constructor(private readonly db: PrismaService) {
    super();
  }
  async clearExpiredSessions(now: Date) {
    const expired = await this.db.signCeremonyRecipient.findMany({
      where: { sessionUntil: { lte: now } },
      orderBy: { sessionUntil: "asc" },
      take: 200,
      select: { id: true },
    });
    if (expired.length) {
      await this.db.signCeremonyRecipient.updateMany({
        where: { id: { in: expired.map((row) => row.id) }, sessionUntil: { lte: now } },
        data: { sessionUntil: null, sessionDigest: null },
      });
    }
  }
  expired(now: Date) {
    return this.db.signCeremony.findMany({
      where: { status: "SENT", expiresAt: { lte: now } },
      orderBy: { expiresAt: "asc" },
      take: 100,
      select: { tenantId: true, workspaceId: true, requestId: true },
    });
  }
  async claimReminder(ref: RequestRef, commandId: string, roleId: string, tx: TransactionContext) {
    const db = getPrismaClient(this.db, tx);
    const old = await db.signReminder.findUnique({
      where: { tenantId_workspaceId_requestId_commandId: { ...ref, commandId } },
    });
    if (old) {
      return old.roleId === roleId ? ("same" as const) : ("conflict" as const);
    }
    const recent = await db.signReminder.findFirst({
      where: { ...ref, roleId, createdAt: { gt: new Date(Date.now() - 15 * 60_000) } },
      select: { commandId: true },
    });
    if (recent) {
      return "limited" as const;
    }
    await db.signReminder.create({ data: { ...ref, commandId, roleId } });
    return "new" as const;
  }
  async lock(ref: RequestRef, tx: TransactionContext) {
    const key = JSON.stringify(["sign.ceremony", ref.tenantId, ref.workspaceId, ref.requestId]);
    await getPrismaClient(this.db, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))::text`;
  }
  async draft(ref: RequestRef, tx: TransactionContext) {
    const row = await getPrismaClient(this.db, tx).signRequestDraft.findUnique({
      where: { tenantId_workspaceId_requestId: ref },
      include: { publication: { include: { snapshot: { select: { title: true } } } } },
    });
    if (!row) {
      return null;
    }
    return {
      ...SignRequestDraftSchema.parse({
        templateId: row.templateId,
        templateRevision: row.templateRevision,
        recipients: row.recipients,
        routing: row.routing,
        requestId: row.requestId,
        title: row.publication.snapshot.title,
        canonicalSha256: row.publication.canonicalSha256,
        status: "DRAFT",
      }),
      actorId: row.actorId,
    };
  }
  ceremony(ref: RequestRef, tx: TransactionContext) {
    return getPrismaClient(this.db, tx).signCeremony.findUnique({
      where: { tenantId_workspaceId_requestId: ref },
    });
  }
  signers(ref: RequestRef, tx: TransactionContext) {
    return getPrismaClient(this.db, tx).signCeremonyRecipient.findMany({
      where: ref,
      orderBy: { position: "asc" },
    });
  }
  byDigest(kind: "sessionDigest" | "tokenDigest", digest: string, tx: TransactionContext) {
    return getPrismaClient(this.db, tx).signCeremonyRecipient.findFirst({
      where: { [kind]: digest },
    });
  }
  async create(
    value: Ceremony,
    roles: { id: string; roleId: string; position: number }[],
    tx: TransactionContext
  ) {
    const db = getPrismaClient(this.db, tx);
    await db.signCeremony.create({ data: value });
    await db.signCeremonyRecipient.createMany({
      data: roles.map((r) => ({
        ...r,
        tenantId: value.tenantId,
        workspaceId: value.workspaceId,
        requestId: value.requestId,
        status: "WAITING",
      })),
    });
  }
  async change(ref: RequestRef, patch: CeremonyPatch, tx: TransactionContext) {
    await getPrismaClient(this.db, tx).signCeremony.update({
      where: { tenantId_workspaceId_requestId: ref },
      data: { ...patch, revision: { increment: 1 } },
    });
  }
  async updateSigner(ref: RequestRef, id: string, patch: SignerPatch, tx: TransactionContext) {
    await getPrismaClient(this.db, tx).signCeremonyRecipient.update({
      where: { id, ...ref },
      data: patch,
    });
  }
}
