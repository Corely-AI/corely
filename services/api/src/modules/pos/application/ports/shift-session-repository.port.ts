import type { ShiftSession } from "../../domain/shift-session.aggregate";

export const SHIFT_SESSION_REPOSITORY_PORT = "pos/shift-session-repository";

export interface ShiftSessionRepositoryPort {
  /**
   * Find shift session by ID
   */
  findById(workspaceId: string, sessionId: string): Promise<ShiftSession | null>;

  /**
   * Find current open session for a register
   */
  findOpenByRegister(workspaceId: string, registerId: string): Promise<ShiftSession | null>;

  /**
   * Find all sessions for a workspace
   */
  findByWorkspace(
    workspaceId: string,
    filters?: {
      registerId?: string;
      status?: "OPEN" | "CLOSED";
      fromDate?: Date;
      toDate?: Date;
    }
  ): Promise<ShiftSession[]>;

  /**
   * Save new shift session
   */
  save(session: ShiftSession): Promise<void>;

  /**
   * Update existing shift session
   */
  update(session: ShiftSession): Promise<void>;
}
