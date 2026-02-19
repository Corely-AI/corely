import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";
import { DataModule, type PrismaService } from "@corely/data";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import { createTenant, createTestDb, stopSharedContainer } from "@corely/testkit";
import { NestLoggerAdapter } from "@/shared/adapters/logger/nest-logger.adapter";
import { WebsiteApplication } from "../application/website.application";
import { ListPublicWebsiteWallOfLoveItemsUseCase } from "../application/use-cases/list-public-website-wall-of-love-items.usecase";
import { WEBSITE_PUBLIC_FILE_URL_PORT } from "../application/ports/public-file-url.port";
import { WebsitePublicController } from "../adapters/http/website-public.controller";
import { PrismaWebsiteWallOfLoveRepository } from "../infrastructure/prisma/prisma-website-wall-of-love-repository.adapter";
import { PrismaWebsiteWallOfLoveImagesRepository } from "../infrastructure/prisma/prisma-website-wall-of-love-images-repository.adapter";

vi.setConfig({ hookTimeout: 240_000, testTimeout: 240_000 });

describe("Website public wall-of-love API (HTTP + Postgres)", () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication["getHttpServer"]>;
  let db: PostgresTestDb;
  let prisma: PrismaService;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;

    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvModule.forTest({
          DATABASE_URL: db.url,
          WORKFLOW_QUEUE_DRIVER: "memory",
        }),
        DataModule,
      ],
      controllers: [WebsitePublicController],
      providers: [
        PrismaWebsiteWallOfLoveRepository,
        PrismaWebsiteWallOfLoveImagesRepository,
        {
          provide: WEBSITE_PUBLIC_FILE_URL_PORT,
          useValue: {
            getPublicUrl: async (fileId: string) =>
              `https://storage.googleapis.com/test-bucket/${encodeURIComponent(fileId)}`,
          },
        },
        {
          provide: ListPublicWebsiteWallOfLoveItemsUseCase,
          useFactory: (
            wallOfLoveRepo: PrismaWebsiteWallOfLoveRepository,
            wallOfLoveImagesRepo: PrismaWebsiteWallOfLoveImagesRepository,
            publicFileUrlPort: { getPublicUrl(fileId: string): Promise<string | null> }
          ) =>
            new ListPublicWebsiteWallOfLoveItemsUseCase({
              logger: new NestLoggerAdapter(),
              wallOfLoveRepo,
              wallOfLoveImagesRepo,
              publicFileUrlPort,
            }),
          inject: [
            PrismaWebsiteWallOfLoveRepository,
            PrismaWebsiteWallOfLoveImagesRepository,
            WEBSITE_PUBLIC_FILE_URL_PORT,
          ],
        },
        {
          provide: WebsiteApplication,
          useFactory: (listPublicWallOfLoveItems: ListPublicWebsiteWallOfLoveItemsUseCase) =>
            ({
              listPublicWallOfLoveItems,
              resolvePublicPage: {
                execute: async () => {
                  throw new Error("not used in this test");
                },
              },
              createFeedback: {
                execute: async () => {
                  throw new Error("not used in this test");
                },
              },
              listPublicQa: {
                execute: async () => {
                  throw new Error("not used in this test");
                },
              },
              slugExists: {
                execute: async () => {
                  throw new Error("not used in this test");
                },
              },
            }) as unknown as WebsiteApplication,
          inject: [ListPublicWebsiteWallOfLoveItemsUseCase],
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await db.down();
    await stopSharedContainer();
  });

  it("returns published items only in order with expected fields", async () => {
    const tenant = await createTenant(prisma, { name: "Wall Of Love Public Tenant" });

    const site = await prisma.websiteSite.create({
      data: {
        id: "site-wol-public-1",
        tenantId: tenant.id,
        name: "WOL Site",
        slug: "wol-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    await prisma.websiteWallOfLoveItem.create({
      data: {
        id: "wol-published-image",
        tenantId: tenant.id,
        siteId: site.id,
        type: "IMAGE",
        status: "PUBLISHED",
        order: 1,
        quote: "Amazing service!",
        authorName: "Alex",
      },
    });

    await prisma.websiteWallOfLoveItemImage.create({
      data: {
        id: "wol-image-1",
        tenantId: tenant.id,
        itemId: "wol-published-image",
        fileId: "file-image-1",
        order: 0,
      },
    });

    await prisma.websiteWallOfLoveItem.create({
      data: {
        id: "wol-draft-youtube",
        tenantId: tenant.id,
        siteId: site.id,
        type: "YOUTUBE",
        status: "DRAFT",
        order: 0,
        linkUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    });

    await prisma.websiteWallOfLoveItem.create({
      data: {
        id: "wol-published-x",
        tenantId: tenant.id,
        siteId: site.id,
        type: "X",
        status: "PUBLISHED",
        order: 2,
        linkUrl: "https://x.com/corely/status/12345",
      },
    });

    const response = await request(server).get("/public/website/wall-of-love").query({
      siteId: site.id,
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]?.id).toBe("wol-published-image");
    expect(response.body.items[1]?.id).toBe("wol-published-x");
    expect(response.body.items[0]?.imageFileId).toBe("file-image-1");
    expect(response.body.items[0]?.imageUrl).toBe(
      "https://storage.googleapis.com/test-bucket/file-image-1"
    );
    expect(response.body.items[1]?.type).toBe("x");
    expect(response.body.items[1]?.linkUrl).toBe("https://x.com/corely/status/12345");
    expect(response.body.items[1]?.imageUrl).toBeUndefined();
    expect(response.body.items[1]?.imageFileId).toBeUndefined();
  });
});
