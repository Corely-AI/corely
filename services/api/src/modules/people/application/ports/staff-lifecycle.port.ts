import type { TransactionContext, UseCaseContext } from "@corely/kernel";
import type {
  EmployeeTask,
  StaffTaskFollowup,
  StaffWorkspaceAccess,
  StaffLifecycleRecord,
} from "@corely/contracts";
import type { StaffScope } from "./staff-repository.port";
export interface StaffTasksPort {
  transaction<T>(scope: StaffScope, work: (tx: TransactionContext) => Promise<T>): Promise<T>;
  checklist(
    ctx: UseCaseContext,
    staffId: string,
    taskId: string | null,
    tx: TransactionContext
  ): Promise<{ available: boolean; task: EmployeeTask | null }>;
  followup(
    ctx: UseCaseContext,
    staffId: string,
    tx: TransactionContext
  ): Promise<StaffTaskFollowup>;
  approve(
    ctx: UseCaseContext,
    staffId: string,
    body: unknown,
    tx: TransactionContext
  ): Promise<EmployeeTask>;
}
export interface StaffWorkspaceAccessPort {
  inspect(
    scope: StaffScope,
    actorId: string,
    targetId: string | null,
    tx: TransactionContext
  ): Promise<StaffWorkspaceAccess>;
  assertCanDisable(
    scope: StaffScope,
    targetId: string | null,
    ctx: UseCaseContext,
    tx: TransactionContext
  ): Promise<void>;
  disable(
    scope: StaffScope,
    targetId: string | null,
    ctx: UseCaseContext,
    tx: TransactionContext
  ): Promise<void>;
}
export interface StaffLifecycleRepository {
  get(scope: StaffScope, staffId: string, tx: TransactionContext): Promise<StaffLifecycleRecord>;
  save(
    scope: StaffScope,
    staffId: string,
    record: StaffLifecycleRecord,
    tx: TransactionContext
  ): Promise<void>;
  replay(
    scope: StaffScope,
    key: string,
    tx: TransactionContext
  ): Promise<{ fingerprint: string; staffId: string } | null>;
  saveReplay(
    scope: StaffScope,
    key: string,
    value: { fingerprint: string; staffId: string },
    tx: TransactionContext
  ): Promise<void>;
}
export const STAFF_TASKS = Symbol("STAFF_TASKS");
export const STAFF_WORKSPACE_ACCESS = Symbol("STAFF_WORKSPACE_ACCESS");
export const STAFF_LIFECYCLE_REPOSITORY = Symbol("STAFF_LIFECYCLE_REPOSITORY");
