import { describe, expect, it } from "vitest";
import { NoopLogger } from "@corely/kernel";
import { GetPublicFileUrlUseCase } from "../application/use-cases/get-public-file-url/get-public-file-url.usecase";
import { InMemoryFileRepo } from "../testkit/fakes/in-memory-file-repo";
import { FakeObjectStoragePort } from "../testkit/fakes/fake-object-storage";
import { FileEntity } from "../domain/file.entity";

describe("GetPublicFileUrlUseCase", () => {
  it("returns not found for private files", async () => {
    const fileRepo = new InMemoryFileRepo();
    const storage = new FakeObjectStoragePort();
    const useCase = new GetPublicFileUrlUseCase({
      logger: new NoopLogger(),
      fileRepo,
      objectStorage: storage,
      downloadTtlSeconds: 60,
    });

    const file = new FileEntity({
      id: "file-1",
      tenantId: "tenant-1",
      documentId: "doc-1",
      kind: "ORIGINAL",
      storageProvider: "gcs",
      bucket: storage.bucket(),
      objectKey: "path/to/file",
      isPublic: false,
      createdAt: new Date(),
    });
    await fileRepo.create(file);

    const result = await useCase.execute(
      { fileId: "file-1" },
      { requestId: "req-1", correlationId: "req-1" }
    );

    expect(result.ok).toBe(false);
  });

  it("returns direct GCS URL for public files without tenant context", async () => {
    const fileRepo = new InMemoryFileRepo();
    const storage = new FakeObjectStoragePort();
    const useCase = new GetPublicFileUrlUseCase({
      logger: new NoopLogger(),
      fileRepo,
      objectStorage: storage,
      downloadTtlSeconds: 60,
    });

    const file = new FileEntity({
      id: "file-2",
      tenantId: "tenant-2",
      documentId: "doc-2",
      kind: "ORIGINAL",
      storageProvider: "gcs",
      bucket: storage.bucket(),
      objectKey: "public/file-2",
      isPublic: true,
      createdAt: new Date(),
    });
    await fileRepo.create(file);

    const result = await useCase.execute(
      { fileId: "file-2" },
      { requestId: "req-2", correlationId: "req-2" }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.url).toBe("https://storage.googleapis.com/fake-bucket/public%2Ffile-2");
    }
  });
});
