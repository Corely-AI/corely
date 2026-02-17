import { z } from "zod";

/**
 * Zod schema for environment variables.
 * Validates and coerces types for all required and optional env vars.
 */
export const envSchema = z.object({
  // ============================================================================
  // COMMON SETTINGS
  // ============================================================================
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.string().default("dev"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug", "verbose"]).default("info"),

  // ============================================================================
  // POSTGRES DATABASE
  // ============================================================================
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),

  // ============================================================================
  // REDIS CACHE & QUEUE
  // ============================================================================
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis connection string").optional(),
  WORKFLOW_QUEUE_DRIVER: z.enum(["memory", "cloudtasks"]).optional(),
  WORKFLOW_CLOUDTASKS_LOCATION: z.string().optional(),
  WORKFLOW_CLOUDTASKS_QUEUE_PREFIX: z.string().optional(),
  WORKFLOW_CLOUDTASKS_TARGET_BASE_URL: z.string().url().optional(),
  WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT: z.string().optional(),
  WORKFLOW_QUEUE_SECRET: z.string().optional(),

  // ============================================================================
  // PORTS
  // ============================================================================
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_PORT: z.coerce.number().int().positive().default(8080),
  MOCK_PORT: z.coerce.number().int().positive().default(4000),
  WORKER_PORT: z.coerce.number().int().positive().default(3001),

  // ============================================================================
  // WORKER
  // ============================================================================
  API_BASE_URL: z.string().url().optional(),
  WORKER_API_SERVICE_TOKEN: z.string().optional(),

  // Worker Tick Configuration
  WORKER_TICK_RUNNERS: z.string().optional(),
  WORKER_TICK_OVERALL_MAX_MS: z.coerce.number().int().positive().optional(),
  WORKER_TICK_RUNNER_MAX_MS: z.coerce.number().int().positive().optional(),
  WORKER_TICK_RUNNER_MAX_ITEMS: z.coerce.number().int().positive().optional(),
  WORKER_TICK_SHARD_INDEX: z.coerce.number().int().min(0).optional(),
  WORKER_TICK_SHARD_COUNT: z.coerce.number().int().positive().optional(),
  WORKER_DISABLE_POLLING: z.string().optional(),
  WORKER_TICK_LOOP_INTERVAL_MS: z.coerce.number().int().positive().default(10_000),
  WORKER_TICK_LOOP_MAX_JITTER_MS: z.coerce.number().int().min(0).default(2_000),
  WORKER_TICK_LOOP_ERROR_BACKOFF_MS: z.coerce.number().int().positive().default(30_000),
  WORKER_IDLE_BACKOFF_MIN_MS: z.coerce.number().int().positive().default(1_000),
  WORKER_IDLE_BACKOFF_MAX_MS: z.coerce.number().int().positive().default(30_000),
  WORKER_IDLE_BACKOFF_JITTER_MS: z.coerce.number().int().min(0).default(500),
  WORKER_BUSY_LOOP_DELAY_MS: z.coerce.number().int().min(0).default(250),
  WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  OUTBOX_CONCURRENCY: z.coerce.number().int().positive().default(10),
  PDF_RENDER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  OUTBOX_LEASE_DURATION_MS: z.coerce.number().int().positive().default(60_000),
  OUTBOX_LEASE_HEARTBEAT_MS: z.coerce.number().int().positive().default(15_000),
  OUTBOX_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  OUTBOX_RETRY_BASE_MS: z.coerce.number().int().positive().default(5_000),
  OUTBOX_RETRY_MAX_MS: z.coerce.number().int().positive().default(120_000),
  OUTBOX_RETRY_JITTER_MS: z.coerce.number().int().min(0).default(500),
  CLASSES_BILLING_RUN_ENABLED: z
    .preprocess((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized)) {
          return true;
        }
        if (["false", "0", "no", "n"].includes(normalized)) {
          return false;
        }
      }
      return value;
    }, z.boolean())
    .default(true),
  CLASSES_BILLING_RUN_TIME: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("02:00"),
  CLASSES_BILLING_RUN_TIMEZONE: z.string().default("Europe/Berlin"),
  INVOICE_REMINDER_RUN_ENABLED: z
    .preprocess((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized)) {
          return true;
        }
        if (["false", "0", "no", "n"].includes(normalized)) {
          return false;
        }
      }
      return value;
    }, z.boolean())
    .default(true),
  INVOICE_REMINDER_RUN_TIME: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .default("08:00"),
  INVOICE_REMINDER_RUN_TIMEZONE: z.string().default("Europe/Berlin"),

  // ============================================================================
  // AI PROVIDERS
  // ============================================================================
  AI_MODEL_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  AI_MODEL_ID: z.string().default("gpt-4o-mini"),
  SPEECH_TO_TEXT_PROVIDER: z.enum(["openai", "google", "none"]).optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CRM_AI_ENABLED: z
    .preprocess((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized)) {
          return true;
        }
        if (["false", "0", "no", "n"].includes(normalized)) {
          return false;
        }
      }
      return value;
    }, z.boolean())
    .default(false),
  CRM_AI_V2_ANALYTICS_ENABLED: z
    .preprocess((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized)) {
          return true;
        }
        if (["false", "0", "no", "n"].includes(normalized)) {
          return false;
        }
      }
      return value;
    }, z.boolean())
    .default(false),
  CRM_AI_INTENT_SENTIMENT_ENABLED: z
    .preprocess((value) => {
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "y"].includes(normalized)) {
          return true;
        }
        if (["false", "0", "no", "n"].includes(normalized)) {
          return false;
        }
      }
      return value;
    }, z.boolean())
    .default(false),

  // ============================================================================
  // EMAIL PROVIDERS
  // ============================================================================
  EMAIL_PROVIDER: z.enum(["resend", "sendgrid", "ses", "postmark"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  RESEND_REPLY_TO: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // ============================================================================
  // OBJECT STORAGE (GCS)
  // ============================================================================
  STORAGE_PROVIDER: z.enum(["gcs", "s3", "local"]).default("gcs"),
  STORAGE_BUCKET: z.string().default("uploads"),
  STORAGE_KEY_PREFIX: z.string().optional(),
  SIGNED_URL_UPLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  SIGNED_URL_DOWNLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().optional(),

  // Google Cloud
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // ============================================================================
  // OBSERVABILITY
  // ============================================================================
  OBSERVABILITY_PROVIDER: z.enum(["none", "otel", "langfuse"]).default("none"),
  OBSERVABILITY_SAMPLE_RATIO: z.coerce.number().min(0).max(1).default(1),
  OBSERVABILITY_MASKING_MODE: z.enum(["off", "standard", "strict"]).default("standard"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  LANGFUSE_BASE_URL: z.string().url().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),

  // ============================================================================
  // SECURITY & AUTH
  // ============================================================================
  JWT_SECRET: z.string().optional(),
  WEB_BASE_URL: z.string().url().optional(),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  // ============================================================================
  // CLOUD RUN / K8S MARKERS (for detection only, not user-configurable)
  // ============================================================================
  K_SERVICE: z.string().optional(),
  KUBERNETES_SERVICE_HOST: z.string().optional(),
  ECS_CONTAINER_METADATA_URI: z.string().optional(),
});

/**
 * Type representing the validated environment configuration.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * List of environment variable keys that should be treated as secrets
 * and excluded from logs or debug output.
 */
export const SECRET_ENV_KEYS: ReadonlySet<keyof Env> = new Set([
  "DATABASE_URL",
  "REDIS_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "JWT_SECRET",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "LANGFUSE_SECRET_KEY",
  "OTEL_EXPORTER_OTLP_HEADERS",
  "WORKFLOW_QUEUE_SECRET",
  "WORKER_API_SERVICE_TOKEN",
]);

/**
 * Validates process.env against the schema and returns a typed Env object.
 * Throws a detailed error if validation fails.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): Env {
  // Preprocess env to trim surrounding quotes (common issue with shell exports)
  const cleanedEnv = Object.entries(env).reduce<Record<string, string | undefined>>(
    (acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = value.replace(/^["'](.+)["']$/, "$1");
      } else {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );

  try {
    return envSchema.parse(cleanedEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingOrInvalid = error.errors.map((err) => {
        const path = err.path.join(".");
        const message = err.message;
        return `  - ${path}: ${message}`;
      });

      throw new Error(
        `Environment validation failed:\n${missingOrInvalid.join("\n")}\n\n` +
          `Please check your environment variables or .env files.`
      );
    }
    throw error;
  }
}
