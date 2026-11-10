import {
  SsoEmailCodeService,
  DeliverSsoEmailCodeUseCase,
} from "../application/services/sso-email-code.service";
import { randomUUID } from "node:crypto";
import { EnvService, validateEnv } from "@corely/config";
import { PrismaService, PrismaOutboxAdapter } from "@corely/data";
import { PrismaSsoStore } from "../infrastructure/adapters/prisma-sso-store.adapter";
import { PrismaAuditRepository } from "../infrastructure/adapters/prisma-audit-repository.adapter";
import { PrismaUserRepository } from "../infrastructure/adapters/prisma-user-repository.adapter";
import { PrismaMembershipRepository } from "../infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaTenantRepository } from "../infrastructure/adapters/prisma-tenant-repository.adapter";
import { BcryptPasswordHasher } from "../infrastructure/security/bcrypt.password-hasher";
import { SsoCrypto } from "../infrastructure/security/sso-crypto";
import { SsoRegistrationService } from "../application/services/sso-registration.service";
import { SsoService } from "../application/services/sso.service";

export const ssoTestOrigins = {
  login: "https://login.corely.test",
  app: "https://app.corely.test",
  invoice: "https://invoice.app.corely.test",
  hr: "https://hr.app.corely.test",
};
export const ssoTestProxyKey = "synthetic-sso-test-proxy-key-384-only";
export const ssoTestPassword = "Synthetic-SSO-384!";

export async function createSsoTestContext(origins = ssoTestOrigins, realClock = false) {
  const database = process.env.SSO_TEST_DATABASE_URL;
  if (!database) {
    throw new Error("SSO_TEST_DATABASE_URL must select a disposable local corely_384_* database");
  }
  const url = new URL(database);
  if (url.hostname !== "127.0.0.1" || !/^\/corely_384_[a-z0-9_]+$/.test(url.pathname)) {
    throw new Error("Refusing non-disposable SSO database");
  }
  process.env.DATABASE_URL = database;
  process.env.OUTBOX_DISPATCH_DRIVER = "disabled";
  const prisma = new PrismaService();
  const id = randomUUID();
  const userId = `sso-user-${id}`;
  const tenantId = `sso-tenant-${id}`;
  const email = `sso-${id}@example.invalid`;
  const passwords = new BcryptPasswordHasher();
  const env = new EnvService(
    validateEnv({
      NODE_ENV: "test",
      APP_ENV: id,
      DATABASE_URL: database,
      CORELY_SSO_ENABLED: "true",
      CORELY_SSO_SECRET: "a1".repeat(32),
      CORELY_SSO_PROXY_KEY: ssoTestProxyKey,
      CORELY_SSO_REGISTRATIONS: JSON.stringify({
        loginOrigin: origins.login,
        apps: [
          { key: "app-center", origin: origins.app },
          { key: "invoice", origin: origins.invoice },
          { key: "hr", origin: origins.hr },
        ],
      }),
    })
  );
  const registrations = new SsoRegistrationService(env);
  const crypto = new SsoCrypto(registrations.encryptionKey);
  const audit = new PrismaAuditRepository(prisma);
  const outbox = new PrismaOutboxAdapter(prisma);
  const store = new PrismaSsoStore(prisma, audit, outbox);
  const transactionIds = new Set<string>();
  const budgetKeys = new Set<string>();
  const create = store.createTransaction.bind(store);
  store.createTransaction = (transaction) => {
    transactionIds.add(transaction.id);
    return create(transaction);
  };
  const take = store.takeAttempt.bind(store);
  store.takeAttempt = (key, now, limit) => {
    budgetKeys.add(key);
    return take(key, now, limit);
  };
  let now = new Date();
  const clock = { now: () => (realClock ? new Date() : now) };
  const service = new SsoService(
    registrations,
    store,
    crypto,
    new PrismaUserRepository(prisma),
    new PrismaMembershipRepository(prisma),
    new PrismaTenantRepository(prisma),
    passwords,
    clock
  );
  const users = new PrismaUserRepository(prisma);
  const emailCodes = new SsoEmailCodeService(service, store, crypto, users, clock);
  const sentCodes: Array<{ to: string; code: string }> = [];
  const deliveredKeys = new Set<string>();
  const delivery = new DeliverSsoEmailCodeUseCase(
    service,
    store,
    crypto,
    {
      sendCode: async (input) => {
        if (!deliveredKeys.has(input.idempotencyKey)) {
          deliveredKeys.add(input.idempotencyKey);
          sentCodes.push({ to: input.to, code: input.code });
        }
      },
    },
    clock
  );
  const challengeIds = new Set<string>();
  const prepare = store.prepareEmailChallenge.bind(store);
  store.prepareEmailChallenge = (challenge) => {
    challengeIds.add(challenge.id);
    return prepare(challenge);
  };
  async function deliverCodes() {
    for (const id of challengeIds) {
      await delivery.execute(id);
    }
  }
  await prisma.tenant.create({ data: { id: tenantId, name: "Synthetic SSO team", slug: id } });
  const role = await prisma.role.create({ data: { tenantId, name: "Member" } });
  await prisma.user.create({
    data: {
      id: userId,
      email,
      name: "Synthetic colleague",
      passwordHash: await passwords.hash(ssoTestPassword),
    },
  });
  const membership = await prisma.membership.create({
    data: { tenantId, userId, roleId: role.id },
  });
  async function start(
    origin = origins.app,
    returnPath = "/invoices?view=open#today",
    browser?: string
  ) {
    const boot = service.bootstrap(origin, browser);
    const redirect = new URL(
      await service.start(origin, boot.handle, boot.csrfToken, returnPath, "synthetic-source")
    );
    const requestId = requiredParam(redirect, "request");
    const context = await service.context(requestId, undefined);
    return { ...boot, requestId, context };
  }
  async function login(origin = origins.app, returnPath?: string) {
    const initial = await start(origin, returnPath);
    const result = await service.login(
      {
        requestId: initial.requestId,
        csrfToken: initial.context.csrfToken,
        email,
        password: ssoTestPassword,
      },
      initial.context.handle
    );
    const callback = new URL(result.redirectTo);
    return {
      ...initial,
      ...result,
      callback: {
        requestId: initial.requestId,
        code: requiredParam(callback, "code"),
        state: requiredParam(callback, "state"),
      },
    };
  }
  async function cleanup() {
    await prisma.ssoLoginTransaction.deleteMany({ where: { id: { in: [...transactionIds] } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
    await prisma.outboxEvent.deleteMany({
      where: {
        OR: [
          { payloadJson: { contains: userId } },
          ...[...challengeIds].map((id) => ({ payloadJson: { contains: id } })),
        ],
      },
    });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    for (const key of budgetKeys) {
      await prisma.ssoAttemptBudget.deleteMany({ where: { id: { startsWith: `${key}:` } } });
    }
    await prisma.onModuleDestroy();
  }
  return {
    prisma,
    service,
    emailCodes,
    delivery,
    sentCodes,
    deliverCodes,
    store,
    registrations,
    crypto,
    audit,
    userId,
    tenantId,
    email,
    membership,
    start,
    login,
    cleanup,
    advance: (milliseconds: number) => {
      now = new Date(now.getTime() + milliseconds);
    },
  };
}

function requiredParam(url: URL, key: string): string {
  const value = url.searchParams.get(key);
  if (!value) {
    throw new Error(`Missing synthetic callback parameter: ${key}`);
  }
  return value;
}
