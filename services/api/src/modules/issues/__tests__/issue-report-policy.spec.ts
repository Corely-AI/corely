import { describe, expect, it, vi } from "vitest";
import { issueReportRejection, type IssueReportFacts } from "@corely/issues/extensions";

describe("self-hosted issue reporting", () => {
  it("passes only the priority and description presence to rules for the owning tenant", () => {
    const check = vi.fn(({ priority, hasDescription }: IssueReportFacts) =>
      priority === "URGENT" && !hasDescription ? "Describe the urgent issue." : undefined
    );
    const policies = [{ tenantId: "acme", check }];
    expect(
      issueReportRejection(policies, "acme", { priority: "URGENT", hasDescription: false })
    ).toBe("Describe the urgent issue.");
    expect(
      issueReportRejection(policies, "other", { priority: "URGENT", hasDescription: false })
    ).toBeUndefined();
    expect(
      issueReportRejection(policies, "acme", { priority: "MEDIUM", hasDescription: false })
    ).toBeUndefined();
    expect(
      issueReportRejection(policies, "acme", { priority: "URGENT", hasDescription: true })
    ).toBeUndefined();
    expect(check).toHaveBeenCalledTimes(3);
  });
});
