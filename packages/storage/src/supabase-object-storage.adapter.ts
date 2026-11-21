import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStoragePort } from "@corely/kernel";

export class SupabaseObjectStorageAdapter implements ObjectStoragePort {
  constructor(
    private readonly client: S3Client,
    private readonly bucketName: string
  ) {}

  provider() {
    return "s3" as const;
  }

  bucket() {
    return this.bucketName;
  }

  async createSignedUploadUrl(args: Parameters<ObjectStoragePort["createSignedUploadUrl"]>[0]) {
    const command = new PutObjectCommand({ ...this.location(args), ContentType: args.contentType });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: args.expiresInSeconds,
      signableHeaders: new Set(["content-type"]),
    });
    return {
      url,
      method: "PUT" as const,
      requiredHeaders: { "content-type": args.contentType },
      expiresAt: new Date(Date.now() + args.expiresInSeconds * 1000),
    };
  }

  async createSignedDownloadUrl(args: Parameters<ObjectStoragePort["createSignedDownloadUrl"]>[0]) {
    const url = await getSignedUrl(this.client, new GetObjectCommand(this.location(args)), {
      expiresIn: args.expiresInSeconds,
    });
    return { url, expiresAt: new Date(Date.now() + args.expiresInSeconds * 1000) };
  }

  async headObject(args: Parameters<ObjectStoragePort["headObject"]>[0]) {
    try {
      const result = await this.client.send(new HeadObjectCommand(this.location(args)));
      return {
        exists: true,
        sizeBytes: result.ContentLength,
        contentType: result.ContentType,
        etag: result.ETag,
      };
    } catch (error) {
      if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
        return { exists: false };
      }
      throw error;
    }
  }

  async putObject(args: Parameters<ObjectStoragePort["putObject"]>[0]) {
    const result = await this.client.send(
      new PutObjectCommand({
        ...this.location(args),
        Body: args.bytes,
        ContentType: args.contentType,
      })
    );
    return { etag: result.ETag, sizeBytes: args.bytes.length };
  }

  async getObject(args: Parameters<ObjectStoragePort["getObject"]>[0]) {
    const result = await this.client.send(new GetObjectCommand(this.location(args)));
    if (!result.Body) {
      throw new Error("Supabase Storage returned an empty response body");
    }
    return Buffer.from(await result.Body.transformToByteArray());
  }

  private location(args: { tenantId: string; objectKey: string }) {
    const parts = args.objectKey.split("/");
    const [scope, owner, type, invoice, filename] = parts.slice(-5);
    if (
      scope !== "tenant" ||
      !args.tenantId ||
      owner !== args.tenantId ||
      type !== "invoices" ||
      !invoice ||
      filename !== "invoice.pdf" ||
      parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))
    ) {
      throw new Error("Invoice PDF object key does not belong to the requested workspace");
    }
    return { Bucket: this.bucketName, Key: args.objectKey };
  }
}

export function createSupabaseInvoiceStorage(options: {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}) {
  return new SupabaseObjectStorageAdapter(
    new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    }),
    options.bucket
  );
}
