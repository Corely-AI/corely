import { createHash } from "node:crypto";
import { Inject, Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import { OUTBOX_PORT, type OutboxPort, type TransactionContext } from "@corely/kernel";
import { SsoAppKeySchema } from "@corely/contracts";
import type {
  SsoStorePort,
  SsoTransaction,
  SsoEmailChallenge,
} from "../../application/ports/sso-store.port";
import { ssoEqual } from "../security/sso-crypto";
import { AUDIT_PORT_TOKEN, type AuditPort } from "../../application/ports/audit.port";

@Injectable()
export class PrismaSsoStore implements SsoStorePort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}
  async useSession(input: Parameters<SsoStorePort["useSession"]>[0]) {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.ssoAppSession.findUnique({
        where: { handleHash: input.handleHash },
      });
      if (!candidate) {
        throw new UnauthorizedException("Session expired; sign in again");
      }
      // Family first: serialize with handoff/revocation, then compare the handle under lock.
      await tx.$queryRaw`SELECT id FROM identity."SsoCentralSession" WHERE id = ${candidate.familyId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM identity."SsoAppSession" WHERE id = ${candidate.id} FOR UPDATE`;
      const session = await tx.ssoAppSession.findUnique({ where: { id: candidate.id } });
      const family = await tx.ssoCentralSession.findUnique({ where: { id: candidate.familyId } });
      if (
        !session ||
        !family ||
        session.handleHash !== input.handleHash ||
        session.environment !== input.environment ||
        session.appKey !== input.appKey ||
        family.environment !== input.environment ||
        family.userId !== session.userId ||
        session.revokedAt ||
        family.revokedAt ||
        session.expiresAt <= input.now ||
        session.idleExpiresAt <= input.now ||
        family.expiresAt <= input.now ||
        family.idleExpiresAt <= input.now
      ) {
        throw new UnauthorizedException("Session expired; sign in again");
      }
      await this.requireAccess(tx, session.userId, family.credentialHash);
      const idleExpiresAt = input.idleExpiresAt
        ? new Date(
            Math.min(
              input.idleExpiresAt.getTime(),
              session.expiresAt.getTime(),
              family.expiresAt.getTime()
            )
          )
        : session.idleExpiresAt;
      if (input.idleExpiresAt) {
        await tx.ssoCentralSession.update({ where: { id: family.id }, data: { idleExpiresAt } });
      }
      const updated =
        input.idleExpiresAt || input.replacementHash
          ? await tx.ssoAppSession.update({
              where: { id: session.id },
              data: {
                idleExpiresAt,
                ...(input.replacementHash ? { handleHash: input.replacementHash } : {}),
              },
            })
          : session;
      if (input.replacementHash) {
        await this.record(tx, "identity.sso.app_session_rotated", session.userId, session.id);
      }
      return { ...updated, appKey: SsoAppKeySchema.parse(updated.appKey) };
    });
  }
  async revokeFamily(input: Parameters<SsoStorePort["revokeFamily"]>[0]) {
    await this.prisma.$transaction(async (tx) => {
      const candidate = await tx.ssoAppSession.findUnique({
        where: { handleHash: input.handleHash },
      });
      if (!candidate) {
        throw new UnauthorizedException("Session changed; verify your session before signing out");
      }
      // Same family-first ordering as rotation/redemption. A concurrent handoff either
      // precedes revocation and is revoked here, or observes the revoked family.
      await tx.$queryRaw`SELECT id FROM identity."SsoCentralSession" WHERE id = ${candidate.familyId} FOR UPDATE`;
      const session = await tx.ssoAppSession.findUnique({ where: { id: candidate.id } });
      const family = await tx.ssoCentralSession.findUnique({ where: { id: candidate.familyId } });
      if (
        !session ||
        !family ||
        session.handleHash !== input.handleHash ||
        session.environment !== input.environment ||
        session.appKey !== input.appKey ||
        family.environment !== input.environment ||
        family.userId !== session.userId
      ) {
        throw new UnauthorizedException("Session changed; verify your session before signing out");
      }
      if (family.revokedAt) {
        return;
      }
      await tx.ssoCentralSession.update({
        where: { id: family.id },
        data: { revokedAt: input.now },
      });
      await tx.ssoAppSession.updateMany({
        where: { familyId: family.id, revokedAt: null },
        data: { revokedAt: input.now },
      });
      await this.record(tx, "identity.sso.signed_out", family.userId, family.id);
    });
  }
  async createTransaction(transaction: SsoTransaction) {
    await this.prisma.ssoLoginTransaction.create({ data: transaction });
  }
  async getTransaction(id: string) {
    const row = await this.prisma.ssoLoginTransaction.findUnique({ where: { id } });
    return row ? { ...row, appKey: SsoAppKeySchema.parse(row.appKey) } : null;
  }
  async findFamily(handleHash: string, environment: string) {
    return this.prisma.ssoCentralSession.findFirst({ where: { handleHash, environment } });
  }
  async takeAttempt(key: string, now: Date, limit: number) {
    const window = Math.floor(now.getTime() / 300_000);
    const id = `${key}:${window}`;
    const result = await this.prisma.ssoAttemptBudget.upsert({
      where: { id },
      create: { id, attempts: 1, expiresAt: new Date((window + 1) * 300_000) },
      update: { attempts: { increment: 1 } },
    });
    return result.attempts <= limit;
  }
  async authorize(input: Parameters<SsoStorePort["authorize"]>[0]) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM identity."SsoLoginTransaction" WHERE id = ${input.transactionId} FOR UPDATE`;
      const transaction = await tx.ssoLoginTransaction.findUnique({
        where: { id: input.transactionId },
      });
      if (
        !transaction ||
        transaction.expiresAt <= input.now ||
        transaction.consumedAt ||
        transaction.codeHash ||
        transaction.environment !== input.family.environment
      ) {
        throw new BadRequestException("Sign-in request expired or was already used");
      }
      await this.requireAccess(tx, input.family.userId, input.family.credentialHash);
      if (input.emailProof) {
        const challenge = await tx.ssoEmailChallenge.findUnique({
          where: { transactionId: transaction.id },
        });
        if (
          !challenge ||
          challenge.consumedAt ||
          challenge.expiresAt <= input.now ||
          challenge.attempts >= 5 ||
          challenge.userId !== input.family.userId ||
          challenge.email !== input.emailProof.email ||
          challenge.credentialHash !== input.family.credentialHash
        ) {
          return false;
        }
        if (!ssoEqual(challenge.codeHash, input.emailProof.codeHash)) {
          await tx.ssoEmailChallenge.update({
            where: { id: challenge.id },
            data: { attempts: { increment: 1 } },
          });
          return false;
        }
        await tx.ssoEmailChallenge.update({
          where: { id: challenge.id },
          data: { consumedAt: input.now, codeCipher: "" },
        });
      }
      if (input.createFamily) {
        await tx.ssoCentralSession.create({ data: input.family });
      }
      await tx.$queryRaw`SELECT id FROM identity."SsoCentralSession" WHERE id = ${input.family.id} FOR UPDATE`;
      const family = await tx.ssoCentralSession.findUnique({ where: { id: input.family.id } });
      if (
        !family ||
        family.revokedAt ||
        family.userId !== input.family.userId ||
        family.environment !== transaction.environment ||
        family.expiresAt <= input.now ||
        family.idleExpiresAt <= input.now
      ) {
        throw new UnauthorizedException("Sign-in expired");
      }
      await tx.ssoLoginTransaction.update({
        where: { id: transaction.id },
        data: {
          familyId: family.id,
          codeHash: input.codeHash,
          codeExpiresAt: input.codeExpiresAt,
        },
      });
      await this.record(
        tx,
        input.createFamily ? "identity.sso.signed_in" : "identity.sso.handoff_issued",
        family.userId,
        family.id
      );
      return true;
    });
  }
  async prepareEmailChallenge(challenge: SsoEmailChallenge) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM identity."SsoLoginTransaction" WHERE id = ${challenge.transactionId} FOR UPDATE`;
      const transaction = await tx.ssoLoginTransaction.findUnique({
        where: { id: challenge.transactionId },
      });
      if (
        !transaction ||
        transaction.consumedAt ||
        transaction.codeHash ||
        transaction.expiresAt <= challenge.createdAt
      ) {
        throw new BadRequestException("Sign-in request expired");
      }
      const previous = await tx.ssoEmailChallenge.findUnique({
        where: { transactionId: challenge.transactionId },
      });
      if (
        previous?.email === challenge.email &&
        challenge.createdAt.getTime() - previous.createdAt.getTime() < 60_000
      ) {
        return;
      }
      await tx.ssoEmailChallenge.deleteMany({ where: { transactionId: challenge.transactionId } });
      await tx.ssoEmailChallenge.create({ data: challenge });
      await this.outbox.enqueue(
        {
          tenantId: null,
          eventType: "identity.sso.email_code_requested",
          payload: { challengeId: challenge.id },
        },
        tx as unknown as TransactionContext
      );
    });
  }
  findEmailChallenge(id: string) {
    return this.prisma.ssoEmailChallenge.findUnique({ where: { id } });
  }
  async markEmailDelivered(id: string) {
    await this.prisma.ssoEmailChallenge.updateMany({ where: { id }, data: { codeCipher: "" } });
  }
  async redeem(input: Parameters<SsoStorePort["redeem"]>[0]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM identity."SsoLoginTransaction" WHERE id = ${input.transaction.id} FOR UPDATE`;
      const transaction = await tx.ssoLoginTransaction.findUnique({
        where: { id: input.transaction.id },
      });
      if (
        !transaction ||
        !transaction.familyId ||
        transaction.consumedAt ||
        transaction.expiresAt <= input.now ||
        !transaction.codeExpiresAt ||
        transaction.codeExpiresAt <= input.now ||
        transaction.codeHash !== input.codeHash ||
        transaction.browserHash !== input.browserHash ||
        transaction.stateHash !== input.stateHash ||
        transaction.challenge !== input.challenge ||
        transaction.appKey !== input.session.appKey ||
        transaction.environment !== input.session.environment ||
        transaction.origin !== input.transaction.origin ||
        transaction.familyId !== input.session.familyId
      ) {
        throw new BadRequestException("Sign-in could not be completed; restart it from your app");
      }
      await tx.$queryRaw`SELECT id FROM identity."SsoCentralSession" WHERE id = ${transaction.familyId} FOR UPDATE`;
      const family = await tx.ssoCentralSession.findUnique({ where: { id: transaction.familyId } });
      if (
        !family ||
        family.revokedAt ||
        family.expiresAt <= input.now ||
        family.idleExpiresAt <= input.now ||
        family.environment !== transaction.environment
      ) {
        throw new UnauthorizedException("Sign-in expired");
      }
      await this.requireAccess(tx, family.userId, family.credentialHash);
      await tx.ssoLoginTransaction.update({
        where: { id: transaction.id },
        data: { consumedAt: input.now, verifierCipher: "", stateCipher: "" },
      });
      await tx.ssoAppSession.create({
        data: {
          ...input.session,
          userId: family.userId,
          expiresAt: new Date(
            Math.min(family.expiresAt.getTime(), input.session.expiresAt.getTime())
          ),
          idleExpiresAt: new Date(
            Math.min(family.idleExpiresAt.getTime(), input.session.idleExpiresAt.getTime())
          ),
        },
      });
      await this.record(tx, "identity.sso.app_session_created", family.userId, input.session.id);
    });
  }
  async cancel(transactionId: string, browserHash: string) {
    await this.prisma.ssoLoginTransaction.updateMany({
      where: { id: transactionId, browserHash, codeHash: null, consumedAt: null },
      data: { consumedAt: new Date(), verifierCipher: "", stateCipher: "" },
    });
  }
  private async requireAccess(
    tx: Prisma.TransactionClient,
    userId: string,
    credentialHash: string
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { status: true, passwordHash: true },
    });
    const membership = await tx.membership.findFirst({
      where: { userId, tenant: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (
      user?.status !== "ACTIVE" ||
      !membership ||
      createHash("sha256").update(user.passwordHash).digest("hex") !== credentialHash
    ) {
      throw new UnauthorizedException("Unable to sign in: account or team access is unavailable");
    }
  }
  private async record(
    tx: Prisma.TransactionClient,
    action: string,
    userId: string,
    entityId: string
  ) {
    const context = tx as unknown as TransactionContext;
    await this.audit.write(
      { tenantId: null, actorUserId: userId, action, targetType: "SsoSession", targetId: entityId },
      context
    );
    await this.outbox.enqueue(
      { tenantId: null, eventType: action, payload: { userId, sessionId: entityId } },
      context
    );
  }
}
