// Simple config for Prisma 7 - uses environment variables
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Only load .env files in development (not in production/test/containers)
// In production/test/Docker, environment variables are injected directly
const shouldLoadEnvFiles =
  process.env.NODE_ENV !== "production" &&
  process.env.NODE_ENV !== "test" &&
  !process.env.DOCKER_CONTAINER;

if (shouldLoadEnvFiles) {
  // Load environment variables from workspace root (only if files exist)
  const envPath = resolve("../../.env");
  const envDevPath = resolve("../../.env.dev");

  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
  if (existsSync(envDevPath)) {
    config({ path: envDevPath, override: false });
  }
}

export default {
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
