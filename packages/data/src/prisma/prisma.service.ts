import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
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
    if (this.skipConnect) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
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

  async onModuleDestroy() {
    if (!this.skipConnect) {
      await this.$disconnect();
    }
    await this.pool?.end();
  }
}
