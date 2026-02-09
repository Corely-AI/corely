export type SignedUpload = {
  url: string;
  method: "PUT";
  requiredHeaders?: Record<string, string>;
  expiresAt: Date;
};

export type SignedDownload = {
  url: string;
  expiresAt: Date;
};

export type HeadObject = {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
  etag?: string;
};

export interface ObjectStoragePort {
  /**
   * Get the provider name
   */
  provider(): "gcs" | "s3" | "azure";

  /**
   * Get the bucket name
   */
  bucket(): string;

  /**
   * Create a signed URL for uploading a file
   */
  createSignedUploadUrl(args: {
    tenantId: string;
    objectKey: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<SignedUpload>;

  /**
   * Create a signed URL for downloading a file
   */
  createSignedDownloadUrl(args: {
    tenantId: string;
    objectKey: string;
    expiresInSeconds: number;
  }): Promise<SignedDownload>;

  /**
   * Check if an object exists and get metadata
   */
  headObject(args: { tenantId: string; objectKey: string }): Promise<HeadObject>;

  /**
   * Upload an object directly
   */
  putObject(args: {
    tenantId: string;
    objectKey: string;
    contentType: string;
    bytes: Buffer;
  }): Promise<{ etag?: string; sizeBytes: number }>;

  /**
   * Download an object directly
   */
  getObject(args: { tenantId: string; objectKey: string }): Promise<Buffer>;
}

export { OBJECT_STORAGE_PORT } from "../tokens";
