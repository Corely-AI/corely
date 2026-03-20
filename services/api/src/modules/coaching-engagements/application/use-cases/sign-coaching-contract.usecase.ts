import {
  AUDIT_PORT,
  BaseUseCase,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  ValidationError,
  type AuditPort,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  err,
  ok,
} from "@corely/kernel";
import {
  type SignCoachingContractInput,
  type SignCoachingContractOutput,
  COACHING_EVENTS,
} from "@corely/contracts";
import { buildSimplePdf } from "../../domain/simple-pdf";
import { hashCoachingAccessToken } from "../../domain/coaching-tokens";
import { resolveGatedStatus } from "../../domain/coaching-state.machine";
import { resolveLocalizedText } from "../../domain/coaching-localization";
import { type CoachingArtifactService } from "../../infrastructure/documents/coaching-artifact.service";
import { toCoachingEngagementDto } from "../mappers/coaching-dto.mapper";
import { type CoachingEngagementRepositoryPort } from "../ports/coaching-engagement-repository.port";

export class SignCoachingContractUseCase extends BaseUseCase<
  SignCoachingContractInput,
  SignCoachingContractOutput
> {
  constructor(
    private readonly deps: {
      logger: LoggerPort;
      repo: CoachingEngagementRepositoryPort;
      artifactService: CoachingArtifactService;
      idGenerator: IdGeneratorPort;
      clock: ClockPort;
      audit: AuditPort;
      outbox: OutboxPort;
      uow: UnitOfWorkPort;
    }
  ) {
    super({ logger: deps.logger, uow: deps.uow });
  }

  protected async handle(
    input: SignCoachingContractInput,
    ctx: UseCaseContext
  ): Promise<Result<SignCoachingContractOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId and workspaceId are required"));
    }

    const engagement = await this.deps.repo.findEngagementByContractTokenHash(
      ctx.tenantId,
      input.engagementId,
      hashCoachingAccessToken(input.token)
    );
    if (!engagement) {
      return err(new ValidationError("Invalid contract signing token"));
    }

    if (engagement.contractStatus === "signed" && engagement.signedContractDocumentId) {
      return ok({
        signed: true,
        engagement: toCoachingEngagementDto(engagement, engagement.offer),
      });
    }

    const now = this.deps.clock.now();
    const title = `${resolveLocalizedText(engagement.offer.contractLabel ?? engagement.offer.title, engagement.locale)} - Signed Contract`;
    const document = await this.deps.artifactService.createPdfArtifact({
      tenantId: ctx.tenantId,
      title,
      objectPath: `engagements/${engagement.id}/contracts`,
      links: [
        { entityType: "COACHING_ENGAGEMENT", entityId: engagement.id },
        { entityType: "PARTY", entityId: engagement.clientPartyId },
      ],
      bytes: buildSimplePdf([
        title,
        `Engagement: ${engagement.id}`,
        `Client party: ${engagement.clientPartyId}`,
        `Signer: ${input.signerName}`,
        input.signerEmail ? `Signer email: ${input.signerEmail}` : "Signer email: not provided",
        `Signed at: ${now.toISOString()}`,
      ]),
    });

    const previousStatus = engagement.status;
    engagement.contractStatus = "signed";
    engagement.contractSignedAt = now;
    engagement.signedContractDocumentId = document.documentId;
    engagement.status = resolveGatedStatus(engagement.offer, {
      paymentStatus: engagement.paymentStatus,
      contractStatus: engagement.contractStatus,
      prepRequired: Boolean(engagement.offer.prepFormTemplate),
      prepSubmitted: false,
    });
    engagement.updatedAt = now;

    await this.uow!.withinTransaction(async (tx) => {
      await this.deps.repo.updateEngagement(engagement, tx);
      await this.deps.repo.createTimelineEntry(
        {
          id: this.deps.idGenerator.newId(),
          tenantId: ctx.tenantId!,
          workspaceId: ctx.workspaceId!,
          engagementId: engagement.id,
          eventType: COACHING_EVENTS.CONTRACT_SIGNED,
          stateFrom: previousStatus,
          stateTo: engagement.status,
          actorUserId: null,
          metadata: {
            signerName: input.signerName,
            signerEmail: input.signerEmail ?? null,
            documentId: document.documentId,
          },
          occurredAt: now,
          createdAt: now,
        },
        tx
      );
      await this.deps.audit.log(
        {
          tenantId: ctx.tenantId!,
          userId: "public",
          action: "coaching.contract.signed",
          entityType: "CoachingEngagement",
          entityId: engagement.id,
          metadata: { documentId: document.documentId },
        },
        tx
      );
      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: COACHING_EVENTS.CONTRACT_SIGNED,
          correlationId: ctx.correlationId,
          payload: {
            workspaceId: ctx.workspaceId!,
            engagementId: engagement.id,
            documentId: document.documentId,
          },
        },
        tx
      );
    });

    return ok({
      signed: true,
      engagement: toCoachingEngagementDto(engagement, engagement.offer),
    });
  }
}
