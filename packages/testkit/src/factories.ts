import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

export async function createTenant(
  prisma: PrismaClient,
  data: Partial<{
    id: string;
    name: string;
    slug: string;
    status: string;
    timeZone: string;
  }> = {}
) {
  const tenantId = data.id ?? nanoid();
  return prisma.tenant.create({
    data: {
      id: tenantId,
      name: data.name ?? `Tenant ${tenantId}`,
      slug: data.slug ?? `tenant-${tenantId}`,
      status: data.status ?? "ACTIVE",
      timeZone: data.timeZone ?? "UTC",
    },
  });
}

export async function createRole(
  prisma: PrismaClient,
  tenantId: string,
  data: Partial<{ id: string; name: string; systemKey?: string }> = {}
) {
  return prisma.role.create({
    data: {
      id: data.id ?? nanoid(),
      tenantId,
      name: data.name ?? "Owner",
      systemKey: data.systemKey ?? "OWNER",
    },
  });
}

export async function createUser(
  prisma: PrismaClient,
  data: Partial<{ id: string; email: string; passwordHash: string; status: string }> = {}
) {
  const userId = data.id ?? nanoid();
  return prisma.user.create({
    data: {
      id: userId,
      email: data.email ?? `${userId}@example.com`,
      passwordHash: data.passwordHash ?? "hashed-password",
      status: data.status ?? "ACTIVE",
    },
  });
}

export async function linkMembership(
  prisma: PrismaClient,
  params: { tenantId: string; userId: string; roleId: string }
) {
  return prisma.membership.create({
    data: {
      id: nanoid(),
      tenantId: params.tenantId,
      userId: params.userId,
      roleId: params.roleId,
    },
  });
}

export async function createExpense(
  prisma: PrismaClient,
  data: Partial<{
    id: string;
    tenantId: string;
    merchantName: string;
    expenseDate: Date;
    currency: string;
    totalAmountCents: number;
    category?: string | null;
    createdByUserId?: string;
  }> & { tenantId: string }
) {
  const id = data.id ?? nanoid();
  return prisma.expense.create({
    data: {
      id,
      tenantId: data.tenantId,
      merchantName: data.merchantName ?? "Test Merchant",
      expenseDate: data.expenseDate ?? new Date("2024-01-01"),
      currency: data.currency ?? "USD",
      totalAmountCents: data.totalAmountCents ?? 1000,
      category: data.category ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      archivedAt: null,
      archivedByUserId: null,
      custom: Prisma.JsonNull,
    },
  });
}

export async function createInvoice(
  prisma: PrismaClient,
  data: Partial<{
    id: string;
    tenantId: string;
    customerPartyId: string;
    currency: string;
    status: "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED";
    number?: string | null;
  }> & { tenantId: string }
) {
  const invoiceId = data.id ?? nanoid();
  const invoice = await prisma.invoice.create({
    data: {
      id: invoiceId,
      tenantId: data.tenantId,
      customerPartyId: data.customerPartyId ?? nanoid(),
      currency: data.currency ?? "USD",
      status: data.status ?? "DRAFT",
      number: data.number ?? null,
    },
  });

  await prisma.invoiceLine.create({
    data: {
      id: nanoid(),
      invoiceId: invoice.id,
      description: "Line item",
      qty: 1,
      unitPriceCents: 1000,
    },
  });

  return invoice;
}

export async function createCustomerParty(
  prisma: PrismaClient,
  tenantId: string,
  data: Partial<{ id: string; displayName: string; email?: string; vatId?: string }> = {}
) {
  const partyId = data.id ?? nanoid();
  const party = await prisma.party.create({
    data: {
      id: partyId,
      tenantId,
      displayName: data.displayName ?? "Customer Co",
      vatId: data.vatId ?? null,
    },
  });

  await prisma.partyRole.create({
    data: { id: nanoid(), tenantId, partyId, role: "CUSTOMER" },
  });

  await prisma.contactPoint.create({
    data: {
      id: nanoid(),
      tenantId,
      partyId,
      type: "EMAIL",
      value: data.email ?? "billing@example.com",
      isPrimary: true,
    },
  });

  await prisma.address.create({
    data: {
      id: nanoid(),
      tenantId,
      partyId,
      type: "BILLING",
      line1: "123 Billing St",
      city: "Test City",
      postalCode: "12345",
      country: "US",
    },
  });

  return party;
}

export async function createLegalEntity(
  prisma: PrismaClient,
  tenantId: string,
  data: Partial<{
    id: string;
    kind: string;
    legalName: string;
    countryCode: string;
    currency: string;
  }> = {}
) {
  const id = data.id ?? nanoid();
  return prisma.legalEntity.create({
    data: {
      id,
      tenantId,
      kind: data.kind ?? "COMPANY",
      legalName: data.legalName ?? "Test Legal Entity",
      countryCode: data.countryCode ?? "US",
      currency: data.currency ?? "USD",
    },
  });
}

export async function createWorkspace(
  prisma: PrismaClient,
  tenantId: string,
  data: Partial<{
    id: string;
    name: string;
    slug: string;
    publicEnabled: boolean;
    legalEntityId: string;
  }> = {}
) {
  const id = data.id ?? nanoid();
  let legalEntityId = data.legalEntityId;

  if (!legalEntityId) {
    const le = await createLegalEntity(prisma, tenantId);
    legalEntityId = le.id;
  }

  return prisma.workspace.create({
    data: {
      id,
      tenantId,
      name: data.name ?? `Workspace ${id}`,
      slug: data.slug ?? `ws-${id}`,
      publicEnabled: data.publicEnabled ?? true,
      legalEntityId: legalEntityId!,
    },
  });
}

export async function createStudentParty(
  prisma: PrismaClient,
  tenantId: string,
  data: Partial<{ id: string; displayName: string; email?: string }> = {}
) {
  const partyId = data.id ?? nanoid();
  const party = await prisma.party.create({
    data: {
      id: partyId,
      tenantId,
      displayName: data.displayName ?? "Test Student",
      lifecycleStatus: "ACTIVE", // PartyLifecycleStatus
    },
  });

  await prisma.partyRole.create({
    data: {
      id: nanoid(),
      tenantId,
      partyId,
      role: "STUDENT", // PartyRoleType
    },
  });

  if (data.email) {
    await prisma.contactPoint.create({
      data: {
        id: nanoid(),
        tenantId,
        partyId,
        type: "EMAIL",
        value: data.email,
        isPrimary: true,
      },
    });
  }

  return party;
}

export async function createClassGroup(
  prisma: PrismaClient,
  tenantId: string,
  workspaceId: string,
  data: Partial<{
    id: string;
    name: string;
    subject: string;
    level: string;
    status: "ACTIVE" | "ARCHIVED";
  }> = {}
) {
  const id = data.id ?? nanoid();
  return prisma.classGroup.create({
    data: {
      id,
      tenantId,
      workspaceId,
      name: data.name ?? "Math 101",
      subject: data.subject ?? "Math",
      level: data.level ?? "Beginner",
      status: data.status ?? "ACTIVE",
      defaultPricePerSession: 100,
      currency: "USD",
    },
  });
}

export async function createClassEnrollment(
  prisma: PrismaClient,
  tenantId: string,
  workspaceId: string,
  classGroupId: string,
  studentId: string,
  isActive: boolean = true
) {
  return prisma.classEnrollment.create({
    data: {
      id: nanoid(),
      tenantId,
      workspaceId,
      classGroupId,
      studentClientId: studentId,
      payerClientId: studentId,
      isActive,
    },
  });
}

export async function createDocumentWithLink(
  prisma: PrismaClient,
  tenantId: string,
  data: {
    title: string;
    type: "UPLOAD" | "OTHER";
    status: "READY" | "PENDING";
    linkTo?: { entityType: "CLASS_GROUP" | "PARTY"; entityId: string };
    authorId?: string; // removed from prisma create if not supported on model
  }
) {
  const docId = nanoid();
  const doc = await prisma.document.create({
    data: {
      id: docId,
      tenantId,
      title: data.title,
      type: data.type,
      status: data.status,
      // authorId not supported on Document model?
      // Previous analysis said NO.
    },
  });

  if (data.linkTo) {
    await prisma.documentLink.create({
      data: {
        id: nanoid(),
        tenantId,
        documentId: docId,
        entityType: data.linkTo.entityType,
        entityId: data.linkTo.entityId,
      },
    });
  }
  return doc;
}
