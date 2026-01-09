import { describe, it, expect } from "vitest";
import { LocalStorageSyncLock } from "../locks/localStorageSyncLock";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("LocalStorageSyncLock", () => {
  it("prevents concurrent acquisition within TTL and expires after TTL", async () => {
    const storage = new MemoryStorage();
    let now = Date.now();
    const lock = new LocalStorageSyncLock({
      ttlMs: 100,
      storage,
      clock: { now: () => new Date(now) },
      keyPrefix: "test-lock",
    });

    const first = await lock.acquire("ws-1");
    expect(first).toBe(true);

    const second = await lock.acquire("ws-1");
    expect(second).toBe(false);

    now += 150; // advance past TTL
    const third = await lock.acquire("ws-1");
    expect(third).toBe(true);
  });
});
