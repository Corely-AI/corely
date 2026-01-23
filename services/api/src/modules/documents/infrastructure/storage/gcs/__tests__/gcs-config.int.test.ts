import { Test } from "@nestjs/testing";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { EnvModule, EnvService } from "@corely/config";

const storageCtor = vi.fn();

vi.mock("@google-cloud/storage", () => {
  class Storage {
    constructor(options: unknown) {
      storageCtor(options);
    }
  }
  return { Storage };
});

describe("GCS config integration", () => {
  beforeEach(() => {
    storageCtor.mockClear();
  });

  it("maps GCP_* env vars into storage config", async () => {
    const serviceAccount = JSON.stringify({
      type: "service_account",
      project_id: "demo-project",
      private_key_id: "test-key-id",
      private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      client_email: "gcs@example.com",
    });

    const originalServiceAccount = process.env.GCP_STORAGE_SERVICE_ACCOUNT;
    const originalBucket = process.env.GCP_BUCKET_NAME;

    process.env.GCP_STORAGE_SERVICE_ACCOUNT = serviceAccount;
    process.env.GCP_BUCKET_NAME = "test-bucket";

    const module = await Test.createTestingModule({
      imports: [EnvModule.forTest()],
    }).compile();

    const env = module.get(EnvService);
    expect(env.GOOGLE_APPLICATION_CREDENTIALS).toBe(serviceAccount);
    expect(env.STORAGE_BUCKET).toBe("test-bucket");
    expect(env.GOOGLE_CLOUD_PROJECT).toBe("demo-project");

    if (originalServiceAccount === undefined) {
      delete process.env.GCP_STORAGE_SERVICE_ACCOUNT;
    } else {
      process.env.GCP_STORAGE_SERVICE_ACCOUNT = originalServiceAccount;
    }

    if (originalBucket === undefined) {
      delete process.env.GCP_BUCKET_NAME;
    } else {
      process.env.GCP_BUCKET_NAME = originalBucket;
    }
  });

  it("creates a GCS client using JSON credentials", async () => {
    const serviceAccount = JSON.stringify({
      type: "service_account",
      project_id: "demo-project",
      private_key_id: "test-key-id",
      private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
      client_email: "gcs@example.com",
    });

    const { createGcsClient } = await import("../gcs.client");
    createGcsClient({ keyFilename: serviceAccount });

    expect(storageCtor).toHaveBeenCalledTimes(1);
    expect(storageCtor).toHaveBeenCalledWith({
      projectId: "demo-project",
      credentials: {
        type: "service_account",
        project_id: "demo-project",
        private_key_id: "test-key-id",
        private_key: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
        client_email: "gcs@example.com",
      },
    });
  });
});
