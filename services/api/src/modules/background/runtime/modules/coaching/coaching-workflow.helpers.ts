import { COACHING_EVENTS } from "@corely/contracts";
import { resolveLocalizedText } from "../../../../coaching-engagements/domain/coaching-localization";

export const buildAbsoluteUrl = (baseUrl: string, path: string) =>
  new URL(path, baseUrl).toString();

export const buildEmailMessage = (params: {
  heading: string;
  body: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}) => {
  const html = [
    `<h2>${params.heading}</h2>`,
    ...params.body.map((line) => `<p>${line}</p>`),
    params.ctaLabel && params.ctaUrl
      ? `<p><a href="${params.ctaUrl}">${params.ctaLabel}</a></p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return {
    html,
    text: [
      ...params.body,
      params.ctaLabel && params.ctaUrl ? `${params.ctaLabel}: ${params.ctaUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
};

export const buildLocalizedOfferTitle = (engagement: {
  locale: string;
  offer: { title: Record<string, string>; localeDefault: string };
}) =>
  resolveLocalizedText(engagement.offer.title, engagement.locale, engagement.offer.localeDefault);

export const maybeIssueMeetingLink = async (params: {
  baseUrl: string;
  repo: {
    updateSession(session: any): Promise<any>;
    updateEngagement(engagement: any): Promise<any>;
    createTimelineEntry(entry: any): Promise<any>;
  };
  outbox: { enqueue(event: any): Promise<void> };
  idGenerator: { newId(): string };
  clock: { now(): Date };
  tenantId: string;
  workspaceId: string;
  correlationId?: string | null;
  engagement: any;
  session: any;
}) => {
  if (params.session.meetingLink) {
    return params.session.meetingLink;
  }

  const now = params.clock.now();
  const meetingLink = buildAbsoluteUrl(
    params.baseUrl,
    `/coaching/public/session/${params.session.id}/join`
  );

  params.session.meetingProvider = params.session.meetingProvider ?? "corely-meet";
  params.session.meetingLink = meetingLink;
  params.session.meetingIssuedAt = now;
  params.session.updatedAt = now;
  params.engagement.status = "ready";
  params.engagement.updatedAt = now;

  await params.repo.updateSession(params.session);
  await params.repo.updateEngagement(params.engagement);
  await params.repo.createTimelineEntry({
    id: params.idGenerator.newId(),
    tenantId: params.tenantId,
    workspaceId: params.workspaceId,
    engagementId: params.engagement.id,
    eventType: COACHING_EVENTS.MEETING_LINK_ISSUED,
    stateFrom: null,
    stateTo: "ready",
    actorUserId: null,
    metadata: { sessionId: params.session.id, meetingLink },
    occurredAt: now,
    createdAt: now,
  });
  await params.outbox.enqueue({
    tenantId: params.tenantId,
    eventType: COACHING_EVENTS.MEETING_LINK_ISSUED,
    correlationId: params.correlationId ?? undefined,
    payload: {
      workspaceId: params.workspaceId,
      engagementId: params.engagement.id,
      sessionId: params.session.id,
      meetingLink,
    },
  });

  return meetingLink;
};
