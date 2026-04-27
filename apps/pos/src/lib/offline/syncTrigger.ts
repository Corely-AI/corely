type SyncRequest = {
  reason: string;
};

type SyncRequestListener = (request: SyncRequest) => void | Promise<void>;

const listeners = new Set<SyncRequestListener>();

export function requestSyncFlush(reason: string): void {
  const request: SyncRequest = { reason };
  for (const listener of listeners) {
    void listener(request);
  }
}

export function subscribeSyncFlush(listener: SyncRequestListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
