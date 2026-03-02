import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  ok,
  Result,
  UseCaseContext,
  UseCaseError,
  RequireTenant,
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
} from "@corely/kernel";
import type { IntegrationConnectionEntity } from "../../../../integrations/domain/integration-connection.entity";
import {
  INTEGRATION_CONNECTION_REPOSITORY_PORT,
  type IntegrationConnectionRepositoryPort,
} from "../../../../integrations/application/ports/integration-connection-repository.port";
import { IntegrationsEmailProviderService } from "../../../../integrations";
import {
  ENROLLMENT_REPO_PORT,
  type EnrollmentRepoPort,
} from "../../ports/enrollment-repository.port";
import { ACTIVITY_REPO_PORT, type ActivityRepoPort } from "../../ports/activity-repository.port";
import { LEAD_REPO_PORT, type LeadRepoPort } from "../../ports/lead-repository.port";
import { DEAL_REPO_PORT, type DealRepoPort } from "../../ports/deal-repository.port";
import { ActivityEntity } from "../../../domain/activity.entity";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../../shared/ports/clock.port";
import {
  ID_GENERATOR_TOKEN,
  type IdGeneratorPort,
} from "../../../../../shared/ports/id-generator.port";
import { PrismaPartyRepoAdapter } from "../../../../party/infrastructure/prisma/prisma-party-repo.adapter";

@Injectable()
@RequireTenant()
export class RunSequenceStepsUseCase extends BaseUseCase<{ limit: number }, { processed: number }> {
  private readonly localLogger = new Logger(RunSequenceStepsUseCase.name);
  private static readonly FROM_EMAIL = "nails@corely.one";
  private static readonly REPLY_ALIAS_DOMAIN = "corely.one";

  constructor(
    @Inject(ENROLLMENT_REPO_PORT) private readonly enrollmentRepo: EnrollmentRepoPort,
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort,
    @Inject(LEAD_REPO_PORT) private readonly leadRepo: LeadRepoPort,
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(INTEGRATION_CONNECTION_REPOSITORY_PORT)
    private readonly integrationConnections: IntegrationConnectionRepositoryPort,
    private readonly partyRepo: PrismaPartyRepoAdapter,
    private readonly emailProvider: IntegrationsEmailProviderService,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort
  ) {
    super({});
  }

  protected async handle(
    input: { limit: number },
    ctx: UseCaseContext
  ): Promise<Result<{ processed: number }, UseCaseError>> {
    const enrollments = await this.enrollmentRepo.findDueEnrollments(input.limit);
    let processed = 0;

    for (const enrollment of enrollments) {
      try {
        // Find current step
        const currentStep = enrollment.sequence.steps.find(
          (s) => s.stepOrder === enrollment.currentStepOrder
        );

        if (!currentStep) {
          // Step not found (maybe sequence changed), complete enrollment?
          await this.enrollmentRepo.updateStatus(
            enrollment.id,
            "COMPLETED",
            null,
            enrollment.currentStepOrder
          );
          continue;
        }

        // Execute step
        const now = this.clock.now();
        const activityId = this.idGenerator.newId();
        const activityBase = {
          id: activityId,
          tenantId: enrollment.tenantId,
          subject: currentStep.templateSubject || "Sequence Step",
          body: currentStep.templateBody,
          leadId: enrollment.leadId || null,
          partyId: enrollment.partyId || null,
          dealId: null,
          createdAt: now,
          createdByUserId: null, // System
        };

        if (currentStep.type === "EMAIL_AUTO") {
          const recipient = await this.resolveRecipientEmail(enrollment);
          if (!recipient) {
            throw new Error(`No recipient email found for enrollment ${enrollment.id}`);
          }

          const activeResendConnection = await this.findActiveResendConnection(enrollment.tenantId);
          if (!activeResendConnection) {
            throw new Error(`No active Resend integration found for tenant ${enrollment.tenantId}`);
          }

          const relatedDealId = await this.resolveRelatedDealId(enrollment, recipient.partyId);
          const relatedPartyId = recipient.partyId ?? activityBase.partyId;

          if (!relatedPartyId && !relatedDealId) {
            throw new Error(
              `Cannot log auto email activity for enrollment ${enrollment.id}: missing party/deal linkage`
            );
          }

          const replyTo = relatedDealId ? this.buildDealReplyAlias(relatedDealId) : undefined;

          const sent = await this.emailProvider.send({
            tenantId: enrollment.tenantId,
            connectionId: activeResendConnection.toObject().id,
            from: RunSequenceStepsUseCase.FROM_EMAIL,
            replyTo,
            to: [recipient.email],
            subject: activityBase.subject,
            html: activityBase.body ?? undefined,
            text: activityBase.body ?? undefined,
          });

          const activity = ActivityEntity.create({
            ...activityBase,
            dealId: relatedDealId,
            partyId: relatedPartyId,
            type: "COMMUNICATION",
            channelKey: "email",
            direction: "OUTBOUND",
            communicationStatus: "SENT",
            subject: activityBase.subject,
            toRecipients: [recipient.email],
            providerKey: "resend",
            externalMessageId: sent.providerMessageId ?? null,
            externalThreadId: sent.providerMessageId ?? null,
            threadKey: sent.providerMessageId ?? null,
            recordSource: "SYSTEM",
            metadata: {
              source: "sequence",
              sequenceEnrollmentId: enrollment.id,
              sequenceId: enrollment.sequenceId,
              stepOrder: currentStep.stepOrder,
              leadId: enrollment.leadId,
              contextDealId: relatedDealId,
            },
          });

          activity.complete(now, now);
          await this.activityRepo.create(enrollment.tenantId, activity);
        } else if (currentStep.type === "EMAIL_MANUAL") {
          const activity = ActivityEntity.create({
            ...activityBase,
            type: "COMMUNICATION",
            channelKey: "email",
            direction: "OUTBOUND",
            communicationStatus: "DRAFT",
          });
          await this.activityRepo.create(enrollment.tenantId, activity);
        } else if (currentStep.type === "CALL") {
          const activity = ActivityEntity.create({
            ...activityBase,
            type: "TASK", // Reminder to call
            subject: `Call: ${activityBase.subject}`,
            dueAt: now,
          });
          await this.activityRepo.create(enrollment.tenantId, activity);
        } else if (currentStep.type === "TASK") {
          const activity = ActivityEntity.create({
            ...activityBase,
            type: "TASK",
            dueAt: now,
          });
          await this.activityRepo.create(enrollment.tenantId, activity);
        }

        // Advance to next step
        const nextStep = enrollment.sequence.steps.find(
          (s) => s.stepOrder === enrollment.currentStepOrder + 1
        );
        if (nextStep) {
          const delayDays =
            nextStep.dayDelay >= currentStep.dayDelay
              ? nextStep.dayDelay - currentStep.dayDelay
              : nextStep.dayDelay;
          const nextRun = new Date(now);
          nextRun.setDate(nextRun.getDate() + delayDays);
          await this.enrollmentRepo.updateStatus(
            enrollment.id,
            "ACTIVE",
            nextRun,
            nextStep.stepOrder
          );
        } else {
          // No more steps
          await this.enrollmentRepo.updateStatus(
            enrollment.id,
            "COMPLETED",
            null,
            enrollment.currentStepOrder
          );
        }
        await this.audit.log({
          tenantId: enrollment.tenantId,
          userId: "system",
          action: "crm.sequence.step.run",
          entityType: "sequenceEnrollment",
          entityId: enrollment.id,
          metadata: { stepOrder: currentStep.stepOrder, stepType: currentStep.type },
        });
        await this.outbox.enqueue({
          eventType: "crm.sequence.step.executed",
          tenantId: enrollment.tenantId,
          correlationId: ctx.correlationId,
          payload: {
            enrollmentId: enrollment.id,
            stepOrder: currentStep.stepOrder,
            stepType: currentStep.type,
          },
        });

        processed++;
      } catch (err) {
        this.localLogger.error(`Failed to process enrollment ${enrollment.id}`, err);
      }
    }

    return ok({ processed });
  }

  private async resolveRecipientEmail(enrollment: {
    tenantId: string;
    leadId: string | null;
    partyId: string | null;
    dealId: string | null;
  }): Promise<{ email: string; partyId: string | null } | null> {
    if (enrollment.dealId) {
      const deal = await this.dealRepo.findById(enrollment.tenantId, enrollment.dealId);
      const dealPartyId = deal?.partyId ?? null;
      if (dealPartyId) {
        const party = await this.partyRepo.findPartyById(enrollment.tenantId, dealPartyId);
        if (party?.primaryEmail) {
          return { email: party.primaryEmail, partyId: party.id };
        }
      }
    }

    if (enrollment.leadId) {
      const lead = await this.leadRepo.findById(enrollment.tenantId, enrollment.leadId);
      if (!lead) {
        return null;
      }

      if (lead.email) {
        return { email: lead.email, partyId: lead.convertedPartyId ?? null };
      }

      if (lead.convertedPartyId) {
        const party = await this.partyRepo.findPartyById(
          enrollment.tenantId,
          lead.convertedPartyId
        );
        if (party?.primaryEmail) {
          return { email: party.primaryEmail, partyId: party.id };
        }
      }
    }

    if (enrollment.partyId) {
      const party = await this.partyRepo.findPartyById(enrollment.tenantId, enrollment.partyId);
      if (party?.primaryEmail) {
        return { email: party.primaryEmail, partyId: party.id };
      }
    }

    return null;
  }

  private async findActiveResendConnection(
    tenantId: string
  ): Promise<IntegrationConnectionEntity | null> {
    const connections = await this.integrationConnections.list(tenantId, { kind: "resend" });
    return connections.find((connection) => connection.toObject().status === "active") ?? null;
  }

  private async resolveRelatedDealId(
    enrollment: {
      tenantId: string;
      leadId: string | null;
      partyId: string | null;
      dealId: string | null;
    },
    resolvedPartyId: string | null
  ): Promise<string | null> {
    if (enrollment.dealId) {
      return enrollment.dealId;
    }

    if (enrollment.leadId) {
      const lead = await this.leadRepo.findById(enrollment.tenantId, enrollment.leadId);
      if (lead?.convertedDealId) {
        return lead.convertedDealId;
      }
      if (!resolvedPartyId && lead?.convertedPartyId) {
        const deals = await this.dealRepo.list(
          enrollment.tenantId,
          { partyId: lead.convertedPartyId, status: "OPEN" },
          1
        );
        return deals.items.at(0)?.id ?? null;
      }
    }

    const partyId = enrollment.partyId ?? resolvedPartyId;
    if (!partyId) {
      return null;
    }

    const deals = await this.dealRepo.list(enrollment.tenantId, { partyId, status: "OPEN" }, 1);
    return deals.items.at(0)?.id ?? null;
  }

  private buildDealReplyAlias(dealId: string): string {
    return `replies+${dealId}@${RunSequenceStepsUseCase.REPLY_ALIAS_DOMAIN}`;
  }
}
