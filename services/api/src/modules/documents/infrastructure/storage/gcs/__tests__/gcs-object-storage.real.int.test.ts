import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { EnvModule, EnvService } from "@corely/config";
import { GcsObjectStorageAdapter } from "../gcs-object-storage.adapter";
import { createGcsClient } from "../gcs.client";

const envPath = resolve(__dirname, "../../../../../../../../../.env");
loadEnv({ path: envPath });

describe("GCS real upload", () => {
  it("uploads and deletes a sample file in the configured bucket", async () => {
    const module = await Test.createTestingModule({
      imports: [EnvModule.forTest()],
    }).compile();

    const env = module.get(EnvService);
    if (!env.GOOGLE_APPLICATION_CREDENTIALS || !env.STORAGE_BUCKET) {
      throw new Error("Missing GCP credentials or bucket name for real upload test.");
    }

    const client = createGcsClient({
      projectId: env.GOOGLE_CLOUD_PROJECT,
      keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    const adapter = new GcsObjectStorageAdapter(client, env.STORAGE_BUCKET);

    const objectKey = `codex-int/${Date.now()}-sample.txt`;
    const bytes = Buffer.from("hello corely");

    const result = await adapter.putObject({
      tenantId: "corely-test",
      objectKey,
      contentType: "text/plain",
      bytes,
    });

    expect(result.sizeBytes).toBe(bytes.length);
    await client.bucket(env.STORAGE_BUCKET).file(objectKey).delete();
  });
});
