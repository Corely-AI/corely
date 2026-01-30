import type { INestApplication, CanActivate, ExecutionContext } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";
import { DataModule } from "@corely/data";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import { createTenant, createTestDb, createUser, stopSharedContainer } from "@corely/testkit";
import { KernelModule } from "../../../shared/kernel/kernel.module";
import { AuthGuard, RbacGuard } from "../../identity";
import { PrismaFormRepository } from "../infrastructure/adapters/prisma-form-repository.adapter";
import { FORM_REPOSITORY } from "../application/ports/form-repository.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { FormsController } from "../http/forms.controller";
import { PublicFormsController } from "../http/public-forms.controller";
import { CreateFormUseCase } from "../application/use-cases/create-form.usecase";
import { UpdateFormUseCase } from "../application/use-cases/update-form.usecase";
import { DeleteFormUseCase } from "../application/use-cases/delete-form.usecase";
import { GetFormUseCase } from "../application/use-cases/get-form.usecase";
import { ListFormsUseCase } from "../application/use-cases/list-forms.usecase";
import { AddFieldUseCase } from "../application/use-cases/add-field.usecase";
import { UpdateFieldUseCase } from "../application/use-cases/update-field.usecase";
import { RemoveFieldUseCase } from "../application/use-cases/remove-field.usecase";
import { ReorderFieldsUseCase } from "../application/use-cases/reorder-fields.usecase";
import { PublishFormUseCase } from "../application/use-cases/publish-form.usecase";
import { UnpublishFormUseCase } from "../application/use-cases/unpublish-form.usecase";
import { ListFormSubmissionsUseCase } from "../application/use-cases/list-submissions.usecase";
import { GetFormSubmissionUseCase } from "../application/use-cases/get-submission.usecase";
import { FormSubmissionSummaryUseCase } from "../application/use-cases/submission-summary.usecase";
import { PublicGetFormUseCase } from "../application/use-cases/public-get-form.usecase";
import { PublicSubmitFormUseCase } from "../application/use-cases/public-submit-form.usecase";

vi.setConfig({ hookTimeout: 240_000, testTimeout: 240_000 });

describe("Forms API (HTTP + Postgres)", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let tenantId: string;
  let userId: string;

  const allowGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      const tenantHeader = req.headers?.["x-tenant-id"];
      const userHeader = req.headers?.["x-user-id"];
      const tenant = Array.isArray(tenantHeader) ? tenantHeader[0] : tenantHeader;
      const user = Array.isArray(userHeader) ? userHeader[0] : userHeader;
      if (tenant || user) {
        req.user = {
          tenantId: tenant,
          userId: user,
          roleIds: [],
        };
      }
      return true;
    },
  };

  beforeAll(async () => {
    db = await createTestDb();
    const moduleBuilder = Test.createTestingModule({
      imports: [
        EnvModule.forTest({
          DATABASE_URL: db.url,
          WORKFLOW_QUEUE_DRIVER: "memory",
        }),
        DataModule,
        KernelModule,
      ],
      controllers: [FormsController, PublicFormsController],
      providers: [
        PrismaFormRepository,
        { provide: FORM_REPOSITORY, useExisting: PrismaFormRepository },
        {
          provide: CreateFormUseCase,
          useFactory: (repo, idGen, clock) => new CreateFormUseCase(repo, idGen, clock),
          inject: [FORM_REPOSITORY, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
        },
        {
          provide: UpdateFormUseCase,
          useFactory: (repo, clock) => new UpdateFormUseCase(repo, clock),
          inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
        },
        {
          provide: DeleteFormUseCase,
          useFactory: (repo, clock) => new DeleteFormUseCase(repo, clock),
          inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
        },
        {
          provide: GetFormUseCase,
          useFactory: (repo) => new GetFormUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: ListFormsUseCase,
          useFactory: (repo) => new ListFormsUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: AddFieldUseCase,
          useFactory: (repo, idGen, clock) => new AddFieldUseCase(repo, idGen, clock),
          inject: [FORM_REPOSITORY, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
        },
        {
          provide: UpdateFieldUseCase,
          useFactory: (repo, clock) => new UpdateFieldUseCase(repo, clock),
          inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
        },
        {
          provide: RemoveFieldUseCase,
          useFactory: (repo) => new RemoveFieldUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: ReorderFieldsUseCase,
          useFactory: (repo) => new ReorderFieldsUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: PublishFormUseCase,
          useFactory: (repo, clock) => new PublishFormUseCase(repo, clock),
          inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
        },
        {
          provide: UnpublishFormUseCase,
          useFactory: (repo, clock) => new UnpublishFormUseCase(repo, clock),
          inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
        },
        {
          provide: ListFormSubmissionsUseCase,
          useFactory: (repo) => new ListFormSubmissionsUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: GetFormSubmissionUseCase,
          useFactory: (repo) => new GetFormSubmissionUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: FormSubmissionSummaryUseCase,
          useFactory: (repo) => new FormSubmissionSummaryUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: PublicGetFormUseCase,
          useFactory: (repo) => new PublicGetFormUseCase(repo),
          inject: [FORM_REPOSITORY],
        },
        {
          provide: PublicSubmitFormUseCase,
          useFactory: (repo, idGen, clock) => new PublicSubmitFormUseCase(repo, idGen, clock),
          inject: [FORM_REPOSITORY, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
        },
        {
          provide: AuthGuard,
          useValue: allowGuard,
        },
        {
          provide: RbacGuard,
          useValue: allowGuard,
        },
      ],
    });

    const moduleRef = await moduleBuilder
      .overrideGuard(AuthGuard)
      .useValue(allowGuard)
      .overrideGuard(RbacGuard)
      .useValue(allowGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await db.reset();
    const prisma = db.client;
    const tenant = await createTenant(prisma, { name: "Tenant A" });
    tenantId = tenant.id;
    const user = await createUser(prisma, { email: "owner@example.com" });
    userId = user.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await db.down();
    await stopSharedContainer();
  });

  const authHeaders = () => ({
    "x-tenant-id": tenantId,
    "x-user-id": userId,
  });

  it("creates form, publishes, submits publicly, and lists submissions", async () => {
    const createRes = await request(server)
      .post("/forms")
      .set(authHeaders())
      .send({ name: "Customer Survey", description: "A simple survey" });

    expect([200, 201]).toContain(createRes.status);
    const formId = createRes.body.form?.id ?? createRes.body.id;
    expect(formId).toBeDefined();

    const fieldRes = await request(server).post(`/forms/${formId}/fields`).set(authHeaders()).send({
      label: "Email",
      type: "EMAIL",
      required: true,
    });

    expect([200, 201]).toContain(fieldRes.status);
    expect(fieldRes.body.form?.fields?.length).toBeGreaterThan(0);

    const publishRes = await request(server)
      .post(`/forms/${formId}/publish`)
      .set(authHeaders())
      .send({});

    expect([200, 201]).toContain(publishRes.status);
    const { publicId, token } = publishRes.body;
    expect(publicId).toBeDefined();
    expect(token).toBeDefined();

    const publicGet = await request(server).get(`/public/forms/${publicId}`);
    expect(publicGet.status).toBe(200);
    expect(publicGet.body.form?.name).toBe("Customer Survey");

    const submitRes = await request(server)
      .post(`/public/forms/${publicId}/submissions`)
      .send({ token, payload: { email: "test@example.com" } });

    expect([200, 201]).toContain(submitRes.status);
    expect(submitRes.body.submission?.id).toBeDefined();

    const listSubmissions = await request(server)
      .get(`/forms/${formId}/submissions?pageSize=10`)
      .set(authHeaders());

    expect(listSubmissions.status).toBe(200);
    expect(listSubmissions.body.items?.length).toBeGreaterThan(0);
    expect(listSubmissions.body.items[0].payloadJson.email).toBe("test@example.com");
  });
});
