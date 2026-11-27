import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { UNIT_OF_WORK, type UseCaseContext } from "@corely/kernel";
import { describe, expect, it, vi } from "vitest";
import { TemplateDocuments } from "../../documents/public";
import { SignDraftRepository } from "../application/ports/sign-draft.repository";
import { SignRequestAccessService } from "../application/services/sign-request-access.service";
import { ReadSignRequestSourceUseCase } from "../application/use-cases/read-sign-request-source.usecase";

const scope = { tenantId: "tenant", workspaceId: "workspace" };
const ctx: UseCaseContext = { ...scope, userId: "owner" };
const requestId = "request";
const draft = { templateId: "template", templateRevision: 3, canonicalSha256: "a".repeat(64) };
const fields = [{ id: "published-signature" }];

async function setup() {
  const requireOwner = vi.fn().mockResolvedValue({ ref: { ...scope, requestId }, draft });
  const version = vi.fn().mockResolvedValue({ layout: { fields } });
  const pdf = Buffer.from("%PDF-fixture");
  const read = vi.fn().mockResolvedValue(pdf);
  const tx = {};
  const module = await Test.createTestingModule({
    providers: [
      ReadSignRequestSourceUseCase,
      { provide: TemplateDocuments, useValue: { read } },
      { provide: SignDraftRepository, useValue: { version } },
      { provide: SignRequestAccessService, useValue: { requireOwner } },
      {
        provide: UNIT_OF_WORK,
        useValue: { withinTransaction: (run: (tx: object) => unknown) => run(tx) },
      },
    ],
  }).compile();
  return {
    module,
    useCase: module.get(ReadSignRequestSourceUseCase),
    requireOwner,
    version,
    read,
    pdf,
    tx,
  };
}

describe("read signing request source", () => {
  it("reads the owner-scoped PDF and field positions from the pinned template revision", async () => {
    const { module, useCase, requireOwner, version, read, pdf, tx } = await setup();
    try {
      await expect(useCase.execute(ctx, requestId)).resolves.toEqual({
        base64: pdf.toString("base64"),
        sha256: draft.canonicalSha256,
        fields,
        layout: { fields },
        draftRevision: 0,
      });
      expect(requireOwner).toHaveBeenCalledWith(ctx, requestId, "sign.requests.read", tx);
      expect(version).toHaveBeenCalledWith(scope, draft.templateId, draft.templateRevision, tx);
      expect(read).toHaveBeenCalledWith({
        ...scope,
        templateId: draft.templateId,
        sha256: draft.canonicalSha256,
      });
    } finally {
      await module.close();
    }
  });

  it("does not read the document or layout if the request is inaccessible", async () => {
    const { module, useCase, requireOwner, version, read } = await setup();
    try {
      requireOwner.mockRejectedValueOnce(new NotFoundException("Request not found"));
      await expect(useCase.execute(ctx, requestId)).rejects.toThrow("Request not found");
      expect(version).not.toHaveBeenCalled();
      expect(read).not.toHaveBeenCalled();
    } finally {
      await module.close();
    }
  });
});
