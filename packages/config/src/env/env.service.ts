import { Injectable } from "@nestjs/common";
import { type Env, SECRET_ENV_KEYS } from "./env.schema";

/**
 * Injectable service providing typed access to environment configuration.
 * Use this instead of direct process.env access throughout the application.
 */
@Injectable()
export class EnvService {
  constructor(private readonly config: Env) {}

  // ============================================================================
  // COMMON SETTINGS
  // ============================================================================

  get NODE_ENV(): "development" | "test" | "production" {
    return this.config.NODE_ENV;
  }

  get APP_ENV(): string {
    return this.config.APP_ENV;
  }

  get LOG_LEVEL(): "error" | "warn" | "info" | "debug" | "verbose" {
    return this.config.LOG_LEVEL;
  }

  // ============================================================================
  // DATABASE
  // ============================================================================

  get DATABASE_URL(): string {
    return this.config.DATABASE_URL;
  }

  get REDIS_URL(): string | undefined {
    return this.config.REDIS_URL;
  }

  get WORKFLOW_QUEUE_DRIVER(): "memory" | "cloudtasks" | undefined {
    return this.config.WORKFLOW_QUEUE_DRIVER;
  }

  get WORKFLOW_CLOUDTASKS_LOCATION(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_LOCATION;
  }

  get WORKFLOW_CLOUDTASKS_QUEUE_PREFIX(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_QUEUE_PREFIX;
  }

  get WORKFLOW_CLOUDTASKS_TARGET_BASE_URL(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_TARGET_BASE_URL;
  }

  get WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT;
  }

  get WORKFLOW_QUEUE_SECRET(): string | undefined {
    return this.config.WORKFLOW_QUEUE_SECRET;
  }

  // ============================================================================
  // PORTS
  // ============================================================================

  get PORT(): number {
    return this.config.PORT;
  }

  get WEB_PORT(): number {
    return this.config.WEB_PORT;
  }

  get MOCK_PORT(): number {
    return this.config.MOCK_PORT;
  }

  get WORKER_PORT(): number {
    return this.config.WORKER_PORT;
  }

  // ============================================================================
  // WORKER
  // ============================================================================

  get API_BASE_URL(): string | undefined {
    return this.config.API_BASE_URL;
  }

  get WORKER_API_SERVICE_TOKEN(): string | undefined {
    return this.config.WORKER_API_SERVICE_TOKEN;
  }

  get WORKER_TICK_RUNNERS(): string | undefined {
    return this.config.WORKER_TICK_RUNNERS;
  }

  get WORKER_TICK_OVERALL_MAX_MS(): number | undefined {
    return this.config.WORKER_TICK_OVERALL_MAX_MS;
  }

  get WORKER_TICK_RUNNER_MAX_MS(): number | undefined {
    return this.config.WORKER_TICK_RUNNER_MAX_MS;
  }

  get WORKER_TICK_RUNNER_MAX_ITEMS(): number | undefined {
    return this.config.WORKER_TICK_RUNNER_MAX_ITEMS;
  }

  get WORKER_TICK_SHARD_INDEX(): number | undefined {
    return this.config.WORKER_TICK_SHARD_INDEX;
  }

  get WORKER_TICK_SHARD_COUNT(): number | undefined {
    return this.config.WORKER_TICK_SHARD_COUNT;
  }

  get WORKER_DISABLE_POLLING(): string | undefined {
    return this.config.WORKER_DISABLE_POLLING;
  }

  get WORKER_TICK_LOOP_INTERVAL_MS(): number {
    return this.config.WORKER_TICK_LOOP_INTERVAL_MS;
  }

  get WORKER_TICK_LOOP_MAX_JITTER_MS(): number {
    return this.config.WORKER_TICK_LOOP_MAX_JITTER_MS;
  }

  get WORKER_TICK_LOOP_ERROR_BACKOFF_MS(): number {
    return this.config.WORKER_TICK_LOOP_ERROR_BACKOFF_MS;
  }

  get WORKER_IDLE_BACKOFF_MIN_MS(): number {
    return this.config.WORKER_IDLE_BACKOFF_MIN_MS;
  }

  get WORKER_IDLE_BACKOFF_MAX_MS(): number {
    return this.config.WORKER_IDLE_BACKOFF_MAX_MS;
  }

  get WORKER_IDLE_BACKOFF_JITTER_MS(): number {
    return this.config.WORKER_IDLE_BACKOFF_JITTER_MS;
  }

  get WORKER_BUSY_LOOP_DELAY_MS(): number {
    return this.config.WORKER_BUSY_LOOP_DELAY_MS;
  }

  get WORKER_SHUTDOWN_TIMEOUT_MS(): number {
    return this.config.WORKER_SHUTDOWN_TIMEOUT_MS;
  }

  get OUTBOX_BATCH_SIZE(): number {
    return this.config.OUTBOX_BATCH_SIZE;
  }

  get OUTBOX_CONCURRENCY(): number {
    return this.config.OUTBOX_CONCURRENCY;
  }

  get PDF_RENDER_CONCURRENCY(): number {
    return this.config.PDF_RENDER_CONCURRENCY;
  }

  get OUTBOX_LEASE_DURATION_MS(): number {
    return this.config.OUTBOX_LEASE_DURATION_MS;
  }

  get OUTBOX_LEASE_HEARTBEAT_MS(): number {
    return this.config.OUTBOX_LEASE_HEARTBEAT_MS;
  }

  get OUTBOX_MAX_ATTEMPTS(): number {
    return this.config.OUTBOX_MAX_ATTEMPTS;
  }

  get OUTBOX_RETRY_BASE_MS(): number {
    return this.config.OUTBOX_RETRY_BASE_MS;
  }

  get OUTBOX_RETRY_MAX_MS(): number {
    return this.config.OUTBOX_RETRY_MAX_MS;
  }

  get OUTBOX_RETRY_JITTER_MS(): number {
    return this.config.OUTBOX_RETRY_JITTER_MS;
  }

  get CLASSES_BILLING_RUN_ENABLED(): boolean {
    return this.config.CLASSES_BILLING_RUN_ENABLED;
  }

  get CLASSES_BILLING_RUN_TIME(): string {
    return this.config.CLASSES_BILLING_RUN_TIME;
  }

  get CLASSES_BILLING_RUN_TIMEZONE(): string {
    return this.config.CLASSES_BILLING_RUN_TIMEZONE;
  }

  get INVOICE_REMINDER_RUN_ENABLED(): boolean {
    return this.config.INVOICE_REMINDER_RUN_ENABLED;
  }

  get INVOICE_REMINDER_RUN_TIME(): string {
    return this.config.INVOICE_REMINDER_RUN_TIME;
  }

  get INVOICE_REMINDER_RUN_TIMEZONE(): string {
    return this.config.INVOICE_REMINDER_RUN_TIMEZONE;
  }

  // ============================================================================
  // AI PROVIDERS
  // ============================================================================

  get AI_MODEL_PROVIDER(): "openai" | "anthropic" {
    return this.config.AI_MODEL_PROVIDER;
  }

  get AI_MODEL_ID(): string {
    return this.config.AI_MODEL_ID;
  }

  get SPEECH_TO_TEXT_PROVIDER(): "openai" | "google" | "none" | undefined {
    return this.config.SPEECH_TO_TEXT_PROVIDER;
  }

  get OPENAI_API_KEY(): string | undefined {
    return this.config.OPENAI_API_KEY;
  }

  get ANTHROPIC_API_KEY(): string | undefined {
    return this.config.ANTHROPIC_API_KEY;
  }

  get CRM_AI_ENABLED(): boolean {
    return this.config.CRM_AI_ENABLED;
  }

  get CRM_AI_V2_ANALYTICS_ENABLED(): boolean {
    return this.config.CRM_AI_V2_ANALYTICS_ENABLED;
  }

  get CRM_AI_INTENT_SENTIMENT_ENABLED(): boolean {
    return this.config.CRM_AI_INTENT_SENTIMENT_ENABLED;
  }

  // ============================================================================
  // EMAIL PROVIDERS
  // ============================================================================

  get EMAIL_PROVIDER(): "resend" | "sendgrid" | "ses" | "postmark" {
    return this.config.EMAIL_PROVIDER;
  }

  get RESEND_API_KEY(): string | undefined {
    return this.config.RESEND_API_KEY;
  }

  get RESEND_FROM(): string | undefined {
    return this.config.RESEND_FROM;
  }

  get RESEND_REPLY_TO(): string | undefined {
    return this.config.RESEND_REPLY_TO;
  }

  get RESEND_WEBHOOK_SECRET(): string | undefined {
    return this.config.RESEND_WEBHOOK_SECRET;
  }

  // ============================================================================
  // OBJECT STORAGE
  // ============================================================================

  get STORAGE_PROVIDER(): "gcs" | "s3" | "local" {
    return this.config.STORAGE_PROVIDER;
  }

  get STORAGE_BUCKET(): string {
    return this.config.STORAGE_BUCKET;
  }

  get STORAGE_KEY_PREFIX(): string | undefined {
    return this.config.STORAGE_KEY_PREFIX;
  }

  get SIGNED_URL_UPLOAD_TTL_SECONDS(): number {
    return this.config.SIGNED_URL_UPLOAD_TTL_SECONDS;
  }

  get SIGNED_URL_DOWNLOAD_TTL_SECONDS(): number {
    return this.config.SIGNED_URL_DOWNLOAD_TTL_SECONDS;
  }

  get MAX_UPLOAD_BYTES(): number | undefined {
    return this.config.MAX_UPLOAD_BYTES;
  }

  get GOOGLE_CLOUD_PROJECT(): string | undefined {
    return this.config.GOOGLE_CLOUD_PROJECT;
  }

  get GOOGLE_APPLICATION_CREDENTIALS(): string | undefined {
    return this.config.GOOGLE_APPLICATION_CREDENTIALS;
  }

  // ============================================================================
  // OBSERVABILITY
  // ============================================================================

  get OBSERVABILITY_PROVIDER(): "none" | "otel" | "langfuse" {
    return this.config.OBSERVABILITY_PROVIDER;
  }

  get OBSERVABILITY_SAMPLE_RATIO(): number {
    return this.config.OBSERVABILITY_SAMPLE_RATIO;
  }

  get OBSERVABILITY_MASKING_MODE(): "off" | "standard" | "strict" {
    return this.config.OBSERVABILITY_MASKING_MODE;
  }

  get OTEL_EXPORTER_OTLP_ENDPOINT(): string | undefined {
    return this.config.OTEL_EXPORTER_OTLP_ENDPOINT;
  }

  get OTEL_EXPORTER_OTLP_HEADERS(): string | undefined {
    return this.config.OTEL_EXPORTER_OTLP_HEADERS;
  }

  get LANGFUSE_BASE_URL(): string | undefined {
    return this.config.LANGFUSE_BASE_URL;
  }

  get LANGFUSE_PUBLIC_KEY(): string | undefined {
    return this.config.LANGFUSE_PUBLIC_KEY;
  }

  get LANGFUSE_SECRET_KEY(): string | undefined {
    return this.config.LANGFUSE_SECRET_KEY;
  }

  // ============================================================================
  // SECURITY & AUTH
  // ============================================================================

  get JWT_SECRET(): string | undefined {
    return this.config.JWT_SECRET;
  }

  get WEB_BASE_URL(): string | undefined {
    return this.config.WEB_BASE_URL;
  }

  get PASSWORD_RESET_TOKEN_TTL_MINUTES(): number {
    return this.config.PASSWORD_RESET_TOKEN_TTL_MINUTES;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Returns true if running in production mode.
   */
  isProd(): boolean {
    return this.config.NODE_ENV === "production";
  }

  /**
   * Returns true if running in development mode.
   */
  isDev(): boolean {
    return this.config.NODE_ENV === "development";
  }

  /**
   * Returns true if running in test mode.
   */
  isTest(): boolean {
    return this.config.NODE_ENV === "test";
  }

  /**
   * Returns a safe summary of configuration for debugging.
   * Excludes sensitive values (secrets, API keys, connection strings).
   */
  safeSummary(): Record<string, string | number | boolean> {
    const summary: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(this.config)) {
      if (SECRET_ENV_KEYS.has(key as keyof Env)) {
        summary[key] = "[REDACTED]";
      } else if (value !== undefined && value !== null) {
        summary[key] = value;
      }
    }

    return summary;
  }

  /**
   * Returns the full config object (for internal use only).
   * WARNING: Contains secrets - do not log or expose this!
   */
  getConfig(): Readonly<Env> {
    return this.config;
  }
}
