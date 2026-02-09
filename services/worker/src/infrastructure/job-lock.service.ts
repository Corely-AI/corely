import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { createHash } from "node:crypto";

@Injectable()
export class JobLockService {
  private readonly logger = new Logger(JobLockService.name);

  constructor(private readonly prisma: PrismaService) {}

  async withAdvisoryXactLock<T>(
    args: {
      lockName: string;
      runId: string;
    },
    callback: () => Promise<T>
  ): Promise<{ acquired: boolean; value?: T }> {
    const lockKey = this.hashLockKey(args.lockName);
    try {
      return this.prisma.$transaction(async (tx) => {
        const result = await tx.$queryRaw<{ acquired: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${lockKey}) AS acquired
        `;
        const acquired = result[0]?.acquired ?? false;
        if (!acquired) {
          this.logger.log(
            JSON.stringify({
              msg: "scheduler.lock.skipped",
              runId: args.runId,
              lockName: args.lockName,
            })
          );
          return { acquired: false };
        }

        this.logger.log(
          JSON.stringify({
            msg: "scheduler.lock.acquired",
            runId: args.runId,
            lockName: args.lockName,
          })
        );
        const value = await callback();
        return { acquired: true, value };
      });
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          msg: "scheduler.lock.error",
          runId: args.runId,
          lockName: args.lockName,
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return { acquired: false };
    }
  }

  private hashLockKey(value: string): bigint {
    const digest = createHash("sha256").update(value).digest();
    const hex = digest.subarray(0, 8).toString("hex");
    const raw = BigInt(`0x${hex}`);
    return raw & 0x7fffffffffffffffn;
  }
}
