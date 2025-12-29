import type { Register } from "../../domain/register.aggregate";

export const REGISTER_REPOSITORY_PORT = Symbol("REGISTER_REPOSITORY_PORT");

export interface RegisterRepositoryPort {
  /**
   * Find register by ID
   */
  findById(workspaceId: string, registerId: string): Promise<Register | null>;

  /**
   * Find all registers for a workspace
   */
  findByWorkspace(workspaceId: string, status?: "ACTIVE" | "INACTIVE"): Promise<Register[]>;

  /**
   * Check if register name exists in workspace
   */
  existsByName(workspaceId: string, name: string): Promise<boolean>;

  /**
   * Save new register
   */
  save(register: Register): Promise<void>;

  /**
   * Update existing register
   */
  update(register: Register): Promise<void>;
}
