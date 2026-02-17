/**
 * Test Sequence Seeder
 *
 * This script creates a sample sequence in the database for testing.
 * Run with: pnpm -F @corely/data tsx scripts/seed-test-sequence.ts
 */

/* eslint-disable no-console, no-process-exit */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  // You'll need to replace this with an actual tenant ID from your database
  const TENANT_ID = process.env.TEST_TENANT_ID || "replace-with-real-tenant-id";

  console.log("🌱 Seeding test sequence...");

  // Create a sample sequence
  const sequence = await prisma.sequence.create({
    data: {
      id: randomUUID(),
      tenantId: TENANT_ID,
      name: "New Lead Follow-up",
      description: "Automated follow-up sequence for new leads",
      ownerUserId: null,
      steps: {
        create: [
          {
            id: randomUUID(),
            tenantId: TENANT_ID,
            stepOrder: 1,
            type: "EMAIL_AUTO",
            dayDelay: 0,
            templateSubject: "Welcome! Let's connect",
            templateBody:
              "Hi {{firstName}},\n\nThank you for your interest! I'd love to learn more about your needs.\n\nBest regards,\nThe Team",
          },
          {
            id: randomUUID(),
            tenantId: TENANT_ID,
            stepOrder: 2,
            type: "TASK",
            dayDelay: 2,
            templateSubject: "Follow up call",
            templateBody: "Call {{firstName}} to discuss their needs",
          },
          {
            id: randomUUID(),
            tenantId: TENANT_ID,
            stepOrder: 3,
            type: "EMAIL_MANUAL",
            dayDelay: 5,
            templateSubject: "Checking in",
            templateBody:
              "Hi {{firstName}},\n\nI wanted to follow up on our previous conversation. Do you have any questions?\n\nBest regards",
          },
        ],
      },
    },
    include: {
      steps: true,
    },
  });

  console.log("✅ Created sequence:", sequence.name);
  console.log(`   ID: ${sequence.id}`);
  console.log(`   Steps: ${sequence.steps.length}`);

  // Create another sequence
  const sequence2 = await prisma.sequence.create({
    data: {
      id: randomUUID(),
      tenantId: TENANT_ID,
      name: "Deal Nurture Campaign",
      description: "Nurture sequence for active deals",
      ownerUserId: null,
      steps: {
        create: [
          {
            id: randomUUID(),
            tenantId: TENANT_ID,
            stepOrder: 1,
            type: "EMAIL_AUTO",
            dayDelay: 0,
            templateSubject: "Great to be working together!",
            templateBody: "Looking forward to partnering with you on this project.",
          },
          {
            id: randomUUID(),
            tenantId: TENANT_ID,
            stepOrder: 2,
            type: "CALL",
            dayDelay: 7,
            templateSubject: "Weekly check-in call",
            templateBody: "Schedule weekly sync to review progress",
          },
        ],
      },
    },
    include: {
      steps: true,
    },
  });

  console.log("✅ Created sequence:", sequence2.name);
  console.log(`   ID: ${sequence2.id}`);
  console.log(`   Steps: ${sequence2.steps.length}`);

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
