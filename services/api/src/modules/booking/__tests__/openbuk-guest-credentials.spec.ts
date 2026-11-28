import { describe, expect, it } from "vitest";
import type { TransactionContext } from "@corely/kernel";
import type {
  GuestCredential,
  OpenBukGuestAccessStore,
} from "../application/ports/openbuk-guest-access.port";
import { OpenBukGuestCredentials } from "../application/use-cases/openbuk-guest-credentials";

describe("OpenBuk guest credentials", () => {
  it("stores only a digest, scopes a link to its studio and expires at the deadline", async () => {
    const data = new Map<string, GuestCredential>();
    const store: OpenBukGuestAccessStore = {
      find: async ({ tenantId, workspaceId }, digest) =>
        data.get(`${tenantId}:${workspaceId}:${digest}`) ?? null,
      save: async ({ tenantId, workspaceId }, digest, credential) => {
        data.set(`${tenantId}:${workspaceId}:${digest}`, credential);
      },
    };
    const credentials = new OpenBukGuestCredentials(
      store,
      "synthetic-local-booking-token-test-secret-2026"
    );
    const scope = { tenantId: "test-tenant", workspaceId: "studio-a" };
    const tx = {} as TransactionContext;
    const now = new Date("2026-11-30T08:00:00.000Z");
    const start = "2026-11-30T10:00:00.000Z";
    const access = await credentials.issue(scope, "synthetic-booking", start, now, tx);
    expect(access?.expiresAt).toBe(start);
    expect([...data.keys()][0]).toMatch(/^test-tenant:studio-a:[a-f0-9]{64}$/);
    expect(JSON.stringify([...data])).not.toContain(access?.token);
    await expect(credentials.replay(scope, "synthetic-booking", now)).resolves.toEqual(access);
    await expect(
      credentials.find({ ...scope, workspaceId: "studio-b" }, access!.token, now)
    ).resolves.toBeNull();
    await expect(credentials.find(scope, access!.token, new Date(start))).resolves.toBeNull();
    const active = await credentials.find(scope, access!.token, now, tx);
    await credentials.revoke(scope, active!.digest, active!.credential, now, tx);
    await expect(credentials.replay(scope, "synthetic-booking", now)).resolves.toBeUndefined();
  });
});
