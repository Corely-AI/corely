import { Module, Global } from "@nestjs/common";
import { TestHarnessController } from "./test-harness.controller";
import { TestHarnessService } from "./test-harness.service";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

@Global()
@Module({
  controllers: [TestHarnessController],
  providers: [
    {
      provide: "TEST_HARNESS_SERVICE",
      useFactory: () => {
        // Create a new Prisma client for test harness with Prisma 7 adapter
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        return new TestHarnessService(new PrismaClient({ adapter }) as any);
      },
    },
  ],
  exports: ["TEST_HARNESS_SERVICE"],
})
export class TestHarnessModule {}
