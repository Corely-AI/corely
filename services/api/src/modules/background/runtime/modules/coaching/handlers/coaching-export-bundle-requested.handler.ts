import { Injectable } from "@nestjs/common";
import { DocumentsApplication } from "../../../../../documents/application/documents.application";
import { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";
import { PrismaCoachingEngagementRepositoryAdapter } from "../../../../../coaching-engagements/infrastructure/persist/prisma-coaching-engagement-repository.adapter";
import { CoachingArtifactService } from "../../../../../coaching-engagements/infrastructure/documents/coaching-artifact.service";
import { COACHING_EVENTS, type CoachingExportBundleRequestedEvent } from "@corely/contracts";
import { buildSimplePdf } from "../../../../../coaching-engagements/domain/simple-pdf";

@Injectable()
export class CoachingExportBundleRequestedHandler implements EventHandler {
  readonly eventType = COACHING_EVENTS.EXPORT_BUNDLE_REQUESTED;

  constructor(
    private readonly repo: PrismaCoachingEngagementRepositoryAdapter,
    private readonly documents: DocumentsApplication,
    private readonly artifactService: CoachingArtifactService
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as CoachingExportBundleRequestedEvent;
    const engagement = await this.repo.findEngagementById(
      event.tenantId,
      payload.workspaceId,
      payload.engagementId
    );
    if (!engagement) {
      return;
    }

    const sessions = await this.repo.listSessions(
      event.tenantId,
      payload.workspaceId,
      { engagementId: engagement.id },
      { page: 1, pageSize: 50 }
    );
    const timeline = await this.repo.listTimeline(event.tenantId, engagement.id);
    const linked = await this.documents.listLinkedDocuments.execute(
      { entityType: "COACHING_ENGAGEMENT", entityId: engagement.id },
      { tenantId: event.tenantId, workspaceId: payload.workspaceId }
    );

    const lines = [
      `Coaching export bundle for engagement ${engagement.id}`,
      `Status: ${engagement.status}`,
      `Payment: ${engagement.paymentStatus}`,
      `Contract: ${engagement.contractStatus}`,
      `Sessions: ${sessions.items.length}`,
      ...sessions.items.map(
        (session) => `${session.id} ${session.status} ${session.startAt.toISOString()}`
      ),
      ...timeline.map((entry) => `${entry.occurredAt.toISOString()} ${entry.eventType}`),
    ];

    if ("value" in linked) {
      lines.push(...linked.value.items.map((item) => `Artifact: ${item.title ?? item.type}`));
    }

    const artifact = await this.artifactService.createPdfArtifact({
      tenantId: event.tenantId,
      title: `Coaching Export Bundle ${engagement.id}`,
      objectPath: `engagements/${engagement.id}/exports`,
      links: [
        { entityType: "COACHING_ENGAGEMENT", entityId: engagement.id },
        { entityType: "PARTY", entityId: engagement.clientPartyId },
      ],
      bytes: buildSimplePdf(lines),
    });

    const bundle = await this.repo.findLatestArtifactBundle(event.tenantId, engagement.id);
    if (!bundle) {
      return;
    }
    bundle.status = "ready";
    bundle.documentId = artifact.documentId;
    bundle.completedAt = new Date();
    bundle.updatedAt = new Date();
    await this.repo.updateArtifactBundle(bundle);
  }
}
