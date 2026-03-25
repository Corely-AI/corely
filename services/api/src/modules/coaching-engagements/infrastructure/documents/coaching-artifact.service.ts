import { Injectable } from "@nestjs/common";
import {
  PrismaDocumentLinkAdapter,
  PrismaDocumentRepoAdapter,
  PrismaFileRepoAdapter,
} from "@corely/data";
import {
  CLOCK_PORT_TOKEN,
  ID_GENERATOR_TOKEN,
  OBJECT_STORAGE_PORT,
  type ClockPort,
  type IdGeneratorPort,
  type ObjectStoragePort,
} from "@corely/kernel";
import { Inject } from "@nestjs/common";
import { DocumentAggregate } from "../../../documents/domain/document.aggregate";

type ArtifactLink = {
  entityType: "COACHING_ENGAGEMENT" | "COACHING_SESSION" | "PARTY";
  entityId: string;
};

@Injectable()
export class CoachingArtifactService {
  constructor(
    private readonly documentRepo: PrismaDocumentRepoAdapter,
    private readonly fileRepo: PrismaFileRepoAdapter,
    private readonly linkRepo: PrismaDocumentLinkAdapter,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: ObjectStoragePort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async createPdfArtifact(input: {
    tenantId: string;
    title: string;
    bytes: Buffer;
    links: ArtifactLink[];
    objectPath: string;
  }): Promise<{ documentId: string; fileId: string }> {
    const now = this.clock.now();
    const documentId = this.idGenerator.newId();
    const fileId = this.idGenerator.newId();
    const safeName = input.title.replace(/[^a-zA-Z0-9._-]/g, "-");
    const prefix = process.env.STORAGE_KEY_PREFIX ? `${process.env.STORAGE_KEY_PREFIX}/` : "";
    const objectKey = `${prefix}tenant/${input.tenantId}/coaching/${input.objectPath}/${documentId}-${safeName}.pdf`;

    await this.objectStorage.putObject({
      tenantId: input.tenantId,
      objectKey,
      contentType: "application/pdf",
      bytes: input.bytes,
    });

    const document = DocumentAggregate.create({
      id: documentId,
      tenantId: input.tenantId,
      type: input.title.toLowerCase().includes("contract") ? "CONTRACT" : "OTHER",
      title: input.title,
      status: "READY",
      createdAt: now,
      file: {
        id: fileId,
        kind: "GENERATED",
        storageProvider: this.objectStorage.provider(),
        bucket: this.objectStorage.bucket(),
        objectKey,
        contentType: "application/pdf",
        sizeBytes: input.bytes.length,
        createdAt: now,
      },
    });

    await this.documentRepo.create(document);
    await this.fileRepo.create(document.files[0]);

    for (const link of input.links) {
      await this.linkRepo.createLink({
        tenantId: input.tenantId,
        documentId,
        entityType: link.entityType as any,
        entityId: link.entityId,
      });
    }

    return { documentId, fileId };
  }

  async createSignedDownloadAttachment(input: {
    tenantId: string;
    documentId: string;
    filename: string;
  }) {
    const file =
      (await this.fileRepo.findByDocumentAndKind(input.tenantId, input.documentId, "GENERATED")) ??
      (await this.fileRepo.findByDocument(input.tenantId, input.documentId))[0] ??
      null;

    if (!file) {
      throw new Error(`No generated file found for document ${input.documentId}`);
    }

    const signed = await this.objectStorage.createSignedDownloadUrl({
      tenantId: input.tenantId,
      objectKey: file.objectKey,
      expiresInSeconds: 3600,
    });

    return {
      filename: input.filename,
      mimeType: file.contentType ?? "application/pdf",
      path: signed.url,
    };
  }
}
