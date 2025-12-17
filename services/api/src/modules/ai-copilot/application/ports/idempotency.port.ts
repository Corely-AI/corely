export interface IdempotencyPort {
  checkAndInsert(key: string, tenantId: string): Promise<boolean>;
}
