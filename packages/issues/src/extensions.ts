import type { IssuePriority } from "@corely/contracts";

export const ISSUE_REPORT_POLICY_REJECTED = "Issues:ReportPolicyRejected";

export interface IssueReportFacts {
  readonly priority: IssuePriority;
  readonly hasDescription: boolean;
}

export interface IssueReportPolicy {
  readonly tenantId: string;
  readonly check: (facts: IssueReportFacts) => string | undefined;
}

export function issueReportRejection(
  policies: readonly IssueReportPolicy[],
  tenantId: string,
  facts: IssueReportFacts
): string | undefined {
  for (const policy of policies) {
    if (policy.tenantId === tenantId) {
      const message = policy.check(facts);
      if (message) {return message;}
    }
  }
}
