import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";
import { DataModule, type PrismaService } from "@corely/data";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import { createTenant, createTestDb, stopSharedContainer } from "@corely/testkit";
import { NestLoggerAdapter } from "@/shared/adapters/logger/nest-logger.adapter";
import { TOKEN_SERVICE_TOKEN } from "@/modules/identity/application/ports/token-service.port";
import { WebsiteApplication } from "../application/website.application";
import { CreateWebsiteWallOfLoveItemUseCase } from "../application/use-cases/create-website-wall-of-love-item.usecase";
import { ListWebsiteWallOfLoveItemsUseCase } from "../application/use-cases/list-website-wall-of-love-items.usecase";
import { UpdateWebsiteWallOfLoveItemUseCase } from "../application/use-cases/update-website-wall-of-love-item.usecase";
import { ReorderWebsiteWallOfLoveItemsUseCase } from "../application/use-cases/reorder-website-wall-of-love-items.usecase";
import { PublishWebsiteWallOfLoveItemUseCase } from "../application/use-cases/publish-website-wall-of-love-item.usecase";
import { UnpublishWebsiteWallOfLoveItemUseCase } from "../application/use-cases/unpublish-website-wall-of-love-item.usecase";
import { WebsiteWallOfLoveController } from "../adapters/http/website-wall-of-love.controller";
import { PrismaWebsiteSiteRepository } from "../infrastructure/prisma/prisma-website-site-repository.adapter";
import { PrismaWebsiteWallOfLoveRepository } from "../infrastructure/prisma/prisma-website-wall-of-love-repository.adapter";
import { PrismaWebsiteWallOfLoveImagesRepository } from "../infrastructure/prisma/prisma-website-wall-of-love-images-repository.adapter";

vi.setConfig({ hookTimeout: 240_000, testTimeout: 240_000 });

describe("Website wall-of-love admin API (HTTP + Postgres)", () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication["getHttpServer"]>;
  let db: PostgresTestDb;
  let prisma: PrismaService;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;

    let idSequence = 0;
    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvModule.forTest({
          DATABASE_URL: db.url,
          WORKFLOW_QUEUE_DRIVER: "memory",
        }),
        DataModule,
      ],
      controllers: [WebsiteWallOfLoveController],
      providers: [
        {
          provide: TOKEN_SERVICE_TOKEN,
          useValue: {
            verifyAccessToken: async () => null,
          },
        },
        PrismaWebsiteSiteRepository,
        PrismaWebsiteWallOfLoveRepository,
        PrismaWebsiteWallOfLoveImagesRepository,
        {
          provide: ListWebsiteWallOfLoveItemsUseCase,
          useFactory: (
            siteRepo: PrismaWebsiteSiteRepository,
            wallOfLoveRepo: PrismaWebsiteWallOfLoveRepository,
            wallOfLoveImagesRepo: PrismaWebsiteWallOfLoveImagesRepository
          ) =>
            new ListWebsiteWallOfLoveItemsUseCase({
              logger: new NestLoggerAdapter(),
              siteRepo,
              wallOfLoveRepo,
              wallOfLoveImagesRepo,
            }),
          inject: [
            PrismaWebsiteSiteRepository,
            PrismaWebsiteWallOfLoveRepository,
            PrismaWebsiteWallOfLoveImagesRepository,
          ],
        },
        {
          provide: CreateWebsiteWallOfLoveItemUseCase,
          useFactory: (
            siteRepo: PrismaWebsiteSiteRepository,
            wallOfLoveRepo: PrismaWebsiteWallOfLoveRepository,
            wallOfLoveImagesRepo: PrismaWebsiteWallOfLoveImagesRepository
          ) =>
            new CreateWebsiteWallOfLoveItemUseCase({
              logger: new NestLoggerAdapter(),
              siteRepo,
              wallOfLoveRepo,
              wallOfLoveImagesRepo,
              idGenerator: {
                newId: () => {
                  idSequence += 1;
                  return `wol-id-${idSequence}`;
                },
              },
              clock: {
                now: () => new Date("2026-02-18T10:00:00.000Z"),
              },
            }),
          inject: [
            PrismaWebsiteSiteRepository,
            PrismaWebsiteWallOfLoveRepository,
            PrismaWebsiteWallOfLoveImagesRepository,
          ],
        },
        {
          provide: UpdateWebsiteWallOfLoveItemUseCase,
          useFactory: (
            wallOfLoveRepo: PrismaWebsiteWallOfLoveRepository,
            wallOfLoveImagesRepo: PrismaWebsiteWallOfLoveImagesRepository
          ) =>
            new UpdateWebsiteWallOfLoveItemUseCase({
              logger: new NestLoggerAdapter(),
              wallOfLoveRepo,
              wallOfLoveImagesRepo,
              clock: {
                now: () => new Date("2026-02-18T10:10:00.000Z"),
              },
              idGenerator: {
                newId: () => {
                  idSequence += 1;
                  return `wol-id-${idSequence}`;
                },
              },
            }),
          inject: [PrismaWebsiteWallOfLoveRepository, PrismaWebsiteWallOfLoveImagesRepository],
        },
        {
          provide: ReorderWebsiteWallOfLoveItemsUseCase,
          useFactory: (
            siteRepo: PrismaWebsiteSiteRepository,
            wallOfLoveRepo: PrismaWebsiteWallOfLoveRepository,
            wallOfLoveImagesRepo: PrismaWebsiteWallOfLoveImagesRepository
          ) =>
            new ReorderWebsiteWallOfLoveItemsUseCase({
              logger: new NestLoggerAdapter(),
              clock: {
                now: () => new Date("2026-02-18T10:20:00.000Z"),
              },
              siteRepo,
              wallOfLoveRepo,
              wallOfLoveImagesRepo,
            }),
          inject: [
            PrismaWebsiteSiteRepository,
            PrismaWebsiteWallOfLoveRepository,
            PrismaWebsiteWallOfLoveImagesRepository,
          ],
        },
        {
          provide: PublishWebsiteWallOfLoveItemUseCase,
          useFactory: (
            wallOfLoveRepo: PrismaWebsiteWallOfLoveRepository,
            wallOfLoveImagesRepo: PrismaWebsiteWallOfLoveImagesRepository
          ) =>
            new PublishWebsiteWallOfLoveItemUseCase({
              logger: new NestLoggerAdapter(),
              wallOfLoveRepo,
              wallOfLoveImagesRepo,
              clock: {
                now: () => new Date("2026-02-18T10:30:00.000Z"),
              },
            }),
          inject: [PrismaWebsiteWallOfLoveRepository, PrismaWebsiteWallOfLoveImagesRepository],
        },
        {
          provide: UnpublishWebsiteWallOfLoveItemUseCase,
          useFactory: (
            wallOfLoveRepo: PrismaWebsiteWallOfLoveRepository,
            wallOfLoveImagesRepo: PrismaWebsiteWallOfLoveImagesRepository
          ) =>
            new UnpublishWebsiteWallOfLoveItemUseCase({
              logger: new NestLoggerAdapter(),
              wallOfLoveRepo,
              wallOfLoveImagesRepo,
              clock: {
                now: () => new Date("2026-02-18T10:40:00.000Z"),
              },
            }),
          inject: [PrismaWebsiteWallOfLoveRepository, PrismaWebsiteWallOfLoveImagesRepository],
        },
        {
          provide: WebsiteApplication,
          useFactory: (
            listWallOfLoveItems: ListWebsiteWallOfLoveItemsUseCase,
            createWallOfLoveItem: CreateWebsiteWallOfLoveItemUseCase,
            updateWallOfLoveItem: UpdateWebsiteWallOfLoveItemUseCase,
            reorderWallOfLoveItems: ReorderWebsiteWallOfLoveItemsUseCase,
            publishWallOfLoveItem: PublishWebsiteWallOfLoveItemUseCase,
            unpublishWallOfLoveItem: UnpublishWebsiteWallOfLoveItemUseCase
          ) =>
            ({
              listWallOfLoveItems,
              createWallOfLoveItem,
              updateWallOfLoveItem,
              reorderWallOfLoveItems,
              publishWallOfLoveItem,
              unpublishWallOfLoveItem,
            }) as unknown as WebsiteApplication,
          inject: [
            ListWebsiteWallOfLoveItemsUseCase,
            CreateWebsiteWallOfLoveItemUseCase,
            UpdateWebsiteWallOfLoveItemUseCase,
            ReorderWebsiteWallOfLoveItemsUseCase,
            PublishWebsiteWallOfLoveItemUseCase,
            UnpublishWebsiteWallOfLoveItemUseCase,
          ],
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

  it("creates, updates, reorders, publishes and unpublishes wall-of-love items", async () => {
    const tenant = await createTenant(prisma, { name: "Wall Of Love Admin Tenant" });
    const site = await prisma.websiteSite.create({
      data: {
        id: "site-wol-admin-1",
        tenantId: tenant.id,
        name: "Admin Site",
        slug: "admin-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    const createYoutubeResponse = await request(server)
      .post(`/website/sites/${site.id}/wall-of-love/items`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({
        type: "youtube",
        quote: "Great walkthrough!",
        linkUrl: "https://youtu.be/dQw4w9WgXcQ?t=99",
      });

    expect(createYoutubeResponse.status).toBe(201);
    const youtubeItemId = createYoutubeResponse.body.item.id as string;
    expect(createYoutubeResponse.body.item.linkUrl).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(createYoutubeResponse.body.item.status).toBe("draft");

    const createImageResponse = await request(server)
      .post(`/website/sites/${site.id}/wall-of-love/items`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({
        type: "image",
        quote: "Loved it",
      });

    expect(createImageResponse.status).toBe(201);
    const imageItemId = createImageResponse.body.item.id as string;

    const publishImageWithoutAttachment = await request(server)
      .post(`/website/wall-of-love/items/${imageItemId}/publish`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({});

    expect(publishImageWithoutAttachment.status).toBe(400);

    const updateImageResponse = await request(server)
      .patch(`/website/wall-of-love/items/${imageItemId}`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({
        imageFileIds: ["file-image-1"],
      });

    expect(updateImageResponse.status).toBe(200);
    expect(updateImageResponse.body.item.imageFileIds).toEqual(["file-image-1"]);

    const updateYoutubeToXResponse = await request(server)
      .patch(`/website/wall-of-love/items/${youtubeItemId}`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({
        type: "x",
        linkUrl: "https://twitter.com/corely/status/12345",
      });

    expect(updateYoutubeToXResponse.status).toBe(200);
    expect(updateYoutubeToXResponse.body.item.type).toBe("x");
    expect(updateYoutubeToXResponse.body.item.linkUrl).toBe("https://x.com/corely/status/12345");

    const publishXResponse = await request(server)
      .post(`/website/wall-of-love/items/${youtubeItemId}/publish`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({});
    expect(publishXResponse.status).toBe(201);
    expect(publishXResponse.body.item.status).toBe("published");

    const publishImageResponse = await request(server)
      .post(`/website/wall-of-love/items/${imageItemId}/publish`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({});
    expect(publishImageResponse.status).toBe(201);
    expect(publishImageResponse.body.item.status).toBe("published");

    const reorderResponse = await request(server)
      .post(`/website/sites/${site.id}/wall-of-love/items/reorder`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({
        orderedIds: [imageItemId, youtubeItemId],
      });

    expect(reorderResponse.status).toBe(201);
    expect(reorderResponse.body.items[0]?.id).toBe(imageItemId);
    expect(reorderResponse.body.items[1]?.id).toBe(youtubeItemId);

    const unpublishResponse = await request(server)
      .post(`/website/wall-of-love/items/${youtubeItemId}/unpublish`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1")
      .send({});

    expect(unpublishResponse.status).toBe(201);
    expect(unpublishResponse.body.item.status).toBe("draft");

    const listResponse = await request(server)
      .get(`/website/sites/${site.id}/wall-of-love/items`)
      .set("x-tenant-id", tenant.id)
      .set("x-user-id", "user-1");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items).toHaveLength(2);
    expect(listResponse.body.items[0]?.id).toBe(imageItemId);
    expect(listResponse.body.items[1]?.id).toBe(youtubeItemId);

    const persistedXItem = await prisma.websiteWallOfLoveItem.findUnique({
      where: { id: youtubeItemId },
    });
    expect(persistedXItem?.type).toBe("X");
    expect(persistedXItem?.linkUrl).toBe("https://x.com/corely/status/12345");
  });
});
