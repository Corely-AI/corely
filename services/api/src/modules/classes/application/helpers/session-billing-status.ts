import type { ClassBillingMonthStatus } from "@corely/contracts";
import type {
  ClassMonthlyBillingRunEntity,
  ClassSessionEntity,
} from "../../domain/entities/classes.entities";
import type { ClassesRepositoryPort } from "../ports/classes-repository.port";
import { getMonthKeyForInstant } from "./billing-period";

export type SessionWithBillingStatus = ClassSessionEntity & {
  billingMonthStatus: ClassBillingMonthStatus;
};

const DEFAULT_STATUS: ClassBillingMonthStatus = "OPEN";

const resolveRunStatus = (
  run: ClassMonthlyBillingRunEntity | null | undefined
): ClassBillingMonthStatus => {
  return run?.status ?? DEFAULT_STATUS;
};

export const attachBillingStatusToSession = async (
  repo: ClassesRepositoryPort,
  tenantId: string,
  workspaceId: string,
  session: ClassSessionEntity
): Promise<SessionWithBillingStatus> => {
  const month = getMonthKeyForInstant(session.startsAt);
  const run = await repo.findBillingRunByMonth(tenantId, workspaceId, month);
  return {
    ...session,
    billingMonthStatus: resolveRunStatus(run),
  };
};

export const attachBillingStatusToSessions = async (
  repo: ClassesRepositoryPort,
  tenantId: string,
  workspaceId: string,
  sessions: ClassSessionEntity[]
): Promise<SessionWithBillingStatus[]> => {
  if (sessions.length === 0) {
    return [];
  }

  const months = Array.from(
    new Set(sessions.map((session) => getMonthKeyForInstant(session.startsAt)))
  );
  const runs = await repo.listBillingRunsByMonths(tenantId, workspaceId, months);
  const statusByMonth = new Map<string, ClassBillingMonthStatus>();

  months.forEach((month) => statusByMonth.set(month, DEFAULT_STATUS));
  runs.forEach((run) => statusByMonth.set(run.month, run.status));

  return sessions.map((session) => ({
    ...session,
    billingMonthStatus:
      statusByMonth.get(getMonthKeyForInstant(session.startsAt)) ?? DEFAULT_STATUS,
  }));
};
