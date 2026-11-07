import type { StartPilotWorkspaceInput, WorkspaceInviteDto } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export const PILOT_SETUP_REPOSITORY = Symbol("PILOT_SETUP_REPOSITORY");
export interface PilotSetupRepositoryPort {
  lock(key: string, tx: TransactionContext): Promise<void>;
  publishBooking(tenantId: string, workspaceId: string, tx: TransactionContext): Promise<boolean>;
  firstWorkspaces(tenantId: string, userId: string, tx: TransactionContext): Promise<string[]>;
  createInitial(
    tenantId: string,
    userId: string,
    input: StartPilotWorkspaceInput,
    tx: TransactionContext
  ): Promise<string>;
  pendingInvite(
    workspaceId: string,
    email: string,
    now: Date,
    tx: TransactionContext
  ): Promise<WorkspaceInviteDto | null>;
  createInvite(
    input: { workspaceId: string; email: string; userId: string; expiresAt: Date },
    tx: TransactionContext
  ): Promise<WorkspaceInviteDto>;
  invite(
    token: string,
    tx: TransactionContext
  ): Promise<(WorkspaceInviteDto & { tenantId: string }) | null>;
  accept(id: string, now: Date, tx: TransactionContext): Promise<void>;
  member(
    workspaceId: string,
    userId: string,
    tx: TransactionContext
  ): Promise<{ id: string; status: string } | null>;
  addMember(workspaceId: string, userId: string, tx: TransactionContext): Promise<string>;
}
