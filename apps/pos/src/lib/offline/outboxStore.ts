import { SqliteOutboxStore } from "@corely/offline-rn";
import { getPosDatabase } from "@/lib/pos-db";

let outboxStoreInstance: SqliteOutboxStore | null = null;

export const getOutboxStore = async (): Promise<SqliteOutboxStore> => {
  if (outboxStoreInstance) {
    return outboxStoreInstance;
  }
  const db = await getPosDatabase();
  outboxStoreInstance = new SqliteOutboxStore(db as never);
  await outboxStoreInstance.initialize();
  return outboxStoreInstance;
};
