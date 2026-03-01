import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import prismaPkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const { PrismaClient } = prismaPkg;

/**
 * Singleton PrismaService managing the PrismaClient lifecycle.
 * This is the ONLY place where PrismaClient should be instantiated.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly skipConnect: boolean;
  private readonly connectTimeoutMs: number;
  private readonly connectMaxAttempts: number;
  private readonly connectRetryDelayMs: number;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL must be set before accessing Prisma client");
    }

    const timeoutRaw = Number(process.env.PRISMA_CONNECT_TIMEOUT_MS ?? "15000");
    const connectTimeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 15000;
    const maxAttemptsRaw = Number(process.env.PRISMA_CONNECT_MAX_ATTEMPTS ?? "5");
    const connectMaxAttempts =
      Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0 ? Math.floor(maxAttemptsRaw) : 5;
    const retryDelayRaw = Number(process.env.PRISMA_CONNECT_RETRY_DELAY_MS ?? "2000");
    const connectRetryDelayMs =
      Number.isFinite(retryDelayRaw) && retryDelayRaw >= 0 ? Math.floor(retryDelayRaw) : 2000;

    const maskedUrl = url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
    console.log(
      `[PrismaService] constructor: url=${maskedUrl}, connectTimeoutMs=${connectTimeoutMs}, connectMaxAttempts=${connectMaxAttempts}, connectRetryDelayMs=${connectRetryDelayMs}, skipConnect=${process.env.SKIP_PRISMA_CONNECT === "true"}`
    );

    const pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: connectTimeoutMs,
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
    this.skipConnect = process.env.SKIP_PRISMA_CONNECT === "true";
    this.connectTimeoutMs = connectTimeoutMs;
    this.connectMaxAttempts = connectMaxAttempts;
    this.connectRetryDelayMs = connectRetryDelayMs;
  }

  async onModuleInit() {
    console.log(`[PrismaService] onModuleInit called (skipConnect=${this.skipConnect})`);
    if (this.skipConnect) {
      console.log("[PrismaService] Skipping connection (SKIP_PRISMA_CONNECT=true)");
      return;
    }

    for (let attempt = 1; attempt <= this.connectMaxAttempts; attempt += 1) {
      const t0 = Date.now();
      console.log(
        `[PrismaService] Connecting to database (attempt=${attempt}/${this.connectMaxAttempts}, timeout=${this.connectTimeoutMs}ms)...`
      );

      try {
        await this.connectWithTimeout();
        console.log(
          `[PrismaService] Database connected in ${Date.now() - t0}ms (attempt=${attempt}/${this.connectMaxAttempts})`
        );
        return;
      } catch (error) {
        console.error(
          `[PrismaService] Connection FAILED after ${Date.now() - t0}ms (attempt=${attempt}/${this.connectMaxAttempts}): ${error instanceof Error ? error.message : error}`
        );
        if (attempt >= this.connectMaxAttempts) {
          throw error;
        }
        const delayMs = this.connectRetryDelayMs * attempt;
        console.warn(`[PrismaService] Retrying database connection in ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    this.logger.log("[destroy] Disconnecting...");
    if (!this.skipConnect) {
      await this.$disconnect();
    }
    await this.pool?.end();
    this.logger.log("[destroy] Disconnected");
  }

  private async connectWithTimeout(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error(`[PrismaService] Connection TIMED OUT after ${this.connectTimeoutMs}ms`);
        reject(new Error(`Prisma connection timed out after ${this.connectTimeoutMs}ms`));
      }, this.connectTimeoutMs);

      this.$connect()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}
