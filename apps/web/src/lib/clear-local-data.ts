const OFFLINE_DB_NAME = "corely_offline";
const OFFLINE_STORE_NAMES = ["outbox", "queryCache"] as const;

const STORAGE_KEY_PREFIXES = [
  "corely:",
  "corely.",
  "corely-",
  "copilot:",
  "Corely One ERP-",
] as const;

const STORAGE_EXACT_KEYS = new Set<string>([
  "accessToken",
  "refreshToken",
  "corely-active-workspace",
  "corely-remember-login",
  "cms-reader-session",
  "invoice-number-seq",
]);

const shouldRemoveStorageKey = (key: string): boolean =>
  STORAGE_EXACT_KEYS.has(key) || STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

const clearSessionStorage = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.clear();
  } catch {
    // Ignore storage errors during logout cleanup.
  }
};

const clearLocalStorage = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      if (shouldRemoveStorageKey(key)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage errors during logout cleanup.
  }
};

const clearOfflineIndexedDbStores = async (): Promise<void> => {
  if (typeof indexedDB === "undefined") {
    return;
  }

  await new Promise<void>((resolve) => {
    let createdDbInThisFlow = false;
    const openRequest = indexedDB.open(OFFLINE_DB_NAME);

    openRequest.onupgradeneeded = () => {
      createdDbInThisFlow = true;
    };

    openRequest.onerror = () => {
      resolve();
    };

    openRequest.onsuccess = () => {
      const db = openRequest.result;

      if (createdDbInThisFlow) {
        db.close();
        const deleteRequest = indexedDB.deleteDatabase(OFFLINE_DB_NAME);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve();
        deleteRequest.onblocked = () => resolve();
        return;
      }

      const existingStores = OFFLINE_STORE_NAMES.filter((storeName) =>
        db.objectStoreNames.contains(storeName)
      );

      if (existingStores.length === 0) {
        db.close();
        resolve();
        return;
      }

      const tx = db.transaction(existingStores, "readwrite");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };

      for (const storeName of existingStores) {
        tx.objectStore(storeName).clear();
      }
    };
  });
};

export const clearClientLocalData = async (): Promise<void> => {
  clearSessionStorage();
  clearLocalStorage();
  await clearOfflineIndexedDbStores();
};
