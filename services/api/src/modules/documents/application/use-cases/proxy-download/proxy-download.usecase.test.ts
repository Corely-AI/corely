import { beforeEach, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { type ObjectStoragePort, unwrap } from "@corely/kernel";
import { ProxyDownloadUseCase } from "./proxy-download.usecase";
import { GetDownloadUrlUseCase } from "../get-download-url/get-download-url.usecase";
import { GetPublicFileUrlUseCase } from "../get-public-file-url/get-public-file-url.usecase";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryFileRepo } from "../../../testkit/fakes/in-memory-file-repo";
import { DocumentAggregate } from "../../../domain/document.aggregate";
import { NoopLogger } from "@corely/kernel";

const documents = new InMemoryDocumentRepo();
const files = new InMemoryFileRepo();
const storage = mockDeep<ObjectStoragePort>();
const deps = { documentRepo: documents, fileRepo: files, objectStorage: storage };
const proxy = new ProxyDownloadUseCase(deps);
const signed = new GetDownloadUrlUseCase({
  ...deps,
  logger: new NoopLogger(),
  downloadTtlSeconds: 60,
});
const publicUrl = new GetPublicFileUrlUseCase({
  fileRepo: files,
  objectStorage: storage,
  logger: new NoopLogger(),
  downloadTtlSeconds: 60,
});

beforeEach(async () => {
  documents.documents.clear();
  files.files.clear();
  vi.clearAllMocks();
  for (const [id, tenantId, isPublic] of [
    ["document-a", "tenant-a", false],
    ["document-other", "tenant-a", false],
    ["document-b", "tenant-b", false],
    ["published", "tenant-a", true],
  ] as const) {
    const document = DocumentAggregate.create({
      id,
      tenantId,
      type: "UPLOAD",
      status: "READY",
      createdAt: new Date(),
      file: {
        id: `file-${id}`,
        kind: "ORIGINAL",
        storageProvider: "gcs",
        bucket: "test",
        objectKey: `tenant/${tenantId}/${id}/private.txt`,
        contentType: "text/plain",
        createdAt: new Date(),
        isPublic,
      },
    });
    await documents.create(document);
    await files.create(document.files[0]);
  }
  storage.getObject.mockResolvedValue(Buffer.from("synthetic private bytes"));
  storage.createSignedDownloadUrl.mockResolvedValue({
    url: "https://synthetic.invalid/download",
    expiresAt: new Date(),
  });
});

it("downloads only a file belonging to the requested document and tenant", async () => {
  const result = unwrap(
    await proxy.execute(
      { documentId: "document-a", fileId: "file-document-a" },
      { tenantId: "tenant-a" }
    )
  );
  expect(result.buffer.toString()).toBe("synthetic private bytes");
  expect(storage.getObject).toHaveBeenCalledWith({
    tenantId: "tenant-a",
    objectKey: "tenant/tenant-a/document-a/private.txt",
  });
});

it.each([
  ["document-a", "file-document-other", "tenant-a"],
  ["document-a", "file-document-b", "tenant-a"],
  ["document-a", "file-document-a", "tenant-b"],
  ["missing", "file-document-a", "tenant-a"],
])(
  "denies a guessed/mismatched document-file pair (%s/%s/%s) before any bytes or URL",
  async (documentId, fileId, tenantId) => {
    expect((await proxy.execute({ documentId, fileId }, { tenantId })).ok).toBe(false);
    expect((await signed.execute({ documentId, fileId }, { tenantId })).ok).toBe(false);
    expect(storage.getObject).not.toHaveBeenCalled();
    expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
  }
);

it("keeps private files inaccessible through the public redirect", async () => {
  expect((await publicUrl.execute({ fileId: "file-document-a" }, {})).ok).toBe(false);
  expect(storage.createSignedDownloadUrl).not.toHaveBeenCalled();
});

it("preserves an explicitly published public file", async () => {
  expect((await publicUrl.execute({ fileId: "file-published" }, {})).ok).toBe(true);
});
