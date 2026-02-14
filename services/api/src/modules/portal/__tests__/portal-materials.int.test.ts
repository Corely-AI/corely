import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import { describe, beforeAll, afterAll, it, expect, vi } from "vitest";
import request from "supertest";
import { AppModule } from "../../../app.module";
import { PrismaService } from "@corely/data";
import {
  createTestDb,
  stopSharedContainer,
  createTenant,
  createWorkspace,
  createUser,
  createStudentParty,
  createClassGroup,
  createClassEnrollment,
  createDocumentWithLink,
  createInvoice,
} from "@corely/testkit";
import cookieParser from "cookie-parser";
import { AuthGuard } from "../../identity";

describe("Portal Materials E2E", () => {
  vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });
  let app: INestApplication;
  let db: any;
  let prisma: PrismaService;

  const TEST_TENANT_ID = "test-tenant-" + Date.now();
  const TEST_WORKSPACE_ID = "test-workspace-" + Date.now();
  const TEST_WORKSPACE_SLUG = "test-workspace-slug-" + Date.now();
  const TEST_STUDENT_ID = "student-" + Date.now();
  const TEST_STUDENT_USER_ID = "student-user-" + Date.now();
  const TEST_CLASS_GROUP_ID = "class-group-" + Date.now();

  beforeAll(async () => {
    db = await createTestDb();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            userId: TEST_STUDENT_USER_ID,
            tenantId: TEST_TENANT_ID,
            roleIds: [],
            email: "student@test.com",
          };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  it("should return materials and invoices for enrolled student in specific workspace context", async () => {
    // 1. Setup Tenant and Workspace
    const tenant = await createTenant(prisma, {
      id: TEST_TENANT_ID,
      name: "Test Tenant",
      slug: "test-tenant-" + Date.now(),
    });

    const workspace = await createWorkspace(prisma, tenant.id, {
      id: TEST_WORKSPACE_ID,
      name: "Test Workspace",
      slug: TEST_WORKSPACE_SLUG,
      publicEnabled: true,
    });

    // 2. Create Student User and Party
    await createUser(prisma, {
      id: TEST_STUDENT_USER_ID,
      email: `student-${Date.now()}@test.com`,
    });

    const studentParty = await createStudentParty(prisma, tenant.id, {
      id: TEST_STUDENT_ID,
      displayName: "Test Student",
    });

    // Link User to Party
    await prisma.user.update({
      where: { id: TEST_STUDENT_USER_ID },
      data: { partyId: studentParty.id },
    });

    // 3. Create Class Group
    const classGroup = await createClassGroup(prisma, tenant.id, workspace.id, {
      id: TEST_CLASS_GROUP_ID,
      name: "Math 101",
      subject: "Math",
      level: "Beginner",
      status: "ACTIVE",
    });

    // 4. Enroll Student
    await createClassEnrollment(
      prisma,
      tenant.id,
      workspace.id,
      classGroup.id,
      studentParty.id,
      true
    );

    // 5. Create Document and Link
    await createDocumentWithLink(prisma, tenant.id, {
      title: "Syllabus",
      type: "UPLOAD",
      status: "READY",
      linkTo: { entityType: "CLASS_GROUP", entityId: classGroup.id },
    });

    const invoice = await createInvoice(prisma, {
      tenantId: workspace.id,
      customerPartyId: studentParty.id,
      status: "ISSUED",
      number: `INV-${Date.now()}`,
    });

    // 6. Make Request (Mocked Guard puts user in context)
    const materialsResponse = await request(app.getHttpServer())
      .get(`/portal/students/${TEST_STUDENT_ID}/materials`)
      .query({ w: TEST_WORKSPACE_SLUG })
      .expect(200);

    const invoicesResponse = await request(app.getHttpServer())
      .get(`/portal/students/${TEST_STUDENT_ID}/invoices`)
      .query({ w: TEST_WORKSPACE_SLUG })
      .expect(200);

    // 7. Assert materials
    expect(materialsResponse.body.items).toBeDefined();
    expect(materialsResponse.body.items).toHaveLength(1);
    expect(materialsResponse.body.items[0].title).toBe("Syllabus");
    expect(materialsResponse.body.items[0].linkedTo).toBe("CLASS_GROUP");

    // 8. Assert invoices
    expect(invoicesResponse.body.items).toBeDefined();
    expect(invoicesResponse.body.items).toHaveLength(1);
    expect(invoicesResponse.body.items[0].id).toBe(invoice.id);
    expect(invoicesResponse.body.items[0].customerPartyId).toBe(studentParty.id);
  });
});
