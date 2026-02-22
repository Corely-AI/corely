import { ForbiddenError } from "@corely/domain";
import type { UseCaseContext } from "@corely/kernel";
import { assertCan, assertAuthenticated } from "@/shared/policies/assert-can";

export const assertCanClasses = (ctx: UseCaseContext, permission: string) => {
  assertCan(ctx);
  assertAuthenticated(ctx);

  const permissions = (ctx.metadata as any)?.permissions;
  if (!permissions) {
    return;
  }
  if (Array.isArray(permissions) && permissions.length > 0) {
    if (permissions.includes("*") || permissions.includes(permission)) {
      return;
    }
    throw new ForbiddenError("Missing permission", "Classes:PermissionDenied");
  }
};

const assertCanAnyClasses = (ctx: UseCaseContext, permissions: string[]) => {
  assertCan(ctx);
  assertAuthenticated(ctx);

  const granted = (ctx.metadata as any)?.permissions;
  if (!granted) {
    return;
  }
  if (Array.isArray(granted) && granted.length > 0) {
    if (granted.includes("*") || permissions.some((permission) => granted.includes(permission))) {
      return;
    }
    throw new ForbiddenError("Missing permission", "Classes:PermissionDenied");
  }
};

export const assertCanCohortManage = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.cohort.manage");
export const assertCanCohortTeamManage = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.cohort.team.manage");
export const assertCanCohortBillingManage = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.cohort.billing.manage");
export const assertCanCohortOutcomesManage = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.cohort.outcomes.manage");
export const assertCanCohortResourcesManage = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.cohort.resources.manage");
export const assertCanSessionManage = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.session.manage");
export const assertCanEnrollmentManage = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.enrollment.manage");
export const assertCanTeacherDashboardView = (ctx: UseCaseContext) =>
  assertCanClasses(ctx, "classes.teacher.dashboard.view");
export const assertCanProgramsView = (ctx: UseCaseContext) =>
  assertCanAnyClasses(ctx, ["classes.programs.view", "classes.cohort.manage"]);
export const assertCanProgramsManage = (ctx: UseCaseContext) =>
  assertCanAnyClasses(ctx, ["classes.programs.manage", "classes.cohort.manage"]);
