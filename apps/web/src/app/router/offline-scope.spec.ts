import { expect, it, vi } from "vitest";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  type PersistedClient,
  type Persister,
} from "@tanstack/query-persist-client-core";
import { scopePersister } from "@corely/web-shared/offline/scope-persister";

const snapshot = (): PersistedClient => {
  const client = new QueryClient();
  client.setQueryData(["assistant", "thread"], "private workspace A history");
  return { timestamp: Date.now(), buster: "test", clientState: dehydrate(client) };
};

it("does not hydrate an old workspace after a delayed restore completes", async () => {
  let currentScope = "workspace-a";
  let finish: (client: PersistedClient) => void = () => {
    throw new Error("Restore not started");
  };
  const original: Persister = {
    restoreClient: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    persistClient: vi.fn(),
    removeClient: vi.fn(),
  };
  const client = new QueryClient();
  const restoring = persistQueryClientRestore({
    queryClient: client,
    buster: "test",
    persister: scopePersister(original, () => currentScope === "workspace-a"),
  });
  currentScope = "workspace-b";
  client.clear();
  finish(snapshot());
  await restoring;
  expect(client.getQueryData(["assistant", "thread"])).toBeUndefined();
  client.clear();
});

it("preserves offline restoration for the current scope", async () => {
  const original: Persister = {
    restoreClient: async () => snapshot(),
    persistClient: vi.fn(),
    removeClient: vi.fn(),
  };
  const client = new QueryClient();
  await persistQueryClientRestore({
    queryClient: client,
    buster: "test",
    persister: scopePersister(original, () => true),
  });
  expect(client.getQueryData(["assistant", "thread"])).toBe("private workspace A history");
  client.clear();
});

it("does not persist the new scope's cache through an obsolete subscription", async () => {
  const persist = vi.fn();
  const original: Persister = {
    restoreClient: vi.fn(),
    persistClient: persist,
    removeClient: vi.fn(),
  };
  await scopePersister(original, () => false).persistClient(snapshot());
  expect(persist).not.toHaveBeenCalled();
});
