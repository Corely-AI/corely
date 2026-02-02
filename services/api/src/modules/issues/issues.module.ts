import { Module } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { OUTBOX_PORT, AUDIT_PORT } from "@corely/kernel";
import { DataModule } from "@corely/data";
import { KernelModule } from "@/shared/kernel/kernel.module";
import { ID_GENERATOR_TOKEN, type IdGeneratorPort } from "@/shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN, type ClockPort } from "@/shared/ports/clock.port";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { IssuesController } from "./http/issues.controller";
import { DocumentsModule } from "../documents/documents.module";
import { DocumentsApplication } from "../documents/application/documents.application";
import { PrismaIssueRepositoryAdapter } from "./infrastructure/prisma/prisma-issue-repository.adapter";
import { PrismaIssueCommentRepositoryAdapter } from "./infrastructure/prisma/prisma-issue-comment-repository.adapter";
import { PrismaIssueAttachmentRepositoryAdapter } from "./infrastructure/prisma/prisma-issue-attachment-repository.adapter";
import { PrismaIssueActivityRepositoryAdapter } from "./infrastructure/prisma/prisma-issue-activity-repository.adapter";
import { DocumentsPortAdapter } from "./infrastructure/documents/documents-port.adapter";
import { OpenAiSpeechToTextAdapter } from "./infrastructure/speech-to-text/openai-speech-to-text.adapter";
import { NullSpeechToTextAdapter } from "./infrastructure/speech-to-text/null-speech-to-text.adapter";
import { CreateIssueUseCase } from "./application/use-cases/create-issue.usecase";
import { ListIssuesUseCase } from "./application/use-cases/list-issues.usecase";
import { GetIssueUseCase } from "./application/use-cases/get-issue.usecase";
import { AddIssueCommentUseCase } from "./application/use-cases/add-issue-comment.usecase";
import { ChangeIssueStatusUseCase } from "./application/use-cases/change-issue-status.usecase";
import { ResolveIssueUseCase } from "./application/use-cases/resolve-issue.usecase";
import { ReopenIssueUseCase } from "./application/use-cases/reopen-issue.usecase";
import { AssignIssueUseCase } from "./application/use-cases/assign-issue.usecase";
import {
  ISSUE_REPOSITORY_PORT,
  type IssueRepositoryPort,
} from "./application/ports/issue-repository.port";
import {
  ISSUE_COMMENT_REPOSITORY_PORT,
  type IssueCommentRepositoryPort,
} from "./application/ports/issue-comment-repository.port";
import {
  ISSUE_ATTACHMENT_REPOSITORY_PORT,
  type IssueAttachmentRepositoryPort,
} from "./application/ports/issue-attachment-repository.port";
import {
  ISSUE_ACTIVITY_REPOSITORY_PORT,
  type IssueActivityRepositoryPort,
} from "./application/ports/issue-activity-repository.port";
import { DOCUMENTS_PORT, type DocumentsPort } from "./application/ports/documents.port";
import {
  SPEECH_TO_TEXT_PORT,
  type SpeechToTextPort,
} from "./application/ports/speech-to-text.port";

@Module({
  imports: [DataModule, KernelModule, DocumentsModule],
  controllers: [IssuesController],
  providers: [
    PrismaIssueRepositoryAdapter,
    { provide: ISSUE_REPOSITORY_PORT, useExisting: PrismaIssueRepositoryAdapter },
    PrismaIssueCommentRepositoryAdapter,
    { provide: ISSUE_COMMENT_REPOSITORY_PORT, useExisting: PrismaIssueCommentRepositoryAdapter },
    PrismaIssueAttachmentRepositoryAdapter,
    {
      provide: ISSUE_ATTACHMENT_REPOSITORY_PORT,
      useExisting: PrismaIssueAttachmentRepositoryAdapter,
    },
    PrismaIssueActivityRepositoryAdapter,
    { provide: ISSUE_ACTIVITY_REPOSITORY_PORT, useExisting: PrismaIssueActivityRepositoryAdapter },
    {
      provide: DOCUMENTS_PORT,
      useFactory: (documents: DocumentsApplication) => new DocumentsPortAdapter(documents),
      inject: [DocumentsApplication],
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
    {
      provide: CreateIssueUseCase,
      useFactory: (
        issueRepo: IssueRepositoryPort,
        attachmentRepo: IssueAttachmentRepositoryPort,
        activityRepo: IssueActivityRepositoryPort,
        commentRepo: IssueCommentRepositoryPort,
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort,
        documents: DocumentsPort,
        speechToText: SpeechToTextPort
      ) =>
        new CreateIssueUseCase(
          issueRepo,
          attachmentRepo,
          activityRepo,
          commentRepo,
          outbox,
          audit,
          idempotency,
          idGenerator,
          clock,
          documents,
          speechToText
        ),
      inject: [
        ISSUE_REPOSITORY_PORT,
        ISSUE_ATTACHMENT_REPOSITORY_PORT,
        ISSUE_ACTIVITY_REPOSITORY_PORT,
        ISSUE_COMMENT_REPOSITORY_PORT,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        DOCUMENTS_PORT,
        SPEECH_TO_TEXT_PORT,
      ],
    },
    {
      provide: ListIssuesUseCase,
      useFactory: (issueRepo: IssueRepositoryPort) => new ListIssuesUseCase(issueRepo),
      inject: [ISSUE_REPOSITORY_PORT],
    },
    {
      provide: GetIssueUseCase,
      useFactory: (
        issueRepo: IssueRepositoryPort,
        attachmentRepo: IssueAttachmentRepositoryPort,
        commentRepo: IssueCommentRepositoryPort,
        activityRepo: IssueActivityRepositoryPort
      ) => new GetIssueUseCase(issueRepo, attachmentRepo, commentRepo, activityRepo),
      inject: [
        ISSUE_REPOSITORY_PORT,
        ISSUE_ATTACHMENT_REPOSITORY_PORT,
        ISSUE_COMMENT_REPOSITORY_PORT,
        ISSUE_ACTIVITY_REPOSITORY_PORT,
      ],
    },
    {
      provide: AddIssueCommentUseCase,
      useFactory: (
        issueRepo: IssueRepositoryPort,
        commentRepo: IssueCommentRepositoryPort,
        attachmentRepo: IssueAttachmentRepositoryPort,
        activityRepo: IssueActivityRepositoryPort,
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        idGenerator: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new AddIssueCommentUseCase(
          issueRepo,
          commentRepo,
          attachmentRepo,
          activityRepo,
          outbox,
          audit,
          idempotency,
          idGenerator,
          clock
        ),
      inject: [
        ISSUE_REPOSITORY_PORT,
        ISSUE_COMMENT_REPOSITORY_PORT,
        ISSUE_ATTACHMENT_REPOSITORY_PORT,
        ISSUE_ACTIVITY_REPOSITORY_PORT,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ChangeIssueStatusUseCase,
      useFactory: (
        issueRepo: IssueRepositoryPort,
        activityRepo: IssueActivityRepositoryPort,
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        clock: ClockPort,
        idGenerator: IdGeneratorPort
      ) =>
        new ChangeIssueStatusUseCase(
          issueRepo,
          activityRepo,
          outbox,
          audit,
          idempotency,
          clock,
          idGenerator
        ),
      inject: [
        ISSUE_REPOSITORY_PORT,
        ISSUE_ACTIVITY_REPOSITORY_PORT,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: ResolveIssueUseCase,
      useFactory: (
        issueRepo: IssueRepositoryPort,
        activityRepo: IssueActivityRepositoryPort,
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        clock: ClockPort,
        idGenerator: IdGeneratorPort
      ) =>
        new ResolveIssueUseCase(
          issueRepo,
          activityRepo,
          outbox,
          audit,
          idempotency,
          clock,
          idGenerator
        ),
      inject: [
        ISSUE_REPOSITORY_PORT,
        ISSUE_ACTIVITY_REPOSITORY_PORT,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: ReopenIssueUseCase,
      useFactory: (
        issueRepo: IssueRepositoryPort,
        activityRepo: IssueActivityRepositoryPort,
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        clock: ClockPort,
        idGenerator: IdGeneratorPort
      ) =>
        new ReopenIssueUseCase(
          issueRepo,
          activityRepo,
          outbox,
          audit,
          idempotency,
          clock,
          idGenerator
        ),
      inject: [
        ISSUE_REPOSITORY_PORT,
        ISSUE_ACTIVITY_REPOSITORY_PORT,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
      ],
    },
    {
      provide: AssignIssueUseCase,
      useFactory: (
        issueRepo: IssueRepositoryPort,
        activityRepo: IssueActivityRepositoryPort,
        outbox,
        audit,
        idempotency: IdempotencyStoragePort,
        clock: ClockPort,
        idGenerator: IdGeneratorPort
      ) =>
        new AssignIssueUseCase(
          issueRepo,
          activityRepo,
          outbox,
          audit,
          idempotency,
          clock,
          idGenerator
        ),
      inject: [
        ISSUE_REPOSITORY_PORT,
        ISSUE_ACTIVITY_REPOSITORY_PORT,
        OUTBOX_PORT,
        AUDIT_PORT,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        CLOCK_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
      ],
    },
  ],
  exports: [CreateIssueUseCase],
})
export class IssuesModule {}
