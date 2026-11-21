import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { SignTemplateIdSchema } from "@corely/contracts";
import {
  UNIT_OF_WORK,
  AUDIT_PORT,
  type UnitOfWorkPort,
  type UseCaseContext,
  type AuditPort,
} from "@corely/kernel";
import { SignArtifactEngine, type SignVerification } from "../ports/sign-artifact-engine";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { TemplateDocuments } from "../../../documents/public";
import { SignAccessService } from "../services/sign-access.service";
import { hash } from "../../domain/digest";
import { signedArtifactOwner } from "../../domain/signed-artifact-owner";

@Injectable()
export class DownloadSignArtifactUseCase {
  constructor(
    private readonly access: SignAccessService,
    private readonly repo: CeremonyRepository,
    private readonly documents: TemplateDocuments,
    private readonly engine: SignArtifactEngine,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort
  ) {}

  async execute(ctx: UseCaseContext, id: string, format: "pdf" | "evidence" = "pdf") {
    const owner = await this.uow.withinTransaction(async (tx) => {
      const { scope, userId } = await this.access.authorize(
        ctx,
        tx,
        format === "evidence"
          ? ["sign.requests.read", "sign.requests.export"]
          : ["sign.requests.read"]
      );
      const ref = { ...scope, requestId: SignTemplateIdSchema.parse(id) },
        draft = await this.repo.draft(ref, tx),
        c = await this.repo.ceremony(ref, tx);
      if (draft?.actorId !== userId || c?.status !== "COMPLETED" || !c.artifactSha256) {
        throw new NotFoundException("Completed artifact unavailable");
      }
      return {
        ...signedArtifactOwner(ref, c.artifactSha256),
        verifiedAt: c.verifiedAt,
        evidenceSha256: c.evidenceSha256,
        source: { ...scope, templateId: draft.templateId, sha256: draft.canonicalSha256 },
      };
    });
    const pdf = await this.documents.read(owner);
    if (!pdf) {
      throw new NotFoundException("Completed artifact unavailable");
    }
    await this.engine.verify(pdf, owner.verifiedAt ?? undefined);
    let bytes = pdf;
    if (format === "evidence") {
      const evidence = await this.engine.evidence(pdf);
      if (hash(evidence) !== owner.evidenceSha256) {
        throw Error("Archived evidence digest mismatch");
      }
      const source = await this.documents.read(owner.source);
      if (!source) {
        throw Error("Missing original PDF");
      }
      const verification: SignVerification = {
        profile: "adbe.pkcs7.detached",
        artifactSha256: owner.sha256,
        evidenceSha256: owner.evidenceSha256,
        sourceSha256: owner.source.sha256,
        verifiedAt: owner.verifiedAt?.toISOString(),
        timestampAuthority: null,
      };
      bytes = this.engine.bundle(source, pdf, evidence, verification);
    }
    await this.audit.log({
      tenantId: owner.tenantId,
      userId: ctx.userId,
      entityType: "SignRequest",
      entityId: id,
      action: format === "evidence" ? "sign.evidence.exported" : "sign.artifact.downloaded",
      metadata: { workspaceId: owner.workspaceId, artifactSha256: owner.sha256 },
    });
    return { sha256: hash(bytes), base64: bytes.toString("base64") };
  }
}
