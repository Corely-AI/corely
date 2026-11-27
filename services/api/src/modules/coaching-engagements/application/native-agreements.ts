import {
  ForbiddenException,
  BadRequestException,
  Inject,
  Injectable,
  ConflictException,
} from "@nestjs/common";
import { UNIT_OF_WORK, type UnitOfWorkPort, type UseCaseContext } from "@corely/kernel";
import { CreateSignRequestDraftSchema } from "@corely/contracts";
import { CreateSignRequestDraftUseCase } from "../../sign/public";
import { CUSTOMER_QUERY_PORT, type CustomerQueryPort } from "../../party/public";
import { canManageEngagement } from "../domain/coaching-state.machine";
import type { CoachingEngagementRepositoryPort } from "./ports/coaching-engagement-repository.port";
import type { TransactionContext } from "@corely/kernel";

interface AgreementRepository extends Pick<
  CoachingEngagementRepositoryPort,
  "findEngagementById" | "createTimelineEntry"
> {
  nativeAgreementEvent(
    tenantId: string,
    workspaceId: string,
    stage: "prepared" | "verified",
    requestId: string,
    tx: TransactionContext
  ): Promise<{ engagementId: string } | null>;
  recordVerifiedAgreement(
    tenantId: string,
    workspaceId: string,
    engagementId: string,
    requestId: string,
    artifactSha256: string,
    tx: TransactionContext
  ): Promise<void>;
}

@Injectable()
export class NativeCoachingAgreements {
  constructor(
    @Inject("coaching-engagements/repo") private readonly repo: AgreementRepository,
    private readonly createSignRequestDraft: CreateSignRequestDraftUseCase,
    @Inject(CUSTOMER_QUERY_PORT) private readonly customers: CustomerQueryPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort
  ) {}
  prepare(ctx: UseCaseContext, engagementId: string, body: unknown, key: string) {
    const input = CreateSignRequestDraftSchema.parse(body);
    return this.uow.withinTransaction(async (tx) => {
      const { tenantId, workspaceId, userId } = ctx;
      if (!tenantId || !workspaceId || !userId) {
        throw new ForbiddenException();
      }
      const engagement = await this.repo.findEngagementById(
        tenantId,
        workspaceId,
        engagementId,
        tx
      );
      if (!engagement || !canManageEngagement(engagement, ctx)) {
        throw new ForbiddenException();
      }
      const client = await this.customers.getCustomerBillingSnapshot(
        tenantId,
        engagement.clientPartyId
      );
      if (
        !client?.email ||
        input.recipients.length !== 1 ||
        input.recipients[0].email.toLowerCase() !== client.email.toLowerCase()
      ) {
        throw new BadRequestException(
          "Assign the coaching client's email to the single recipient role"
        );
      }
      const draft = await this.createSignRequestDraft.execute(ctx, input, key, tx);
      if (draft.configuration) {
        throw new ConflictException("Prepare the agreement from its published template");
      }
      const prior = await this.repo.nativeAgreementEvent(
        tenantId,
        workspaceId,
        "prepared",
        draft.requestId,
        tx
      );
      if (prior && prior.engagementId !== engagementId) {
        throw new ConflictException("Request already bound to another agreement");
      }
      if (!prior) {
        const now = new Date();
        await this.repo.createTimelineEntry(
          {
            id: "sign-prepared-" + draft.requestId,
            tenantId,
            workspaceId,
            engagementId,
            eventType: "coaching.agreement.prepared",
            stateFrom: engagement.status,
            stateTo: engagement.status,
            actorUserId: userId,
            metadata: {
              requestId: draft.requestId,
              templateRevision: draft.templateRevision,
              title: draft.title,
            },
            occurredAt: now,
            createdAt: now,
          },
          tx
        );
      }
      return draft;
    });
  }
  verified(tenantId: string, workspaceId: string, requestId: string, sha256: string) {
    return this.uow.withinTransaction(async (tx) => {
      const link = await this.repo.nativeAgreementEvent(
        tenantId,
        workspaceId,
        "prepared",
        requestId,
        tx
      );
      if (!link) {
        return;
      }
      await this.repo.recordVerifiedAgreement(
        tenantId,
        workspaceId,
        link.engagementId,
        requestId,
        sha256,
        tx
      );
    });
  }
}
