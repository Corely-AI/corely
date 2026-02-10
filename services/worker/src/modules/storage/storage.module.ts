import { Module, Global } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { OBJECT_STORAGE_PORT } from "@corely/kernel";
import { GcsObjectStorageAdapter, createGcsClient } from "@corely/storage";

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE_PORT,
      useFactory: (env: EnvService) => {
        const client = createGcsClient({
          projectId: env.GOOGLE_CLOUD_PROJECT,
          keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        return new GcsObjectStorageAdapter(client, env.STORAGE_BUCKET);
      },
      inject: [EnvService],
    },
  ],
  exports: [OBJECT_STORAGE_PORT],
})
export class StorageModule {}
