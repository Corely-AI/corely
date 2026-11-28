import { createHash, createHmac } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { TransactionContext } from "@corely/kernel";
import type { StudioScope } from "../ports/openbuk-repository.port";
import {
  OPENBUK_GUEST_ACCESS_STORE,
  OPENBUK_GUEST_SIGNING_SECRET,
  type GuestCredential,
  type OpenBukGuestAccessStore,
} from "../ports/openbuk-guest-access.port";

const MAX_AGE_MS = 90 * 86_400_000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

@Injectable()
export class OpenBukGuestCredentials {
  constructor(
    @Inject(OPENBUK_GUEST_ACCESS_STORE) private readonly store: OpenBukGuestAccessStore,
    @Inject(OPENBUK_GUEST_SIGNING_SECRET) private readonly secret: string
  ) {}

  private tokenFor(scope: StudioScope, bookingId: string) {
    if (this.secret.length < 32) {
      return null;
    }
    return createHmac("sha256", this.secret)
      .update(
        JSON.stringify(["openbuk.guest.manage.v1", scope.tenantId, scope.workspaceId, bookingId])
      )
      .digest("base64url");
  }

  private digest(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  async issue(
    scope: StudioScope,
    bookingId: string,
    startsAt: string,
    now: Date,
    tx: TransactionContext
  ) {
    const token = this.tokenFor(scope, bookingId);
    if (!token) {
      return undefined;
    }
    const expiresAt = new Date(
      Math.min(Date.parse(startsAt), now.getTime() + MAX_AGE_MS)
    ).toISOString();
    await this.store.save(scope, this.digest(token), { bookingId, expiresAt }, tx);
    return { token, expiresAt };
  }

  async replay(scope: StudioScope, bookingId: string, now: Date, tx?: TransactionContext) {
    const token = this.tokenFor(scope, bookingId);
    if (!token) {
      return undefined;
    }
    const record = await this.find(scope, token, now, tx);
    return record && !record.credential.revokedAt
      ? { token, expiresAt: record.credential.expiresAt }
      : undefined;
  }

  async find(scope: StudioScope, token: string, now: Date, tx?: TransactionContext) {
    if (!TOKEN_PATTERN.test(token)) {
      return null;
    }
    const digest = this.digest(token);
    const credential = await this.store.find(scope, digest, tx);
    return credential && Date.parse(credential.expiresAt) > now.getTime()
      ? { digest, credential }
      : null;
  }

  async revoke(
    scope: StudioScope,
    digest: string,
    credential: GuestCredential,
    now: Date,
    tx: TransactionContext
  ) {
    await this.store.save(scope, digest, { ...credential, revokedAt: now.toISOString() }, tx);
  }
}
