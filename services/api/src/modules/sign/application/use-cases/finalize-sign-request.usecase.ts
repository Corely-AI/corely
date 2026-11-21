import { randomUUID } from "node:crypto";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { SignValuesSchema } from "@corely/contracts";
import {
  UNIT_OF_WORK,
  AUDIT_PORT,
  OUTBOX_PORT,
  type UnitOfWorkPort,
  type AuditPort,
  type OutboxPort,
} from "@corely/kernel";
import { SignArtifactEngine, type SignEvidence } from "../ports/sign-artifact-engine";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { TemplateDocuments } from "../../../documents/public";
import { hash } from "../../domain/digest";
import type { RequestRef } from "../../domain/ceremony";
import { signedArtifactOwner } from "../../domain/signed-artifact-owner";

@Injectable()
export class FinalizeSignRequestUseCase {
  constructor(
    private readonly repo: CeremonyRepository,
    private readonly templates: SignDraftRepository,
    private readonly documents: TemplateDocuments,
    private readonly engine: SignArtifactEngine,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async execute(ref: RequestRef) {
    const leaseId = randomUUID();
    const snapshot = await this.uow.withinTransaction(async (tx) => {
      await this.repo.lock(ref, tx);
      const c = await this.repo.ceremony(ref, tx);
      if (c?.status === "COMPLETED") {
        return;
      }
      if (c?.status !== "COLLECTED") {
        throw new ConflictException("Signatures outstanding");
      }
      if (c.leaseUntil && c.leaseUntil > new Date()) {
        throw new ConflictException("Finalization is already in progress");
      }
      await this.repo.change(
        ref,
        { leaseId, leaseUntil: new Date(Date.now() + 120000), finalizationFailed: false },
        tx
      );
      const draft = await this.repo.draft(ref, tx);
      if (!draft) {
        throw Error("Missing signing request");
      }
      const scope = { tenantId: ref.tenantId, workspaceId: ref.workspaceId };
      const version = await this.templates.version(
        scope,
        draft.templateId,
        draft.templateRevision,
        tx
      );
      if (!version) {
        throw Error("Missing template");
      }
      const acceptances = (await this.repo.signers(ref, tx)).map((row) => {
        const recipient = draft.recipients[row.position];
        if (
          row.status !== "ACCEPTED" ||
          !row.acceptedAt ||
          row.reviewedSha256 !== draft.canonicalSha256 ||
          row.roleId !== recipient.roleId
        ) {
          throw Error("Incomplete acceptance");
        }
        return {
          roleId: recipient.roleId,
          name: recipient.name,
          email: recipient.email,
          recipientId: row.id,
          acceptedAt: row.acceptedAt.toISOString(),
          reviewedSha256: row.reviewedSha256,
          values: SignValuesSchema.parse(row.values),
        };
      });
      const evidence: SignEvidence = {
        schemaVersion: 1,
        ...ref,
        templateId: draft.templateId,
        templateRevision: draft.templateRevision,
        sourceSha256: draft.canonicalSha256,
        sentAt: c.sentAt.toISOString(),
        senderWorkspace: c.senderWorkspace ?? null,
        senderId: draft.actorId,
        renderer: "Corely static PDF v1 / pdf-lib 1.17.1",
        consent: c.consent,
        routing: draft.routing,
        acceptances,
      };
      return {
        candidate: c.candidateSha256,
        evidence,
        layout: version.layout,
        owner: { ...scope, templateId: draft.templateId, sha256: draft.canonicalSha256 },
        actor: draft.actorId,
      };
    });
    if (!snapshot) {
      return;
    }
    try {
      let pdf = snapshot.candidate
        ? await this.documents.read(signedArtifactOwner(ref, snapshot.candidate))
        : null;
      if (!pdf) {
        const source = await this.documents.read(snapshot.owner);
        if (!source) {
          throw Error("Missing canonical PDF");
        }
        pdf = await this.engine.generate(source, snapshot.layout, snapshot.evidence);
      }
      const verifiedAt = new Date();
      await this.engine.verify(pdf, verifiedAt);
      const artifactSha256 = hash(pdf),
        evidenceSha256 = hash(JSON.stringify(snapshot.evidence)),
        owner = signedArtifactOwner(ref, artifactSha256);
      await this.uow.withinTransaction(async (tx) => {
        await this.repo.lock(ref, tx);
        if ((await this.repo.ceremony(ref, tx))?.leaseId !== leaseId) {
          throw new ConflictException("Finalization lease lost");
        }
        await this.repo.change(ref, { candidateSha256: artifactSha256 }, tx);
      });
      await this.documents.store(owner, pdf);
      const archived = await this.documents.read(owner);
      if (!archived || hash(archived) !== artifactSha256) {
        throw Error("Could not verify archived bytes");
      }
      await this.uow.withinTransaction(async (tx) => {
        await this.repo.lock(ref, tx);
        const c = await this.repo.ceremony(ref, tx);
        if (c?.status === "COMPLETED") {
          return;
        }
        if (c?.status !== "COLLECTED" || c.leaseId !== leaseId) {
          throw new ConflictException("Request or lease changed");
        }
        await this.repo.change(
          ref,
          {
            status: "COMPLETED",
            leaseId: null,
            leaseUntil: null,
            candidateSha256: null,
            finalizationFailed: false,
            verifiedAt,
            artifactSha256,
            evidenceSha256,
          },
          tx
        );
        const event = "sign.request.completed.v1",
          metadata = { ...ref, artifactSha256, evidenceSha256 };
        await this.audit.log(
          {
            tenantId: ref.tenantId,
            userId: snapshot.actor,
            entityType: "SignRequest",
            entityId: ref.requestId,
            action: event,
            metadata,
          },
          tx
        );
        await this.outbox.enqueue(
          { tenantId: ref.tenantId, eventType: event, payload: metadata },
          tx
        );
      });
    } catch (error) {
      await this.uow.withinTransaction(async (tx) => {
        await this.repo.lock(ref, tx);
        if ((await this.repo.ceremony(ref, tx))?.leaseId === leaseId) {
          await this.repo.change(
            ref,
            { leaseId: null, leaseUntil: null, finalizationFailed: true },
            tx
          );
        }
      });
      throw error;
    }
  }
}
