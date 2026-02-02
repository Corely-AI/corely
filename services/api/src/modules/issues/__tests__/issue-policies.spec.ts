import { describe, expect, it } from "vitest";
import { assertReporterCanResolve, assertLeadCanTransition } from "../policies/issues.policies";
import type { Issue } from "../domain/issue.types";

const baseIssue: Issue = {
  id: "issue-1",
  tenantId: "tenant-1",
  title: "Broken",
  description: null,
  status: "NEW",
  priority: "MEDIUM",
  siteType: "FIELD",
  createdAt: new Date(),
  updatedAt: new Date(),
  reporterUserId: "user-1",
  assigneeUserId: "user-2",
  resolvedAt: null,
  resolvedByUserId: null,
  closedAt: null,
};

describe("issue policies", () => {
  it("allows reporter to resolve", () => {
    expect(() =>
      assertReporterCanResolve(baseIssue, { tenantId: "tenant-1", userId: "user-1" })
    ).not.toThrow();
  });

  it("blocks non-reporter without role", () => {
    expect(() =>
      assertReporterCanResolve(baseIssue, { tenantId: "tenant-1", userId: "user-3" })
    ).toThrowError();
  });

  it("allows lead to change status", () => {
    expect(() =>
      assertLeadCanTransition(baseIssue, {
        tenantId: "tenant-1",
        userId: "user-3",
        roles: ["lead"],
      })
    ).not.toThrow();
  });
});
