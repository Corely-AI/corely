import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@corely/data";

@Injectable()
export class JobLockService {
  private readonly logger = new Logger(JobLockService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Acquires a global advisory lock for the tick process.
   * Lock key is derived from a constant string "worker_tick".
   * Returns true if lock was acquired, false otherwise.
   */
  async tryAcquireTickLock(): Promise<boolean> {
    // Generate a consistent 64-bit integer hash from the string "worker_tick"
    // Using a simple hash function or fixed ID
    // PostgreSQL advisory locks use a 64-bit integer (bigint) key.
    // Let's use a fixed ID for simplicity and consistency: 94563383845
    const lockKey = 94563383845n;

    try {
      const result = await this.prisma.$queryRaw<{ acquired: boolean }[]>`
        SELECT pg_try_advisory_lock(${lockKey}) AS acquired
      `;

      const acquired = result[0]?.acquired ?? false;

      if (acquired) {
        this.logger.log("Acquired global tick lock.");
      } else {
        this.logger.warn("Failed to acquire global tick lock (already running?).");
      }

      return acquired;
    } catch (error) {
      this.logger.error("Error acquiring advisory lock", error);
      return false;
    }
  }

  /**
   * Releases the global advisory lock.
   * Note: In Cloud Run, the connection might drop, releasing the lock automatically once the session ends.
   * However, explicit release is good practice.
   */
  async releaseTickLock(): Promise<void> {
    const lockKey = 94563383845n;
    try {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${lockKey})`;
      this.logger.log("Released global tick lock.");
    } catch (error) {
      this.logger.error("Error releasing advisory lock", error);
    }
  }
}
