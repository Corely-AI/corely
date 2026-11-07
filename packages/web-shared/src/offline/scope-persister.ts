import type { Persister } from "@tanstack/query-persist-client-core";

/** A completed IndexedDB operation must still belong to the active client scope. */
export function scopePersister(persister: Persister, isCurrentScope: () => boolean): Persister {
  return {
    persistClient: async (client) => {
      if (isCurrentScope()) {
        await persister.persistClient(client);
      }
    },
    restoreClient: async () => {
      const client = await persister.restoreClient();
      return isCurrentScope() ? client : undefined;
    },
    removeClient: () => persister.removeClient(),
  };
}
