import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { SSO_STORE, type SsoStorePort } from "../ports/sso-store.port";
import { SSO_CRYPTO, type SsoCryptoPort } from "../ports/sso-crypto.port";
import { SSO_EMAIL, type SsoEmailPort } from "../ports/sso-email.port";
import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../shared/ports/clock.port";
import { SsoService } from "./sso.service";

@Injectable()
export class SsoEmailCodeService {
  constructor(
    private readonly sso: SsoService,
    @Inject(SSO_STORE) private readonly store: SsoStorePort,
    @Inject(SSO_CRYPTO) private readonly crypto: SsoCryptoPort,
    @Inject(USER_REPOSITORY_TOKEN) private readonly users: UserRepositoryPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}
  async request(input: { requestId: string; csrfToken: string; email: string }, browser?: string) {
    const transaction = await this.sso.pending(input.requestId);
    this.sso.checkCsrf(
      browser,
      input.csrfToken,
      `${this.sso.registrations.environment}:${input.requestId}`
    );
    const now = this.clock.now();
    const email = input.email.trim().toLowerCase();
    await this.sso.budget(`email-send:${email}`, now, 3);
    await this.sso.budget(`email-browser:${browser}`, now, 10);
    const account = await this.users.findByEmail(email);
    let userId: string | null = null;
    let credentialHash: string | null = null;
    if (account?.isActive()) {
      try {
        await this.sso.requireAccess(account.getId());
        userId = account.getId();
        credentialHash = this.crypto.hash(account.getPasswordHash());
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) {
          throw error;
        }
      }
    }
    const id = this.crypto.secret();
    const code = this.crypto.emailCode();
    await this.store.prepareEmailChallenge({
      id,
      transactionId: transaction.id,
      email,
      userId,
      credentialHash,
      codeHash: this.crypto.csrf(code, `${transaction.environment}:${transaction.id}:${email}`),
      codeCipher: userId ? this.crypto.encrypt(code, id) : "",
      createdAt: now,
      expiresAt: new Date(Math.min(transaction.expiresAt.getTime(), now.getTime() + 300_000)),
      attempts: 0,
      consumedAt: null,
    });
    return {
      message:
        "If your account has team access, a sign-in code will be sent. It expires in five minutes.",
      retryAfterSeconds: 60,
    };
  }
}

/** Called by the existing outbox runtime through Identity's public interface. */
@Injectable()
export class DeliverSsoEmailCodeUseCase {
  constructor(
    private readonly sso: SsoService,
    @Inject(SSO_STORE) private readonly store: SsoStorePort,
    @Inject(SSO_CRYPTO) private readonly crypto: SsoCryptoPort,
    @Inject(SSO_EMAIL) private readonly email: SsoEmailPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}
  async execute(id: string) {
    if (!this.sso.registrations.enabled) {
      return;
    }
    const challenge = await this.store.findEmailChallenge(id);
    if (
      !challenge?.userId ||
      !challenge.codeCipher ||
      challenge.consumedAt ||
      challenge.expiresAt <= this.clock.now()
    ) {
      return;
    }
    const transaction = await this.store.getTransaction(challenge.transactionId);
    if (
      !transaction ||
      transaction.environment !== this.sso.registrations.environment ||
      transaction.consumedAt ||
      transaction.codeHash ||
      transaction.expiresAt <= this.clock.now()
    ) {
      return;
    }
    const user = await this.sso.requireAccess(challenge.userId);
    if (this.crypto.hash(user.getPasswordHash()) !== challenge.credentialHash) {
      return;
    }
    await this.email.sendCode({
      to: challenge.email,
      code: this.crypto.decrypt(challenge.codeCipher, challenge.id),
      expiryMinutes: 5,
      idempotencyKey: `sso-code-${challenge.id}`,
    });
    await this.store.markEmailDelivered(challenge.id);
  }
}
