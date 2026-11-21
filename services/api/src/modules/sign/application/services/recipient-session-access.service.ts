import { ForbiddenException, Injectable } from "@nestjs/common";
import { type TransactionContext } from "@corely/kernel";
import { TenantEntitlementService } from "../../../platform/public";
import { requestRefOf } from "../../domain/ceremony";
import { effectiveCeremonyStatus } from "../../domain/signing-lifecycle";
import { hash } from "../../domain/digest";
import { CeremonyRepository } from "../ports/ceremony.repository";

@Injectable()
export class RecipientSessionAccessService {
  constructor(
    private readonly repo: CeremonyRepository,
    private readonly entitlement: TenantEntitlementService
  ) {}

  async requireSigner(
    token: string,
    kind: "tokenDigest" | "sessionDigest",
    tx: TransactionContext
  ) {
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) {
      throw new ForbiddenException("Signing access unavailable");
    }
    const row = await this.repo.byDigest(kind, hash(token), tx);
    if (!row) {
      throw new ForbiddenException("Signing access unavailable");
    }
    const ref = requestRefOf(row);
    await this.repo.lock(ref, tx);
    const s = (await this.repo.signers(ref, tx)).find((r) => r.id === row.id);
    const c = await this.repo.ceremony(ref, tx),
      now = new Date();
    if (
      !s ||
      s[kind] !== hash(token) ||
      !c ||
      effectiveCeremonyStatus(c, now) !== "SENT" ||
      s.status !== "INVITED" ||
      (kind === "sessionDigest" && (!s.sessionUntil || s.sessionUntil <= now)) ||
      !(await this.entitlement.isAppEnabled(ref.tenantId, "sign", tx))
    ) {
      throw new ForbiddenException("Signing access unavailable");
    }
    const draft = await this.repo.draft(ref, tx);
    if (!draft) {
      throw new ForbiddenException("Signing access unavailable");
    }
    return { ref, s, c, draft };
  }
}
