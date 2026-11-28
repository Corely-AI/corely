import { describe, expect, it } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { PrismaService, PrismaExtKvAdapter } from "@corely/data";
import type { ObjectStoragePort, TransactionContext } from "@corely/kernel";
import { PersonnelDocumentsAdapter } from "../infrastructure/prisma/personnel-documents.adapter";

describe("Personnel document storage namespace", () => {
  it.each(["env/e2e", undefined])(
    "uploads and persists the configured object key for prefix %s",
    async (prefix) => {
      const prisma = mockDeep<PrismaService>();
      const tx = mockDeep<PrismaService>();
      const kv = mockDeep<PrismaExtKvAdapter>();
      const storage = mockDeep<ObjectStoragePort>();
      storage.provider.mockReturnValue("gcs");
      storage.bucket.mockReturnValue("synthetic-bucket");
      storage.putObject.mockResolvedValue({ sizeBytes: 4 });
      const documents = new PersonnelDocumentsAdapter(prisma, kv, storage, {
        STORAGE_KEY_PREFIX: prefix,
      });
      await documents.upload(
        { tenantId: "tenant-a", workspaceId: "workspace-a", absenceId: "absence-a" },
        { filename: "example.txt", contentType: "text/plain", bytes: Buffer.from("test") },
        tx as unknown as TransactionContext
      );
      const uploaded = storage.putObject.mock.calls[0][0];
      const expectedPrefix = prefix
        ? `${prefix}/tenant/tenant-a/personnel/`
        : "tenant/tenant-a/personnel/";
      expect(uploaded.objectKey.startsWith(expectedPrefix)).toBe(true);
      expect(uploaded.objectKey).not.toContain("example.txt");
      expect(tx.file.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: "tenant-a",
            objectKey: uploaded.objectKey,
            isPublic: false,
          }),
        })
      );
      expect(prisma.file.create).not.toHaveBeenCalled();
      expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
    }
  );
});
