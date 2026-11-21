import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import type { ObjectStoragePort } from "@corely/kernel";
import {
  createGcsClient,
  createSupabaseInvoiceStorage,
  GcsObjectStorageAdapter,
} from "@corely/storage";

export class InvoicePdfStorage {
  constructor(
    private readonly gcs: ObjectStoragePort,
    private readonly supabase: ObjectStoragePort | undefined,
    private readonly writeToSupabase: boolean
  ) {}

  get writer() {
    return this.writeToSupabase && this.supabase ? this.supabase : this.gcs;
  }

  forFile = (file: { storageProvider: string; bucket: string }): ObjectStoragePort => {
    if (file.storageProvider !== "s3") {
      return this.gcs;
    }
    if (!this.supabase || file.bucket !== this.supabase.bucket()) {
      throw new Error("Invoice PDF storage bucket is unavailable");
    }
    return this.supabase;
  };
}

@Module({
  providers: [
    {
      provide: InvoicePdfStorage,
      useFactory: (env: EnvService) => {
        const {
          INVOICE_PDF_STORAGE_PROVIDER: provider,
          SUPABASE_STORAGE_S3_ENDPOINT: endpoint,
          SUPABASE_STORAGE_S3_REGION: region,
          SUPABASE_STORAGE_S3_ACCESS_KEY_ID: accessKeyId,
          SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY: secretAccessKey,
          SUPABASE_STORAGE_INVOICE_BUCKET: bucket,
        } = env.getConfig();
        let supabase: ObjectStoragePort | undefined;
        if (provider === "supabase" || endpoint) {
          if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
            throw new Error(
              "Supabase invoice storage requires its S3 endpoint, region, credentials and bucket"
            );
          }
          supabase = createSupabaseInvoiceStorage({
            endpoint,
            region,
            accessKeyId,
            secretAccessKey,
            bucket,
          });
        }
        return new InvoicePdfStorage(
          new GcsObjectStorageAdapter(
            createGcsClient({
              projectId: env.GOOGLE_CLOUD_PROJECT,
              keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
            }),
            env.STORAGE_BUCKET
          ),
          supabase,
          provider === "supabase"
        );
      },
      inject: [EnvService],
    },
  ],
  exports: [InvoicePdfStorage],
})
export class InvoicePdfStorageModule {}
