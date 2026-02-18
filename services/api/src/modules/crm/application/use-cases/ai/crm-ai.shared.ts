import { ValidationError } from "@corely/kernel";
import type { TimelineItem } from "../../ports/activity-repository.port";

const JSON_BLOCK_REGEX = /```json\s*([\s\S]*?)```/i;

export const CRM_AI_SNAPSHOT_VERSION = "v1";
export const CRM_AI_INSIGHTS_TTL_MS = 30 * 60 * 1000;

export const resolveWorkspaceId = (tenantId: string, workspaceId?: string): string =>
  workspaceId && workspaceId.length > 0 ? workspaceId : tenantId;

export const normalizeLanguage = (language?: string): string => {
  if (!language) {
    return "en";
  }
  const normalized = language.trim().toLowerCase();
  if (normalized.startsWith("de")) {
    return "de";
  }
  if (normalized.startsWith("vi")) {
    return "vi";
  }
  return "en";
};

export const buildTimelineContext = (timeline: TimelineItem[], limit = 20): string => {
  if (!timeline.length) {
    return "No activity recorded yet.";
  }

  return timeline
    .slice(0, limit)
    .map((item, index) => {
      const timestamp = item.timestamp.toISOString();
      const details = [item.subject, item.body ?? ""].filter(Boolean).join(" | ");
      const channel = item.channelKey ? ` channel=${item.channelKey}` : "";
      const direction = item.direction ? ` direction=${item.direction}` : "";
      return `${index + 1}. [${timestamp}] ${item.type}${channel}${direction}: ${details}`;
    })
    .join("\n");
};

export const parseAiJson = (raw: string): Record<string, unknown> => {
  const candidate = raw.trim();
  const blockMatch = candidate.match(JSON_BLOCK_REGEX);
  const rawJson = blockMatch?.[1]?.trim() ?? candidate;

  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const firstBrace = rawJson.indexOf("{");
    const lastBrace = rawJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = rawJson.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(sliced);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    }
  }

  throw new ValidationError("AI response is not valid JSON");
};
