import type { IssuePriority } from "@corely/contracts";
import type { ComponentType } from "react";

export type IssueReportGuidance = ComponentType<{ priority: IssuePriority }>;

export function IssueReportGuidanceSlot({
  priority,
  Guidance,
}: {
  priority: IssuePriority;
  Guidance?: IssueReportGuidance;
}) {
  return Guidance ? <Guidance priority={priority} /> : null;
}
