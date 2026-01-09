export interface IdentityPort {
  /**
   * Placeholder for strong auth / re-auth checks
   */
  ensureReauth?(args: { tenantId: string; userId: string }): Promise<void>;
}
