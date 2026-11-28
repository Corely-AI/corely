import { Injectable } from "@nestjs/common";
import { PrismaExtKvAdapter } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import type {
  GuestCredential,
  OpenBukGuestAccessStore,
} from "../../application/ports/openbuk-guest-access.port";
import type { StudioScope } from "../../application/ports/openbuk-repository.port";

const tokenKey = (scope: StudioScope, digest: string) => ({
  tenantId: scope.tenantId,
  moduleId: "booking",
  scope: `workspace:${scope.workspaceId}`,
  key: `openbuk-guest-token:${digest}`,
});

@Injectable()
export class OpenBukGuestAccessAdapter implements OpenBukGuestAccessStore {
  constructor(private readonly kv: PrismaExtKvAdapter) {}

  async find(scope: StudioScope, digest: string, tx?: TransactionContext) {
    const entry = await this.kv.get(tokenKey(scope, digest), tx);
    return (entry?.value as GuestCredential | undefined) ?? null;
  }

  async save(
    scope: StudioScope,
    digest: string,
    credential: GuestCredential,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...tokenKey(scope, digest), value: credential }, tx);
  }
}
