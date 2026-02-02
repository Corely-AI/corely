import type { GcsClient } from "./gcs.client";

export class GcsObjectStorageAdapter {
  constructor(
    private readonly client: GcsClient,
    private readonly bucketName: string
  ) {}

  async getObject(objectKey: string): Promise<Buffer> {
    const [buffer] = await this.client.bucket(this.bucketName).file(objectKey).download();
    return buffer;
  }
}
