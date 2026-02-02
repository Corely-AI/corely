import { ForbiddenError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import type { Issue } from "../domain/issue.types";

const PRIVILEGED_ROLES = new Set(["admin", "manager", "lead", "technical_lead"]);

const hasPrivilegedRole = (roles?: string[]) =>
  Boolean(roles?.some((role) => PRIVILEGED_ROLES.has(role)));

export const assertReporterCanResolve = (issue: Issue, ctx: UseCaseContext) => {
  if (!ctx.userId) {
    throw new ForbiddenError("User context is required", "Issues:Forbidden");
  }
  if (issue.reporterUserId && issue.reporterUserId === ctx.userId) {
    return;
  }
  if (hasPrivilegedRole(ctx.roles)) {
    return;
  }
  throw new ForbiddenError("Reporter cannot resolve this issue", "Issues:ResolveForbidden");
};

export const assertLeadCanTransition = (issue: Issue, ctx: UseCaseContext) => {
  if (!ctx.userId) {
    throw new ForbiddenError("User context is required", "Issues:Forbidden");
  }
  if (hasPrivilegedRole(ctx.roles)) {
    return;
  }
  if (issue.assigneeUserId && issue.assigneeUserId === ctx.userId) {
    return;
  }
  throw new ForbiddenError("User cannot change issue status", "Issues:StatusForbidden");
};

export const assertLeadCanAssign = (ctx: UseCaseContext) => {
  if (!ctx.userId) {
    throw new ForbiddenError("User context is required", "Issues:Forbidden");
  }
  if (!hasPrivilegedRole(ctx.roles)) {
    throw new ForbiddenError("User cannot assign issue owner", "Issues:AssignForbidden");
  }
};
