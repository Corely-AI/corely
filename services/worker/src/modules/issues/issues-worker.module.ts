import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { OutboxRepository } from "@corely/data";
import { PrismaService } from "@corely/data";
import { IssueTranscriptionRequestedHandler } from "./issue-transcription-requested.handler";
import { createGcsClient } from "./infrastructure/gcs/gcs.client";
import { GcsObjectStorageAdapter } from "./infrastructure/gcs/gcs-object-storage.adapter";
import { DocumentsPortAdapter } from "./infrastructure/documents/documents-port.adapter";
import { OpenAiSpeechToTextAdapter } from "./infrastructure/speech-to-text/openai-speech-to-text.adapter";
import { NullSpeechToTextAdapter } from "./infrastructure/speech-to-text/null-speech-to-text.adapter";
import { PrismaIssueTranscriptionRepositoryAdapter } from "./infrastructure/issue-transcription-repository.adapter";
import { DOCUMENTS_PORT, type DocumentsPort } from "./ports/documents.port";
import { SPEECH_TO_TEXT_PORT, type SpeechToTextPort } from "./ports/speech-to-text.port";
import {
  ISSUE_TRANSCRIPTION_REPOSITORY_PORT,
  type IssueTranscriptionRepositoryPort,
} from "./ports/issue-transcription-repository.port";

@Module({
  providers: [
    {
      provide: GcsObjectStorageAdapter,
      useFactory: (env: EnvService) => {
        const client = createGcsClient({
          projectId: env.GOOGLE_CLOUD_PROJECT,
          keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        return new GcsObjectStorageAdapter(client, env.STORAGE_BUCKET);
      },
      inject: [EnvService],
    },
    {
      provide: DOCUMENTS_PORT,
      useFactory: (prisma: PrismaService, storage: GcsObjectStorageAdapter) =>
        new DocumentsPortAdapter(prisma, storage),
      inject: [PrismaService, GcsObjectStorageAdapter],
    },
    {
      provide: SPEECH_TO_TEXT_PORT,
      useFactory: (env: EnvService) => {
        if (env.OPENAI_API_KEY) {
          return new OpenAiSpeechToTextAdapter(env.OPENAI_API_KEY);
        }
        return new NullSpeechToTextAdapter();
      },
      inject: [EnvService],
    },
    PrismaIssueTranscriptionRepositoryAdapter,
    {
      provide: ISSUE_TRANSCRIPTION_REPOSITORY_PORT,
      useExisting: PrismaIssueTranscriptionRepositoryAdapter,
    },
    {
      provide: IssueTranscriptionRequestedHandler,
      useFactory: (
        documents: DocumentsPort,
        speechToText: SpeechToTextPort,
        repo: IssueTranscriptionRepositoryPort,
        outbox: OutboxRepository
      ) => new IssueTranscriptionRequestedHandler(documents, speechToText, repo, outbox),
      inject: [
        DOCUMENTS_PORT,
        SPEECH_TO_TEXT_PORT,
        ISSUE_TRANSCRIPTION_REPOSITORY_PORT,
        OutboxRepository,
      ],
    },
  ],
  exports: [IssueTranscriptionRequestedHandler],
})
export class IssuesWorkerModule {}
