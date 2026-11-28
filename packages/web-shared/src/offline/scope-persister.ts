import type { PersistedClient, Persister } from "@tanstack/query-persist-client-core";

export function canPersistQuery(query: {
  queryKey: readonly unknown[];
  meta?: Record<string, unknown>;
}) {
  return (
    query.queryKey[0] !== "permissions" &&
    query.queryKey[0] !== "knowledge" &&
    query.meta?.persist !== false
  );
}

function filterSnapshot(client: PersistedClient) {
  const queries = client.clientState.queries.filter(canPersistQuery);
  return queries.length === client.clientState.queries.length
    ? client
    : { ...client, clientState: { ...client.clientState, queries } };
}

/** A completed IndexedDB operation must still belong to the active client scope. */
export function scopePersister(persister: Persister, isCurrentScope: () => boolean): Persister {
  return {
    persistClient: async (client) => {
      if (isCurrentScope()) {
        await persister.persistClient(filterSnapshot(client));
      }
    },
    restoreClient: async () => {
      const client = await persister.restoreClient();
      if (!client || !isCurrentScope()) {
        return undefined;
      }
      const filtered = filterSnapshot(client);
      if (filtered !== client) {
        try {
          await persister.persistClient(filtered);
        } catch {
          // IndexedDB may be unavailable. In-memory restore still excludes private data.
        }
      }
      return isCurrentScope() ? filtered : undefined;
    },
    removeClient: () => persister.removeClient(),
  };
}
