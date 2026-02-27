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

describe("Website public QA API (HTTP + Postgres)", () => {
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
                  return `qa-fb-id-${idSequence}`;
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

  it("returns only published items and applies locale fallback", async () => {
    const tenant = await createTenant(prisma, { name: "Website QA Tenant" });

    const site = await prisma.websiteSite.create({
      data: {
        id: "site-qa-1",
        tenantId: tenant.id,
        name: "QA Site",
        slug: "qa-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    const page = await prisma.websitePage.create({
      data: {
        id: "page-qa-1",
        tenantId: tenant.id,
        siteId: site.id,
        path: "/pricing",
        locale: "en-US",
        template: "landing",
        status: "PUBLISHED",
        cmsEntryId: "cms-qa-1",
      },
    });

    await prisma.websiteDomain.create({
      data: {
        id: "domain-qa-1",
        tenantId: tenant.id,
        siteId: site.id,
        hostname: "qa.example.com",
        isPrimary: true,
      },
    });

    await prisma.websiteQa.create({
      data: {
        id: "qa-published-site-en",
        tenantId: tenant.id,
        siteId: site.id,
        locale: "en-US",
        scope: "SITE",
        status: "PUBLISHED",
        order: 2,
        question: "Do you support refunds?",
        answerHtml: "<p>Yes, within 30 days.</p>",
      },
    });

    await prisma.websiteQa.create({
      data: {
        id: "qa-draft-site-en",
        tenantId: tenant.id,
        siteId: site.id,
        locale: "en-US",
        scope: "SITE",
        status: "DRAFT",
        order: 1,
        question: "Draft question",
        answerHtml: "<p>Should not appear</p>",
      },
    });

    const response = await request(server).get("/public/website/qa").query({
      siteId: site.id,
      locale: "de-DE",
      scope: "site",
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]?.id).toBe("qa-published-site-en");
    expect(response.body.items[0]?.question).toContain("refunds");
  });

  it("supports page scope and returns empty when page does not resolve", async () => {
    const tenant = await createTenant(prisma, { name: "Website QA Scope Tenant" });

    const site = await prisma.websiteSite.create({
      data: {
        id: "site-qa-2",
        tenantId: tenant.id,
        name: "QA Scope Site",
        slug: "qa-scope-site",
        defaultLocale: "en-US",
        isDefault: true,
      },
    });

    const page = await prisma.websitePage.create({
      data: {
        id: "page-qa-2",
        tenantId: tenant.id,
        siteId: site.id,
        path: "/faq",
        locale: "en-US",
        template: "landing",
        status: "PUBLISHED",
        cmsEntryId: "cms-qa-2",
      },
    });

    await prisma.websiteDomain.create({
      data: {
        id: "domain-qa-2",
        tenantId: tenant.id,
        siteId: site.id,
        hostname: "scope.example.com",
        isPrimary: true,
      },
    });

    await prisma.websiteQa.create({
      data: {
        id: "qa-page-published",
        tenantId: tenant.id,
        siteId: site.id,
        locale: "en-US",
        scope: "PAGE",
        pageId: page.id,
        status: "PUBLISHED",
        order: 1,
        question: "Is support 24/7?",
        answerHtml: "<p>Yes.</p>",
      },
    });

    const scopedResponse = await request(server).get("/public/website/qa").query({
      siteId: site.id,
      locale: "en-US",
      scope: "page",
      pageId: page.id,
    });

    expect(scopedResponse.status).toBe(200);
    expect(scopedResponse.body.items).toHaveLength(1);
    expect(scopedResponse.body.items[0]?.id).toBe("qa-page-published");

    const missingPageResponse = await request(server).get("/public/website/qa").query({
      siteId: site.id,
      locale: "en-US",
      scope: "page",
    });

    expect(missingPageResponse.status).toBe(200);
    expect(missingPageResponse.body.items).toEqual([]);
  });
});
