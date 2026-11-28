import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import type {
  AuditPort,
  EmailSenderPort,
  OutboxPort,
  TransactionContext,
  UnitOfWorkPort,
} from "@corely/kernel";
import type { IssueRepositoryPort } from "../application/ports/issue-repository.port";
import type { Issue } from "../domain/issue.types";
import { ServiceRequestsUseCase } from "../application/use-cases/service-requests.usecase";
import { DeliverClientUpdateUseCase } from "../application/use-cases/deliver-client-update.usecase";
import { toRequesterIssueDto } from "../application/mappers/issue-dto.mapper";

const ctx = { tenantId: "tenant-a", workspaceId: "workspace-a", userId: "staff-a" };
const request = {
  kind: "PROBLEM" as const,
  title: "Broken freezer",
  description: "Needs repair",
  clientEmail: "client@example.invalid",
  idempotencyKey: "bfef52bd-4181-4804-9f16-065a038a200f",
};
const resolved: Issue = {
  ...ctx,
  id: "request-a",
  title: request.title,
  requestKind: request.kind,
  clientEmail: request.clientEmail,
  reporterUserId: ctx.userId,
  status: "RESOLVED",
  priority: "MEDIUM",
  siteType: "CUSTOMER",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function setup() {
  const repo = mockDeep<IssueRepositoryPort>();
  const outbox = mockDeep<OutboxPort>();
  const audit = mockDeep<AuditPort>();
  const tx = {} as TransactionContext;
  const uow: UnitOfWorkPort = { withinTransaction: (run) => run(tx) };
  return { repo, outbox, audit, tx, useCase: new ServiceRequestsUseCase(repo, uow, outbox, audit) };
}

describe("service request intake", () => {
  it("returns the same scoped reference on replay with one creation event", async () => {
    const { useCase, repo, outbox, audit, tx } = setup();
    let saved: Issue | null = null;
    repo.findById.mockImplementation(async () => saved);
    repo.insertRequest.mockImplementation(async (issue) => {
      saved = issue;
      return true;
    });
    const first = await useCase.submit(request, ctx);
    const replay = await useCase.submit(request, ctx);
    expect(replay.id).toBe(first.id);
    expect(repo.findById).toHaveBeenCalledWith(ctx.tenantId, first.id, ctx.workspaceId);
    expect(repo.insertRequest).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "issue.created", tenantId: ctx.tenantId }),
      tx
    );
    expect(audit.log).toHaveBeenCalledTimes(1);
  });

  it("requires a workspace and excludes contact, notes and attachment fields from requester data", async () => {
    const { useCase, repo } = setup();
    await expect(useCase.submit(request, { ...ctx, workspaceId: undefined })).rejects.toThrow();
    expect(repo.insertRequest).not.toHaveBeenCalled();
    const view = toRequesterIssueDto({ ...resolved, clientUpdateSummary: "Private update draft" });
    expect(view).toMatchObject({ status: "RESOLVED" });
    expect(view).not.toHaveProperty("clientEmail");
    expect(view).not.toHaveProperty("clientUpdateSummary");
    expect(view).not.toHaveProperty("attachments");
  });
});

describe("client completion email", () => {
  it("checks the workspace and recipient and deduplicates concurrent enqueue attempts", async () => {
    const { useCase, repo, outbox, tx } = setup();
    const input = { recipient: request.clientEmail, summary: "The freezer works." };
    repo.findById.mockResolvedValue(resolved);
    await expect(
      useCase.sendUpdate(resolved.id, input, { ...ctx, workspaceId: "other" })
    ).rejects.toThrow();
    await expect(
      useCase.sendUpdate(resolved.id, { ...input, recipient: "other@example.invalid" }, ctx)
    ).rejects.toThrow();
    repo.queueClientUpdate.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await Promise.all([
      useCase.sendUpdate(resolved.id, input, ctx),
      useCase.sendUpdate(resolved.id, input, ctx),
    ]);
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledWith(
      {
        tenantId: ctx.tenantId,
        eventType: "issue.client-update.requested",
        payload: { issueId: resolved.id, workspaceId: ctx.workspaceId },
      },
      tx
    );
  });

  it("uses the same provider key after failure and leaves expired sends for review", async () => {
    const { repo } = setup();
    const sender = mockDeep<EmailSenderPort>();
    const queued: Issue = {
      ...resolved,
      clientUpdateStatus: "QUEUED",
      clientUpdateSummary: "The freezer works.",
      clientUpdateQueuedAt: new Date(),
    };
    repo.findById.mockResolvedValue(queued);
    sender.sendEmail
      .mockRejectedValueOnce(new Error("Provider unavailable"))
      .mockResolvedValueOnce({
        provider: "resend",
        providerMessageId: "synthetic",
      });
    const deliver = new DeliverClientUpdateUseCase(repo);
    await deliver.execute(ctx.tenantId, ctx.workspaceId, resolved.id, sender);
    await deliver.execute(ctx.tenantId, ctx.workspaceId, resolved.id, sender);
    expect(repo.finishClientUpdate).toHaveBeenNthCalledWith(1, queued, "FAILED");
    expect(repo.finishClientUpdate).toHaveBeenNthCalledWith(2, queued, "SENT");
    expect(sender.sendEmail.mock.calls[0]).toEqual(sender.sendEmail.mock.calls[1]);
    const expired = { ...queued, clientUpdateQueuedAt: new Date(0) };
    repo.findById.mockResolvedValue(expired);
    await deliver.execute(ctx.tenantId, ctx.workspaceId, resolved.id, sender);
    expect(repo.finishClientUpdate).toHaveBeenLastCalledWith(expired, "NEEDS_REVIEW");
    expect(sender.sendEmail).toHaveBeenCalledTimes(2);
  });
});
