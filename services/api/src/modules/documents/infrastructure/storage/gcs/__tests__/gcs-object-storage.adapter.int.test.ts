import { describe, expect, it, vi } from "vitest";
import { GcsObjectStorageAdapter } from "../gcs-object-storage.adapter";

describe("GcsObjectStorageAdapter upload", () => {
  it("uploads a sample file and returns metadata", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const getMetadata = vi
      .fn()
      .mockResolvedValue([{ etag: "etag-123", size: "5", contentType: "text/plain" }]);

    const file = () => ({
      save,
      getMetadata,
    });

    const bucket = () => ({
      file,
    });

    const client = {
      bucket,
    } as any;

    const adapter = new GcsObjectStorageAdapter(client, "test-bucket");
    const bytes = Buffer.from("hello");

    const result = await adapter.putObject({
      tenantId: "tenant-1",
      objectKey: "sample.txt",
      contentType: "text/plain",
      bytes,
    });

    expect(save).toHaveBeenCalledWith(bytes, { contentType: "text/plain", resumable: false });
    expect(getMetadata).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ etag: "etag-123", sizeBytes: 5 });
  });
});
