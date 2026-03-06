import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class ExpireHoldsTask {
  private readonly logger = new Logger(ExpireHoldsTask.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every minute to clean up stale holds across all tenants
  @Cron(CronExpression.EVERY_MINUTE)
  async handle() {
    this.logger.debug("Running expire holds task...");
    try {
      const result = await this.prisma.bookingHold.updateMany({
        where: {
          status: "ACTIVE",
          expiresAt: { lt: new Date() },
        },
        data: { status: "EXPIRED" },
      });
      if (result.count > 0) {
        this.logger.log(`Expired ${result.count} stale booking holds`);
      }
    } catch (err: any) {
      this.logger.error(`Failed to expire holds: ${err.message}`, err.stack);
    }
  }
}
