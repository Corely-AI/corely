export interface SyncLock {
  acquire(workspaceId: string): Promise<boolean>;
  release(workspaceId: string): Promise<void>;
}
