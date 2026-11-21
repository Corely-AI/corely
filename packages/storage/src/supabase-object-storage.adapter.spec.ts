import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import { SupabaseObjectStorageAdapter } from "./supabase-object-storage.adapter";

const invoice = {
  tenantId: "workspace-1",
  objectKey: "test/tenant/workspace-1/invoices/invoice-1/invoice.pdf",
};

describe("Supabase invoice PDF storage", () => {
  function setup() {
    const client = new S3Client({
      region: "us-east-1",
      endpoint: "https://project.supabase.co/storage/v1/s3",
      forcePathStyle: true,
      credentials: { accessKeyId: "test-id", secretAccessKey: "test-secret" },
    });
    return { client, storage: new SupabaseObjectStorageAdapter(client, "invoice-pdfs") };
  }

  it("uses the same private object location for retry writes and authorized signing", async () => {
    const { client, storage } = setup();
    const send = vi.spyOn(client, "send").mockResolvedValue({ ETag: "etag" });
    const bytes = Buffer.from("%PDF-1.7");
    await storage.putObject({ ...invoice, contentType: "application/pdf", bytes });
    await storage.putObject({ ...invoice, contentType: "application/pdf", bytes });
    for (const [call] of send.mock.calls) {
      expect(call).toBeInstanceOf(PutObjectCommand);
      expect((call as PutObjectCommand).input).toMatchObject({
        Bucket: "invoice-pdfs",
        Key: invoice.objectKey,
        Body: bytes,
      });
    }
    const signed = await storage.createSignedDownloadUrl({ ...invoice, expiresInSeconds: 60 });
    const url = new URL(signed.url);
    expect(url.pathname).toBe(`/storage/v1/s3/invoice-pdfs/${invoice.objectKey}`);
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(url.searchParams.get("X-Amz-Expires")).toBe("60");
  });

  it("rejects another workspace before contacting storage", async () => {
    const { client, storage } = setup();
    const send = vi.spyOn(client, "send").mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2]) },
    });
    await expect(storage.getObject({ ...invoice, tenantId: "workspace-2" })).rejects.toThrow(
      "does not belong to the requested workspace"
    );
    expect(send).not.toHaveBeenCalled();
    await expect(storage.getObject(invoice)).resolves.toEqual(Buffer.from([1, 2]));
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetObjectCommand);
  });
});
