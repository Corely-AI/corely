import { Platform } from "react-native";
import { SqliteOutboxStore } from "@corely/offline-rn";
import { getPosDatabase } from "@/lib/pos-db";
import { type PosOutboxStore, WebOutboxStore } from "@/lib/offline/webOutboxStore";

let outboxStoreInstance: PosOutboxStore | null = null;

export const getOutboxStore = async (): Promise<PosOutboxStore> => {
  if (outboxStoreInstance) {
    return outboxStoreInstance;
  }

  if (Platform.OS === "web") {
    outboxStoreInstance = new WebOutboxStore();
    await outboxStoreInstance.initialize();
    return outboxStoreInstance;
  }

  const db = await getPosDatabase();
  outboxStoreInstance = new SqliteOutboxStore(db as never) as PosOutboxStore;
  await outboxStoreInstance.initialize();
  return outboxStoreInstance;
};
