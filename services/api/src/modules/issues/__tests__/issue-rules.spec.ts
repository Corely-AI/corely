import { describe, expect, it } from "vitest";
import { assertIssueStatusTransition, canTransitionIssueStatus } from "../domain/issue.rules";

describe("issue status transitions", () => {
  it("allows valid transitions", () => {
    expect(canTransitionIssueStatus("NEW", "TRIAGED")).toBe(true);
    expect(canTransitionIssueStatus("TRIAGED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionIssueStatus("RESOLVED", "REOPENED")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionIssueStatus("NEW", "CLOSED")).toBe(false);
    expect(() => assertIssueStatusTransition("NEW", "CLOSED")).toThrowError();
  });
});
