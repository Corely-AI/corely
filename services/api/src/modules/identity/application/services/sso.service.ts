import {
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  ConflictException,
} from "@nestjs/common";
import { isSafeSsoReturnPath } from "@corely/contracts";
import {
  SSO_STORE,
  type SsoStorePort,
  type SsoTransaction,
  type SsoFamily,
} from "../ports/sso-store.port";
import { SSO_CRYPTO, type SsoCryptoPort } from "../ports/sso-crypto.port";
import { USER_REPOSITORY_TOKEN, type UserRepositoryPort } from "../ports/user-repository.port";
import {
  MEMBERSHIP_REPOSITORY_TOKEN,
  type MembershipRepositoryPort,
} from "../ports/membership-repository.port";
import {
  TENANT_REPOSITORY_TOKEN,
  type TenantRepositoryPort,
} from "../ports/tenant-repository.port";
import { PASSWORD_HASHER_TOKEN, type PasswordHasherPort } from "../ports/password-hasher.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "../../../../shared/ports/clock.port";
import { SsoRegistrationService } from "./sso-registration.service";

const MINUTE = 60_000;
export const SSO_IDLE_MS = 30 * MINUTE;
export const SSO_ABSOLUTE_MS = 12 * 60 * MINUTE;

@Injectable()
export class SsoService {
  private dummyHash?: Promise<string>;
  constructor(
    readonly registrations: SsoRegistrationService,
    @Inject(SSO_STORE) private readonly store: SsoStorePort,
    @Inject(SSO_CRYPTO) private readonly crypto: SsoCryptoPort,
    @Inject(USER_REPOSITORY_TOKEN) private readonly users: UserRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly memberships: MembershipRepositoryPort,
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenants: TenantRepositoryPort,
    @Inject(PASSWORD_HASHER_TOKEN) private readonly passwords: PasswordHasherPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  bootstrap(origin: string, existing?: string) {
    this.registrations.app(origin);
    const handle = existing && /^[\w-]{43}$/.test(existing) ? existing : this.crypto.secret();
    return {
      handle,
      csrfToken: this.crypto.csrf(handle, `${this.registrations.environment}:${origin}`),
    };
  }
  checkCsrf(handle: string | undefined, token: string, binding: string): void {
    if (!handle || !this.crypto.equal(token, this.crypto.csrf(handle, binding))) {
      throw new UnauthorizedException("Restart sign-in");
    }
  }
  async start(
    origin: string,
    browser: string | undefined,
    csrfToken: string,
    returnPath: string,
    source: string
  ) {
    const app = this.registrations.app(origin);
    this.checkCsrf(browser, csrfToken, `${this.registrations.environment}:${origin}`);
    if (!browser || !isSafeSsoReturnPath(returnPath)) {
      throw new BadRequestException("Invalid return path");
    }
    const now = this.clock.now();
    await this.budget(`start:${origin}:${source}`, now, 500);
    await this.budget(`browser:${origin}:${browser}`, now, 20);
    const id = this.crypto.secret();
    const state = this.crypto.secret();
    const verifier = this.crypto.secret();
    await this.store.createTransaction({
      id,
      environment: this.registrations.environment,
      appKey: app.key,
      origin,
      returnPath,
      browserHash: this.crypto.hash(browser),
      stateHash: this.crypto.hash(state),
      stateCipher: this.crypto.encrypt(state, id),
      verifierCipher: this.crypto.encrypt(verifier, id),
      challenge: this.crypto.challenge(verifier),
      expiresAt: new Date(now.getTime() + 5 * MINUTE),
      codeHash: null,
      codeExpiresAt: null,
      familyId: null,
      consumedAt: null,
    });
    const redirect = new URL("/sso/authorize", this.registrations.loginOrigin);
    redirect.searchParams.set("request", id);
    return redirect.toString();
  }
  async context(requestId: string, centralBrowser: string | undefined) {
    const transaction = await this.pending(requestId);
    const handle =
      centralBrowser && /^[\w-]{43}$/.test(centralBrowser) ? centralBrowser : this.crypto.secret();
    return {
      handle,
      appKey: transaction.appKey,
      appOrigin: transaction.origin,
      accountOrigin:
        this.registrations.apps.find((app) => app.key === "app-center")?.origin ?? null,
      csrfToken: this.crypto.csrf(handle, `${this.registrations.environment}:${requestId}`),
      expiresAt: transaction.expiresAt.toISOString(),
    };
  }
  async authorize(requestId: string, centralHandle?: string): Promise<string | null> {
    const transaction = await this.pending(requestId);
    const family = centralHandle
      ? await this.store.findFamily(this.crypto.hash(centralHandle), this.registrations.environment)
      : null;
    const now = this.clock.now();
    if (!family || !this.live(family, now)) {
      return null;
    }
    const user = await this.requireAccess(family.userId);
    if (!this.crypto.equal(family.credentialHash, this.crypto.hash(user.getPasswordHash()))) {
      return null;
    }
    return this.issue(transaction, family, false, now);
  }
  async login(
    input: {
      requestId: string;
      csrfToken: string;
      email: string;
      password?: string;
      emailCode?: string;
    },
    centralBrowser?: string,
    centralHandle?: string
  ) {
    const transaction = await this.pending(input.requestId);
    this.checkCsrf(
      centralBrowser,
      input.csrfToken,
      `${this.registrations.environment}:${input.requestId}`
    );
    const now = this.clock.now();
    await this.budget(`account:${input.email.trim().toLowerCase()}`, now, 5);
    await this.budget(`credentials:${centralBrowser}`, now, 15);
    if (centralHandle) {
      const existing = await this.store.findFamily(
        this.crypto.hash(centralHandle),
        this.registrations.environment
      );
      if (existing && this.live(existing, now)) {
        const account = await this.users.findById(existing.userId);
        if (
          account?.isActive() &&
          this.crypto.equal(existing.credentialHash, this.crypto.hash(account.getPasswordHash()))
        ) {
          throw new ConflictException("Continue with the existing sign-in or sign out first");
        }
      }
    }
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    if (input.password !== undefined) {
      this.dummyHash ??= this.passwords.hash("corely-sso-unknown-account");
      const valid = await this.passwords.verify(
        input.password,
        user?.getPasswordHash() ?? (await this.dummyHash)
      );
      if (!valid) {
        throw new UnauthorizedException("Unable to sign in with these credentials");
      }
    } else if (!input.emailCode || !/^\d{6}$/.test(input.emailCode)) {
      throw new UnauthorizedException("Unable to verify sign-in code");
    }
    if (!user?.isActive()) {
      throw new UnauthorizedException("Unable to sign in with these credentials");
    }
    await this.requireAccess(user.getId());
    const handle = this.crypto.secret();
    const family: SsoFamily = {
      id: this.crypto.secret(),
      environment: this.registrations.environment,
      userId: user.getId(),
      handleHash: this.crypto.hash(handle),
      credentialHash: this.crypto.hash(user.getPasswordHash()),
      createdAt: now,
      idleExpiresAt: new Date(now.getTime() + SSO_IDLE_MS),
      expiresAt: new Date(now.getTime() + SSO_ABSOLUTE_MS),
      revokedAt: null,
    };
    const emailProof = input.emailCode
      ? {
          email: input.email.trim().toLowerCase(),
          codeHash: this.crypto.csrf(
            input.emailCode,
            `${transaction.environment}:${transaction.id}:${input.email.trim().toLowerCase()}`
          ),
        }
      : undefined;
    return {
      centralHandle: handle,
      redirectTo: await this.issue(transaction, family, true, now, emailProof),
    };
  }
  async callback(
    origin: string,
    input: { requestId: string; code: string; state: string },
    browser?: string
  ) {
    const app = this.registrations.app(origin);
    const transaction = await this.store.getTransaction(input.requestId);
    if (
      !transaction ||
      transaction.consumedAt ||
      transaction.expiresAt <= this.clock.now() ||
      !transaction.codeExpiresAt ||
      transaction.codeExpiresAt <= this.clock.now() ||
      !transaction.verifierCipher ||
      transaction.environment !== this.registrations.environment ||
      transaction.origin !== origin ||
      transaction.appKey !== app.key ||
      !browser ||
      !this.crypto.equal(transaction.browserHash, this.crypto.hash(browser)) ||
      !this.crypto.equal(transaction.stateHash, this.crypto.hash(input.state))
    ) {
      throw new BadRequestException("Sign-in could not be completed; restart it from your app");
    }
    // The verifier never leaves the server. AEAD binds it to this exact transaction.
    const challenge = this.crypto.challenge(
      this.crypto.decrypt(transaction.verifierCipher, transaction.id)
    );
    if (!transaction.familyId) {
      throw new BadRequestException("Restart sign-in");
    }
    const now = this.clock.now();
    const handle = this.crypto.secret();
    await this.store.redeem({
      transaction,
      codeHash: this.crypto.hash(input.code),
      browserHash: this.crypto.hash(browser),
      stateHash: this.crypto.hash(input.state),
      challenge,
      now,
      session: {
        id: this.crypto.secret(),
        familyId: transaction.familyId,
        environment: this.registrations.environment,
        appKey: app.key,
        handleHash: this.crypto.hash(handle),
        expiresAt: new Date(now.getTime() + SSO_ABSOLUTE_MS),
        idleExpiresAt: new Date(now.getTime() + SSO_IDLE_MS),
        revokedAt: null,
      },
    });
    return { handle, returnPath: transaction.returnPath };
  }
  async cancel(requestId: string, centralBrowser: string | undefined, csrfToken: string) {
    const transaction = await this.pending(requestId);
    this.checkCsrf(centralBrowser, csrfToken, `${this.registrations.environment}:${requestId}`);
    await this.store.cancel(transaction.id, transaction.browserHash);
    return `${transaction.origin}/auth/logged-out`;
  }
  async pending(id: string): Promise<SsoTransaction> {
    this.registrations.assertEnabled();
    const transaction = await this.store.getTransaction(id);
    if (
      !transaction ||
      transaction.environment !== this.registrations.environment ||
      transaction.expiresAt <= this.clock.now() ||
      transaction.consumedAt ||
      transaction.codeHash ||
      !this.registrations.apps.some(
        (a) => a.key === transaction.appKey && a.origin === transaction.origin
      )
    ) {
      throw new BadRequestException(
        "This sign-in request expired or was already used. Return to your app and start again."
      );
    }
    return transaction;
  }
  private async issue(
    transaction: SsoTransaction,
    family: SsoFamily,
    createFamily: boolean,
    now: Date,
    emailProof?: { codeHash: string; email: string }
  ) {
    const code = this.crypto.secret();
    const authorized = await this.store.authorize({
      transactionId: transaction.id,
      family,
      createFamily,
      codeHash: this.crypto.hash(code),
      codeExpiresAt: new Date(now.getTime() + MINUTE),
      now,
      ...(emailProof ? { emailProof } : {}),
    });
    if (!authorized) {
      throw new UnauthorizedException("Invalid or expired sign-in code");
    }
    const callback = new URL("/auth/callback", transaction.origin);
    callback.searchParams.set("request", transaction.id);
    callback.searchParams.set("code", code);
    callback.searchParams.set(
      "state",
      this.crypto.decrypt(transaction.stateCipher, transaction.id)
    );
    return callback.toString();
  }
  private live(family: SsoFamily, now: Date) {
    return !family.revokedAt && family.expiresAt > now && family.idleExpiresAt > now;
  }
  async requireAccess(userId: string) {
    const user = await this.users.findById(userId);
    if (!user?.isActive()) {
      throw new UnauthorizedException("Unable to sign in");
    }
    const memberships = await this.memberships.findByUserId(userId);
    for (const membership of memberships) {
      const tenantId = membership.getTenantId();
      if (tenantId !== null && (await this.tenants.findById(tenantId))?.isActive()) {
        return user;
      }
    }
    throw new UnauthorizedException(
      "No active team membership. Ask your administrator to restore access."
    );
  }
  async budget(value: string, now: Date, limit: number) {
    if (
      !(await this.store.takeAttempt(
        this.crypto.hash(`${this.registrations.environment}:${value}`),
        now,
        limit
      ))
    ) {
      throw new HttpException(
        "Too many attempts. Wait five minutes and try again.",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
  }
}
