/** Explicit old-origin migration only. Never call the destructive legacy logout helper:
 * it clears the outbox, whose records do not prove an account owner.
 */
export async function retireLegacyStorage(): Promise<boolean> {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
    for (const key of keys) {
      if (
        key &&
        (["accessToken", "refreshToken", "activeWorkspaceId", "corely-active-workspace"].includes(
          key
        ) ||
          /^(corely[:.-]|copilot:|Corely One ERP-)/.test(key))
      ) {
        storage.removeItem(key);
      }
    }
  }
  if (typeof indexedDB === "undefined") {
    return true;
  }
  return new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open("corely_offline");
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other Corely tabs before migration"));
    request.onupgradeneeded = () => {
      /* No stores are created for a new session origin. */
    };
    request.onsuccess = () => {
      const db = request.result;
      const stores = ["outbox", "queryCache"].filter((name) => db.objectStoreNames.contains(name));
      if (!stores.length) {
        db.close();
        resolve(true);
        return;
      }
      const tx = db.transaction(stores, "readwrite");
      let pending = 0;
      if (stores.includes("outbox")) {
        // Preserve every command, including failed/conflicted/in-flight ones. No automatic
        // ownership inference, replay, export to a new account, or silent disposal.
        tx.objectStore("outbox").count().onsuccess = (event) => {
          pending = (event.target as IDBRequest<number>).result;
        };
      }
      if (stores.includes("queryCache")) {
        tx.objectStore("queryCache").clear();
      }
      tx.oncomplete = () => {
        db.close();
        resolve(pending === 0);
      };
      tx.onerror = tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("Migration failed"));
      };
    };
  });
}
