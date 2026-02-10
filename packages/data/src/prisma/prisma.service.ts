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

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL must be set before accessing Prisma client");
    }

    const timeoutRaw = Number(process.env.PRISMA_CONNECT_TIMEOUT_MS ?? "15000");
    const connectTimeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 15000;

    const maskedUrl = url.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
    console.log(
      `[PrismaService] constructor: url=${maskedUrl}, connectTimeoutMs=${connectTimeoutMs}, skipConnect=${process.env.SKIP_PRISMA_CONNECT === "true"}`
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
  }

  async onModuleInit() {
    console.log(`[PrismaService] onModuleInit called (skipConnect=${this.skipConnect})`);
    if (this.skipConnect) {
      console.log("[PrismaService] Skipping connection (SKIP_PRISMA_CONNECT=true)");
      return;
    }

    const t0 = Date.now();
    console.log(`[PrismaService] Connecting to database (timeout=${this.connectTimeoutMs}ms)...`);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error(`[PrismaService] Connection TIMED OUT after ${this.connectTimeoutMs}ms`);
        reject(new Error(`Prisma connection timed out after ${this.connectTimeoutMs}ms`));
      }, this.connectTimeoutMs);

      this.$connect()
        .then(() => {
          clearTimeout(timeout);
          console.log(`[PrismaService] Database connected in ${Date.now() - t0}ms`);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          console.error(
            `[PrismaService] Connection FAILED after ${Date.now() - t0}ms: ${error instanceof Error ? error.message : error}`
          );
          reject(error);
        });
    });
  }

  async onModuleDestroy() {
    this.logger.log("[destroy] Disconnecting...");
    if (!this.skipConnect) {
      await this.$disconnect();
    }
    await this.pool?.end();
    this.logger.log("[destroy] Disconnected");
  }
}
