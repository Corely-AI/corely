import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PrismaAuditAdapter,
  PrismaOutboxAdapter,
  PrismaService,
  PrismaUnitOfWork,
} from "@corely/data";
import { PrismaIssueRepositoryAdapter } from "../infrastructure/prisma/prisma-issue-repository.adapter";
import { ServiceRequestsUseCase } from "../application/use-cases/service-requests.usecase";

const databaseUrl = process.env.ISSUE_REQUESTS_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)("service requests on isolated PostgreSQL", () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
      !/^\/issue_requests_test_[a-z0-9_]+$/.test(url.pathname)
    ) {
      throw new Error("Expected a disposable local issue_requests_test_* database");
    }
    if (process.env.OUTBOX_DISPATCH_DRIVER === "cloudtasks") {
      throw new Error("Disable external outbox dispatch for this suite");
    }
    const oldUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = url.toString();
    try {
      prisma = new PrismaService();
    } finally {
      if (oldUrl) process.env.DATABASE_URL = oldUrl;
      else delete process.env.DATABASE_URL;
    }
    await prisma.$connect();
  });

  afterAll(async () => {
    if (prisma) await prisma.onModuleDestroy();
  });

  it("deduplicates intake and delivery transactions and filters reads by workspace and owner", async () => {
    const repo = new PrismaIssueRepositoryAdapter(prisma);
    const requests = new ServiceRequestsUseCase(
      repo,
      new PrismaUnitOfWork(prisma),
      new PrismaOutboxAdapter(prisma),
      new PrismaAuditAdapter(prisma)
    );
    const ctx = { tenantId: randomUUID(), workspaceId: randomUUID(), userId: randomUUID() };
    const intake = {
      kind: "SERVICE" as const,
      title: "Install new equipment",
      description: "Request for a client",
      clientEmail: "client@example.invalid",
      idempotencyKey: randomUUID(),
    };
    const [first, second] = await Promise.all([
      requests.submit(intake, ctx),
      requests.submit(intake, ctx),
    ]);
    expect(first.id).toBe(second.id);
    expect(await prisma.issueActivity.count({ where: { issueId: first.id } })).toBe(1);
    const countEvents = (eventType: string) =>
      prisma.outboxEvent.count({ where: { tenantId: ctx.tenantId, eventType } });
    expect(await countEvents("issue.created")).toBe(1);
    expect(await repo.findById(ctx.tenantId, first.id, randomUUID())).toBeNull();
    const page = { page: 1, pageSize: 20 };
    expect(
      (
        await repo.list(
          ctx.tenantId,
          { workspaceId: ctx.workspaceId, ownerOnly: randomUUID() },
          page
        )
      ).total
    ).toBe(0);
    expect(
      (await repo.list(ctx.tenantId, { workspaceId: ctx.workspaceId, ownerOnly: ctx.userId }, page))
        .total
    ).toBe(1);

    await prisma.issue.update({ where: { id: first.id }, data: { status: "RESOLVED" } });
    const email = { recipient: intake.clientEmail, summary: "Equipment installed." };
    await Promise.all([
      requests.sendUpdate(first.id, email, ctx),
      requests.sendUpdate(first.id, email, ctx),
    ]);
    expect(await countEvents("issue.client-update.requested")).toBe(1);
    expect(await repo.findById(ctx.tenantId, first.id, ctx.workspaceId)).toMatchObject({
      status: "RESOLVED",
      clientUpdateStatus: "QUEUED",
      clientUpdateSummary: email.summary,
    });
  });
});
