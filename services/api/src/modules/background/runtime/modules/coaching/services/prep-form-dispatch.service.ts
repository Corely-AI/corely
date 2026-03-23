import { Inject, Injectable } from "@nestjs/common";
import {
  CUSTOMER_QUERY_PORT,
  type CustomerQueryPort,
} from "../../../../../party/application/ports/customer-query.port";
import {
  CLOCK_PORT_TOKEN,
  EMAIL_SENDER_PORT,
  ID_GENERATOR_TOKEN,
  type ClockPort,
  type EmailSenderPort,
  type IdGeneratorPort,
} from "@corely/kernel";
import { EnvService } from "@corely/config";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../../../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { COACHING_EVENTS } from "@corely/contracts";
import {
  createCoachingAccessToken,
  hashCoachingAccessToken,
} from "../../../../../coaching-engagements/domain/coaching-tokens";
import { buildAbsoluteUrl, buildEmailMessage } from "../coaching-workflow.helpers";

function resolvePrepDueAt(startAt: Date, hoursBeforeSession?: number | null) {
  const leadHours = hoursBeforeSession ?? 0;
  return new Date(startAt.getTime() - leadHours * 60 * 60 * 1000);
}

@Injectable()
export class PrepFormDispatchService {
  constructor(
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    @Inject(CUSTOMER_QUERY_PORT) private readonly customerQuery: CustomerQueryPort,
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    private readonly env: EnvService
  ) {}

  async dispatchIfDue(params: {
    tenantId: string;
    workspaceId: string;
    sessionId: string;
    now?: Date;
  }): Promise<"sent" | "not_due" | "skipped"> {
    const now = params.now ?? this.clock.now();
    const session = await this.repo.findSessionById(params.tenantId, params.workspaceId, params.sessionId);
    if (!session || session.prepRequestedAt || session.prepSubmittedAt) {
      return "skipped";
    }

    const { engagement } = session;
    if (!engagement.offer.prepFormTemplate || session.status !== "scheduled") {
      return "skipped";
    }
    if (engagement.offer.paymentRequired && engagement.paymentStatus !== "captured") {
      return "skipped";
    }
    if (engagement.offer.contractRequired && engagement.contractStatus !== "signed") {
      return "skipped";
    }

    const dueAt = resolvePrepDueAt(
      session.startAt,
      engagement.offer.prepFormSendHoursBeforeSession ?? 0
    );
    if (now < dueAt) {
      return "not_due";
    }

    const token = createCoachingAccessToken();
    session.prepAccessToken = token;
    session.prepAccessTokenHash = hashCoachingAccessToken(token);
    session.prepRequestedAt = now;
    session.updatedAt = now;
    await this.repo.updateSession(session);

    await this.repo.createTimelineEntry({
      id: this.idGenerator.newId(),
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      engagementId: engagement.id,
      eventType: COACHING_EVENTS.PREP_FORM_REQUESTED,
      stateFrom: engagement.status,
      stateTo: engagement.status,
      actorUserId: null,
      metadata: {
        sessionId: session.id,
        dueAt: dueAt.toISOString(),
        leadHours: engagement.offer.prepFormSendHoursBeforeSession ?? 0,
      },
      occurredAt: now,
      createdAt: now,
    });

    const customer = await this.customerQuery.getCustomerBillingSnapshot(
      params.tenantId,
      engagement.clientPartyId
    );
    if (!customer?.email) {
      return "sent";
    }

    const formUrl = buildAbsoluteUrl(
      this.env.API_BASE_URL ?? "http://localhost:3000",
      `/coaching/public/prep/${session.id}/${token}`
    );
    const message = buildEmailMessage({
      heading: "Complete your pre-coaching form",
      body: ["Please complete the pre-session questionnaire before your coaching session."],
      ctaLabel: "Open prep form",
      ctaUrl: formUrl,
    });

    await this.emailSender.sendEmail({
      tenantId: params.tenantId,
      to: [customer.email],
      subject: "Complete your pre-coaching form",
      html: message.html,
      text: message.text,
      idempotencyKey: `coaching-prep-request:${session.id}`,
    });

    return "sent";
  }
}
