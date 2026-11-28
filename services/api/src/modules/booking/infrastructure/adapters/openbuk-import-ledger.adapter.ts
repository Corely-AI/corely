import { Injectable } from "@nestjs/common";
import { PrismaExtKvAdapter } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { z } from "zod";
import type {
  BookingImportLedger,
  BookingImportReceipt,
} from "../../application/ports/openbuk-import-ledger.port";
import type { StudioScope } from "../../application/ports/openbuk-repository.port";

const receiptSchema = z.object({
  fingerprint: z.string(),
  bookingId: z.string().nullable(),
});

@Injectable()
export class OpenBukImportLedgerAdapter implements BookingImportLedger {
  constructor(private readonly kv: PrismaExtKvAdapter) {}
  private key(scope: StudioScope, identity: string) {
    return {
      tenantId: scope.tenantId,
      moduleId: "booking",
      scope: "workspace:" + scope.workspaceId + ":openbuk-import",
      key: identity,
    };
  }
  async get(scope: StudioScope, identity: string, tx: TransactionContext) {
    const entry = await this.kv.get(this.key(scope, identity), tx);
    if (!entry) {
      return null;
    }
    const { fingerprint, bookingId } = receiptSchema.parse(entry.value);
    return { fingerprint, bookingId };
  }
  async save(
    scope: StudioScope,
    identity: string,
    receipt: BookingImportReceipt,
    tx: TransactionContext
  ) {
    await this.kv.set({ ...this.key(scope, identity), value: receipt }, tx);
  }
}
