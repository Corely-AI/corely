import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";
import { DataModule, type PrismaService } from "@corely/data";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import { createTenant, createTestDb, stopSharedContainer } from "@corely/testkit";
import { NestLoggerAdapter } from "@/shared/adapters/logger/nest-logger.adapter";
import { PublicWorkspaceResolver } from "@/shared/public";
import { WebsiteApplication } from "../application/website.application";
import { CreateWebsiteFeedbackUseCase } from "../application/use-cases/create-website-feedback.usecase";
import { ListWebsitePublicQaUseCase } from "../application/use-cases/list-website-public-qa.usecase";
import { WebsitePublicController } from "../adapters/http/website-public.controller";
import { PrismaWebsiteDomainRepository } from "../infrastructure/prisma/prisma-website-domain-repository.adapter";
import { PrismaWebsitePageRepository } from "../infrastructure/prisma/prisma-website-page-repository.adapter";
import { PrismaWebsiteSiteRepository } from "../infrastructure/prisma/prisma-website-site-repository.adapter";
import { PrismaWebsiteFeedbackRepository } from "../infrastructure/prisma/prisma-website-feedback-repository.adapter";
import { PrismaWebsiteQaRepository } from "../infrastructure/prisma/prisma-website-qa-repository.adapter";

vi.setConfig({ hookTimeout: 240_000, testTimeout: 240_000 });

describe("Website public feedback API (HTTP + Postgres)", () => {
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
      controllers: [WebsitePublicController],
      providers: [
        PublicWorkspaceResolver,
        PrismaWebsiteDomainRepository,
        PrismaWebsiteSiteRepository,
        PrismaWebsitePageRepository,
        PrismaWebsiteFeedbackRepository,
        PrismaWebsiteQaRepository,
        {
          provide: CreateWebsiteFeedbackUseCase,
          useFactory: (
            feedbackRepo: PrismaWebsiteFeedbackRepository,
            domainRepo: PrismaWebsiteDomainRepository,
            siteRepo: PrismaWebsiteSiteRepository,
            pageRepo: PrismaWebsitePageRepository,
            publicWorkspaceResolver: PublicWorkspaceResolver
          ) =>
            new CreateWebsiteFeedbackUseCase({
              logger: new NestLoggerAdapter(),
              feedbackRepo,
              domainRepo,
              siteRepo,
              pageRepo,
              publicWorkspaceResolver,
              idGenerator: {
                newId: () => {
                  idSequence += 1;
                  return `fb-id-${idSequence}`;
                },
              },
              clock: {
                now: () => new Date("2026-02-18T00:00:00.000Z"),
              },
            }),
          inject: [
            PrismaWebsiteFeedbackRepository,
            PrismaWebsiteDomainRepository,
            PrismaWebsiteSiteRepository,
            PrismaWebsitePageRepository,
            PublicWorkspaceResolver,
          ],
        },
        {
          provide: ListWebsitePublicQaUseCase,
          useFactory: (
            qaRepo: PrismaWebsiteQaRepository,
            domainRepo: PrismaWebsiteDomainRepository,
            siteRepo: PrismaWebsiteSiteRepository,
            pageRepo: PrismaWebsitePageRepository,
            publicWorkspaceResolver: PublicWorkspaceResolver
          ) =>
            new ListWebsitePublicQaUseCase({
              logger: new NestLoggerAdapter(),
              qaRepo,
              domainRepo,
              siteRepo,
              pageRepo,
              publicWorkspaceResolver,
            }),
          inject: [
            PrismaWebsiteQaRepository,
            PrismaWebsiteDomainRepository,
            PrismaWebsiteSiteRepository,
            PrismaWebsitePageRepository,
            PublicWorkspaceResolver,
          ],
        },
        {
          provide: WebsiteApplication,
          useFactory: (
            createFeedback: CreateWebsiteFeedbackUseCase,
            listPublicQa: ListWebsitePublicQaUseCase
          ) =>
            ({
              createFeedback,
              listPublicQa,
              resolvePublicPage: {
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
          inject: [CreateWebsiteFeedbackUseCase, ListWebsitePublicQaUseCase],
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

  it("creates feedback with images and normalized YouTube metadata", async () => {
    const tenant = await createTenant(prisma, { name: "Website Tenant" });

    const site = await prisma.websiteSite.create({
      data: {
        id: "site-feedback-1",
        tenantId: tenant.id,
        name: "Feedback Site",
        slug: "feedback-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    const page = await prisma.websitePage.create({
      data: {
        id: "page-feedback-1",
        tenantId: tenant.id,
        siteId: site.id,
        path: "/contact",
        locale: "en-US",
        template: "landing",
        status: "PUBLISHED",
        cmsEntryId: "cms-feedback-1",
      },
    });

    await prisma.websiteDomain.create({
      data: {
        id: "domain-feedback-1",
        tenantId: tenant.id,
        siteId: site.id,
        hostname: "feedback.example.com",
        isPrimary: true,
      },
    });

    const response = await request(server)
      .post("/public/website/feedback")
      .send({
        siteRef: {
          hostname: "feedback.example.com",
          path: "/contact",
          locale: "en-US",
          mode: "live",
        },
        message: "Great product, please add dark mode.",
        name: "Alex",
        email: "alex@example.com",
        rating: 5,
        imageFileIds: ["file-1", "file-2"],
        youtubeUrls: ["https://youtu.be/dQw4w9WgXcQ?t=43"],
        meta: {
          userAgent: "test-agent",
          referrer: "https://feedback.example.com/contact",
          consent: true,
        },
      });

    expect([200, 201]).toContain(response.status);
    expect(response.body.feedbackId).toBeDefined();

    const feedback = await prisma.websiteFeedback.findUnique({
      where: { id: response.body.feedbackId as string },
    });

    expect(feedback).not.toBeNull();
    expect(feedback?.tenantId).toBe(tenant.id);
    expect(feedback?.siteId).toBe(site.id);
    expect(feedback?.pageId).toBe(page.id);
    expect(feedback?.message).toContain("dark mode");

    const youtubeEntries = feedback?.youtubeJson as Array<{
      provider: string;
      videoId: string;
      url: string;
    }>;
    expect(youtubeEntries).toHaveLength(1);
    expect(youtubeEntries[0]?.provider).toBe("youtube");
    expect(youtubeEntries[0]?.videoId).toBe("dQw4w9WgXcQ");
    expect(youtubeEntries[0]?.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    const images = await prisma.websiteFeedbackImage.findMany({
      where: { feedbackId: response.body.feedbackId as string },
      orderBy: { order: "asc" },
    });

    expect(images).toHaveLength(2);
    expect(images[0]?.fileId).toBe("file-1");
    expect(images[1]?.fileId).toBe("file-2");
  });
});
