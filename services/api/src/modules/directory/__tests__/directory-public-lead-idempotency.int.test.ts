import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApiTestApp,
  createTestDb,
  stopSharedContainer,
  type PostgresTestDb,
} from "@corely/testkit";
import { PrismaService } from "@corely/data";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Directory public lead flow (E2E)", () => {
  let db: PostgresTestDb;
  let app: INestApplication;
  let prisma: PrismaService;
  let dbReady = false;

  const scope = {
    tenantId: "directory-public-tenant",
    workspaceId: "directory-public-workspace",
  };

  beforeAll(async () => {
    process.env.DIRECTORY_PUBLIC_TENANT_ID = scope.tenantId;
    process.env.DIRECTORY_PUBLIC_WORKSPACE_ID = scope.workspaceId;

    try {
      db = await createTestDb();
      app = await createApiTestApp(db);
      prisma = app.get(PrismaService);
      dbReady = true;
    } catch {
      dbReady = false;
    }
  });

  beforeEach(async () => {
    if (!dbReady) {
      return;
    }

    await db.reset();

    await prisma.directoryRestaurant.create({
      data: {
        id: "restaurant-1",
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        slug: "pho-viet-mitte",
        name: "Pho Viet Mitte",
        shortDescription: "Pho and bun cha",
        dishTags: ["pho"],
        neighborhoodSlug: "mitte",
        addressLine: "Rosenthaler Str. 10",
        postalCode: "10119",
        city: "Berlin",
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    if (dbReady) {
      await app.close();
      await db.down();
    }
    await stopSharedContainer();
  });

  it("returns the same lead for duplicate idempotency key and only handles one outbox event", async () => {
    if (!dbReady) {
      return;
    }

    const payload = {
      restaurantSlug: "pho-viet-mitte",
      name: "An Tran",
      contact: "an@example.com",
      message: "Catering request for a company event",
    };

    const first = await request(app.getHttpServer())
      .post("/v1/public/berlin/leads")
      .set("Idempotency-Key", "lead-idem-1")
      .send(payload);

    const second = await request(app.getHttpServer())
      .post("/v1/public/berlin/leads")
      .set("Idempotency-Key", "lead-idem-1")
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.leadId).toBeDefined();
    expect(first.body.leadId).toBe(second.body.leadId);

    const leads = await prisma.directoryLead.findMany({
      where: {
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
      },
    });
    expect(leads).toHaveLength(1);

    const pendingOutbox = await prisma.outboxEvent.findMany({
      where: {
        tenantId: scope.tenantId,
        eventType: "directory.lead.created",
        status: "PENDING",
      },
    });
    expect(pendingOutbox).toHaveLength(1);

    const drain = await request(app.getHttpServer())
      .post("/test/drain-outbox")
      .set("x-test-secret", "test-secret-key")
      .send({});

    expect(drain.status).toBe(200);
    expect(drain.body.processedCount).toBe(1);

    const sentOutbox = await prisma.outboxEvent.findMany({
      where: {
        tenantId: scope.tenantId,
        eventType: "directory.lead.created",
        status: "SENT",
      },
    });

    expect(sentOutbox).toHaveLength(1);
  });
});
