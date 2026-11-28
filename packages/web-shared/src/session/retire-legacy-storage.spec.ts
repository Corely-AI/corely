import { afterEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { retireLegacyStorage } from "./retire-legacy-storage";

const removeDb = () =>
  new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("corely_offline");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
afterEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  await removeDb();
});
function openLegacyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("corely_offline", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("outbox", { keyPath: "commandId" });
      request.result.createObjectStore("queryCache");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
describe("legacy origin retirement", () => {
  it("does not poison an absent database before legacy rollback initializes its schema", async () => {
    await removeDb();
    expect(await retireLegacyStorage()).toBe(true);
    expect((await indexedDB.databases()).some((db) => db.name === "corely_offline")).toBe(false);
    const db = await openLegacyDb();
    try {
      expect(Array.from(db.objectStoreNames)).toEqual(["outbox", "queryCache"]);
    } finally {
      db.close();
    }
  });
  it("retains pending commands, removes private reads and blocks migration", async () => {
    const db = await openLegacyDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["outbox", "queryCache"], "readwrite");
      tx.objectStore("outbox").put({ commandId: "pending", workspaceId: "previous-workspace" });
      tx.objectStore("queryCache").put({ private: "previous account" }, "old-cache");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    localStorage.setItem("accessToken", "old-token");
    sessionStorage.setItem("corely:old-cache", "private");
    expect(await retireLegacyStorage()).toBe(false);
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(sessionStorage.getItem("corely:old-cache")).toBeNull();
    const reopened = await openLegacyDb();
    try {
      const counts = await new Promise<number[]>((resolve) => {
        const tx = reopened.transaction(["outbox", "queryCache"], "readonly");
        const pending = tx.objectStore("outbox").count();
        const cache = tx.objectStore("queryCache").count();
        tx.oncomplete = () => resolve([pending.result, cache.result]);
      });
      expect(counts).toEqual([1, 0]);
    } finally {
      reopened.close();
    }
  });
});
