import type { PersistedClient, Persister } from "@tanstack/query-persist-client-core";
import { getDb, QUERY_CACHE_STORE } from "../idb";

export interface IndexedDbPersisterOptions {
  key: string;
}

export function createIndexedDbPersister(options: IndexedDbPersisterOptions): Persister {
  const { key } = options;

  return {
    persistClient: async (client: PersistedClient) => {
      const db = await getDb();
      const tx = db.transaction(QUERY_CACHE_STORE, "readwrite");
      await tx.store.put(client, key);
      await tx.done;
    },
    restoreClient: async (): Promise<PersistedClient | undefined> => {
      const db = await getDb();
      const tx = db.transaction(QUERY_CACHE_STORE, "readonly");
      const stored = await tx.store.get(key);
      await tx.done;
      return stored ?? undefined;
    },
    removeClient: async (): Promise<void> => {
      const db = await getDb();
      const tx = db.transaction(QUERY_CACHE_STORE, "readwrite");
      await tx.store.delete(key);
      await tx.done;
    },
  };
}
