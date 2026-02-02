import { ConflictError } from "@corely/domain";
import type { IssueStatus } from "./issue.types";

const ISSUE_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  NEW: ["TRIAGED", "IN_PROGRESS", "WAITING"],
  TRIAGED: ["IN_PROGRESS", "WAITING", "RESOLVED"],
  IN_PROGRESS: ["WAITING", "RESOLVED"],
  WAITING: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["TRIAGED", "IN_PROGRESS", "WAITING"],
};

export const canTransitionIssueStatus = (from: IssueStatus, to: IssueStatus): boolean => {
  return ISSUE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
};

export const assertIssueStatusTransition = (from: IssueStatus, to: IssueStatus) => {
  if (from === to) {
    return;
  }
  if (!canTransitionIssueStatus(from, to)) {
    throw new ConflictError(`Cannot transition issue from ${from} to ${to}`, {
      code: "Issues:InvalidStatusTransition",
    });
  }
};
