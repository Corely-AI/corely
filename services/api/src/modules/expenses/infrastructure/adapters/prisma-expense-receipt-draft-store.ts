import { Injectable } from "@nestjs/common";
import { getPrismaClient, PrismaExtKvAdapter, PrismaService } from "@corely/data";
import { ExpenseReceiptDraftSchema, type ExpenseReceiptDraft } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import { Prisma } from "@prisma/client";
import type {
  ExpenseReceiptDraftStore,
  ReceiptActor,
  ReceiptWorkspace,
} from "../../application/expense-receipt-draft-store";

const moduleId = "expenses.receipt-email";
const settingsKey = (scope: ReceiptWorkspace) => ({
  tenantId: scope.tenantId,
  moduleId,
  scope: `workspace:${scope.workspaceId}`,
  key: "enabled",
});
const draftKey = (scope: ReceiptWorkspace, key: string) => ({
  tenantId: scope.tenantId,
  moduleId,
  scope: `drafts:${scope.workspaceId}`,
  key,
});
const tokenKey = (scope: ReceiptWorkspace, key: string) => ({
  tenantId: scope.tenantId,
  moduleId,
  scope: `tokens:${scope.workspaceId}`,
  key,
});

@Injectable()
export class PrismaExpenseReceiptDraftStore implements ExpenseReceiptDraftStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kv: PrismaExtKvAdapter
  ) {}

  async enabled(scope: ReceiptWorkspace, tx?: TransactionContext) {
    return (await this.kv.get(settingsKey(scope), tx))?.value === true;
  }

  async setEnabled(scope: ReceiptWorkspace, enabled: boolean, tx: TransactionContext) {
    await this.kv.set({ ...settingsKey(scope), value: enabled }, tx);
  }

  async userForToken(scope: ReceiptWorkspace, token: string) {
    const value = (await this.kv.get(tokenKey(scope, token)))?.value;
    return typeof value === "string" ? value : null;
  }

  async bindToken(scope: ReceiptWorkspace, token: string, userId: string) {
    await this.kv.set({ ...tokenKey(scope, token), value: userId });
  }

  async find(scope: ReceiptWorkspace, id: string, tx?: TransactionContext) {
    const entry = await this.kv.get(draftKey(scope, id), tx);
    return entry ? ExpenseReceiptDraftSchema.parse(entry.value) : null;
  }

  async lock(scope: ReceiptWorkspace, id: string, tx: TransactionContext) {
    const key = draftKey(scope, id);
    // Serialize assignment and submission for a single imported receipt.
    await getPrismaClient(this.prisma, tx).$queryRaw`
      SELECT "id" FROM "ext"."ExtKv"
      WHERE "tenantId" = ${key.tenantId} AND "moduleId" = ${key.moduleId}
        AND "scope" = ${key.scope} AND "key" = ${key.key}
      FOR UPDATE
    `;
    return this.find(scope, id, tx);
  }

  async create(scope: ReceiptWorkspace, draft: ExpenseReceiptDraft, tx: TransactionContext) {
    const { count } = await getPrismaClient(this.prisma, tx).extKv.createMany({
      data: { ...draftKey(scope, draft.id), value: draft },
      skipDuplicates: true,
    });
    return count === 1;
  }

  async save(scope: ReceiptWorkspace, draft: ExpenseReceiptDraft, tx: TransactionContext) {
    await this.kv.set({ ...draftKey(scope, draft.id), value: draft }, tx);
  }

  async list(actor: ReceiptActor, after?: string) {
    const { tenantId, scope } = draftKey(actor, "");
    const assigned: Prisma.ExtKvWhereInput = {
      value: { path: ["claimantUserId"], equals: actor.userId },
    };
    const unassigned: Prisma.ExtKvWhereInput = {
      value: { path: ["claimantUserId"], equals: Prisma.JsonNull },
    };
    const rows = await this.prisma.extKv.findMany({
      where: {
        tenantId,
        moduleId,
        scope,
        OR: actor.canReview ? [assigned, unassigned] : [assigned],
        ...(after ? { key: { gt: after } } : {}),
      },
      orderBy: { key: "asc" },
      take: 31,
      select: { key: true, value: true },
    });
    const page = rows.slice(0, 30);
    return {
      items: page.map(({ value }) => ExpenseReceiptDraftSchema.parse(value)),
      nextCursor: rows.length > page.length ? (page.at(-1)?.key ?? null) : null,
    };
  }
}
