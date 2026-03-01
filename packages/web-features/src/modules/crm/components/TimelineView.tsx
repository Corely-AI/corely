import type { FC } from "react";
import type { ActivityType, TimelineItem } from "@corely/contracts";
import { ActivityTypeIcon } from "./ActivityTypeIcon";
import { ArrowRight } from "lucide-react";
import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Markdown } from "@corely/web-shared/shared/components/Markdown";

interface TimelineViewProps {
  items: TimelineItem[];
}

const looksLikeHtml = (value: string) => /<([a-z][a-z0-9]*)\b[^>]*>[\s\S]*<\/\1>/i.test(value);

export const TimelineView: FC<TimelineViewProps> = ({ items }) => {
  const { t, i18n } = useTranslation();
  if (items.length === 0) {
    return <div className="text-center text-muted-foreground py-8">{t("crm.timeline.empty")}</div>;
  }

  const grouped = items.reduce<Record<string, TimelineItem[]>>((acc, item) => {
    const dateKey = new Date(item.timestamp).toISOString().slice(0, 10);
    acc[dateKey] = acc[dateKey] ? [...acc[dateKey], item] : [item];
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="space-y-6" data-testid="crm-timeline">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {new Date(date).toLocaleDateString(i18n.language, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="space-y-3">
            {grouped[date].map((item) => {
              const isStageChange = item.type === "STAGE_TRANSITION";
              const isActivity = item.type === "ACTIVITY";
              const communicationStatus =
                item.status ??
                (typeof item.metadata?.communicationStatus === "string"
                  ? item.metadata.communicationStatus
                  : undefined);
              const activityType =
                isActivity && item.metadata && "activityType" in item.metadata
                  ? (item.metadata.activityType as ActivityType | undefined)
                  : undefined;
              const isCommunication =
                item.type === "MESSAGE" || (isActivity && activityType === "COMMUNICATION");
              const direction =
                (typeof item.direction === "string"
                  ? item.direction
                  : typeof item.metadata?.direction === "string"
                    ? item.metadata.direction
                    : undefined
                )?.toUpperCase() ?? "OUTBOUND";
              const isOutbound = direction === "OUTBOUND";
              return (
                <div
                  key={item.id}
                  className="flex gap-4 pb-3 border-b last:border-0"
                  data-testid={`crm-timeline-item-${item.id}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {isActivity && activityType ? (
                      <ActivityTypeIcon type={activityType} className="w-4 h-4" />
                    ) : isStageChange ? (
                      <ArrowRight className="w-4 h-4" />
                    ) : item.type === "MESSAGE" ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs">•</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium text-sm">
                          {isCommunication && item.channelKey
                            ? t("crm.timeline.channelMessage", { channel: item.channelKey })
                            : item.subject || t("crm.activity.types.communication")}
                        </h4>
                        {communicationStatus ? (
                          <span className="inline-flex mt-1 text-[11px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {t(
                              `crm.activity.communication${communicationStatus.charAt(0).toUpperCase() + communicationStatus.slice(1).toLowerCase()}`
                            )}
                          </span>
                        ) : null}
                        {item.body &&
                          (isCommunication ? (
                            <div
                              className={`mt-2 flex ${isOutbound ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
                                  isOutbound
                                    ? "bg-emerald-100 text-emerald-950 rounded-br-md"
                                    : "bg-slate-100 text-slate-900 rounded-bl-md"
                                }`}
                              >
                                {looksLikeHtml(item.body) ? (
                                  <div
                                    className="prose prose-sm max-w-none dark:prose-invert"
                                    dangerouslySetInnerHTML={{ __html: item.body }}
                                  />
                                ) : (
                                  <Markdown
                                    content={item.body}
                                    className="text-sm leading-relaxed"
                                  />
                                )}
                              </div>
                            </div>
                          ) : activityType === "NOTE" ? (
                            <div className="mt-1 rounded-md border bg-muted/20 px-3 py-2">
                              {looksLikeHtml(item.body) ? (
                                <div
                                  className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
                                  dangerouslySetInnerHTML={{ __html: item.body }}
                                />
                              ) : (
                                <Markdown
                                  content={item.body}
                                  className="text-sm text-muted-foreground"
                                />
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {item.body}
                            </p>
                          ))}
                        {isActivity && item.metadata && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {item.metadata.dueAt && (
                              <p className="text-xs text-muted-foreground mr-2">
                                {t("crm.timeline.duePrefix")}
                                {new Date(item.metadata.dueAt as string).toLocaleDateString(
                                  i18n.language
                                )}
                              </p>
                            )}
                            {item.metadata.outcome && (
                              <span className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                {t(
                                  `crm.activity.outcomes.${String(item.metadata.outcome)
                                    .toLowerCase()
                                    .replace(/\s+/g, "")}`
                                )}
                              </span>
                            )}
                            {item.metadata.durationSeconds && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                ⏱ {Math.round(Number(item.metadata.durationSeconds) / 60)}m
                              </span>
                            )}
                            {item.metadata.location && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                📍 {String(item.metadata.location)}
                              </span>
                            )}
                          </div>
                        )}
                        {isStageChange && item.metadata?.toStageId && (
                          <p className="text-xs text-muted-foreground">
                            {t("crm.timeline.stage", {
                              stage: String(item.metadata.toStageId),
                            })}
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString(i18n.language, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
