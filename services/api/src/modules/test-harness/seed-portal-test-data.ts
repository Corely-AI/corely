import type { PrismaService } from "@corely/data";
import * as bcrypt from "bcrypt";

export type SeedPortalTestDataResult = {
  tenantId: string;
  workspaceId: string;
  workspaceSlug: string;
  studentUserId: string;
  studentEmail: string;
  documentTitle: string;
  documentId: string;
  invoiceId: string;
  invoiceNumber: string;
};

export const seedPortalTestData = async (
  prisma: PrismaService
): Promise<SeedPortalTestDataResult> => {
  const timestamp = Date.now();
  const studentEmail = `portal-student-${timestamp}@test.com`;
  const documentTitle = `E2E Test Material ${timestamp}`;
  const workspaceSlug = `portal-ws-${timestamp}`;

  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: `Portal E2E Tenant ${timestamp}`,
      slug: `portal-e2e-${timestamp}`,
      status: "ACTIVE",
    },
  });

  // 2. Create Legal Entity and Workspace
  const legalEntity = await prisma.legalEntity.create({
    data: {
      tenantId: tenant.id,
      kind: "COMPANY",
      legalName: "Portal Test Company",
      countryCode: "US",
      currency: "USD",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      tenantId: tenant.id,
      name: "Portal Test Workspace",
      slug: workspaceSlug,
      publicEnabled: true,
      legalEntityId: legalEntity.id,
    },
  });

  // 3. Create Student User
  const passwordHash = await bcrypt.hash("TestPassword123!", 10);
  const user = await prisma.user.create({
    data: {
      email: studentEmail,
      name: "E2E Test Student",
      passwordHash,
      status: "ACTIVE",
    },
  });

  // 4. Create Party and PartyRole (STUDENT)
  const party = await prisma.party.create({
    data: {
      tenantId: tenant.id,
      displayName: "E2E Test Student",
      lifecycleStatus: "ACTIVE",
    },
  });

  await prisma.partyRole.create({
    data: {
      tenantId: tenant.id,
      partyId: party.id,
      role: "STUDENT",
    },
  });

  // 5. Link User to Party
  await prisma.user.update({
    where: { id: user.id },
    data: { partyId: party.id },
  });

  // 6. Create Role and Membership
  const role = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: "Portal User",
      systemKey: "PORTAL_USER",
      isSystem: true,
    },
  });

  await prisma.membership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      roleId: role.id,
    },
  });

  // 7. Create Class Group
  const classGroup = await prisma.classGroup.create({
    data: {
      tenantId: tenant.id,
      workspaceId: workspace.id,
      name: "E2E Test Class",
      subject: "Testing",
      level: "Beginner",
      status: "ACTIVE",
      defaultPricePerSession: 100,
      currency: "USD",
    },
  });

  // 8. Create Class Enrollment
  await prisma.classEnrollment.create({
    data: {
      tenantId: tenant.id,
      workspaceId: workspace.id,
      classGroupId: classGroup.id,
      studentClientId: party.id,
      payerClientId: party.id,
      isActive: true,
    },
  });

  // 9. Create Document, File, and Link to Class
  const document = await prisma.document.create({
    data: {
      tenantId: tenant.id,
      title: documentTitle,
      type: "UPLOAD",
      status: "READY",
    },
  });

  await prisma.file.create({
    data: {
      tenantId: tenant.id,
      documentId: document.id,
      kind: "ORIGINAL",
      storageProvider: "gcs",
      bucket: "e2e-test-bucket",
      objectKey: `e2e/${tenant.id}/${document.id}/test-material.pdf`,
      contentType: "application/pdf",
      sizeBytes: 1024,
    },
  });

  await prisma.documentLink.create({
    data: {
      tenantId: tenant.id,
      documentId: document.id,
      entityType: "CLASS_GROUP",
      entityId: classGroup.id,
    },
  });

  const invoiceNumber = `INV-${timestamp}`;
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: workspace.id,
      customerPartyId: party.id,
      billToName: party.displayName,
      status: "ISSUED",
      number: invoiceNumber,
      currency: "USD",
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            description: "E2E Tuition",
            qty: 1,
            unitPriceCents: 12000,
          },
        ],
      },
    },
  });

  return {
    tenantId: tenant.id,
    workspaceId: workspace.id,
    workspaceSlug,
    studentUserId: user.id,
    studentEmail,
    documentTitle,
    documentId: document.id,
    invoiceId: invoice.id,
    invoiceNumber,
  };
};
