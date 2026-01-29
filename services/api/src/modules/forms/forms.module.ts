import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";
import { FormsController } from "./http/forms.controller";
import { PublicFormsController } from "./http/public-forms.controller";
import { PrismaFormRepository } from "./infrastructure/adapters/prisma-form-repository.adapter";
import { FORM_REPOSITORY } from "./application/ports/form-repository.port";
import { CreateFormUseCase } from "./application/use-cases/create-form.usecase";
import { UpdateFormUseCase } from "./application/use-cases/update-form.usecase";
import { DeleteFormUseCase } from "./application/use-cases/delete-form.usecase";
import { GetFormUseCase } from "./application/use-cases/get-form.usecase";
import { ListFormsUseCase } from "./application/use-cases/list-forms.usecase";
import { AddFieldUseCase } from "./application/use-cases/add-field.usecase";
import { UpdateFieldUseCase } from "./application/use-cases/update-field.usecase";
import { RemoveFieldUseCase } from "./application/use-cases/remove-field.usecase";
import { ReorderFieldsUseCase } from "./application/use-cases/reorder-fields.usecase";
import { PublishFormUseCase } from "./application/use-cases/publish-form.usecase";
import { UnpublishFormUseCase } from "./application/use-cases/unpublish-form.usecase";
import { ListFormSubmissionsUseCase } from "./application/use-cases/list-submissions.usecase";
import { GetFormSubmissionUseCase } from "./application/use-cases/get-submission.usecase";
import { PublicGetFormUseCase } from "./application/use-cases/public-get-form.usecase";
import { PublicSubmitFormUseCase } from "./application/use-cases/public-submit-form.usecase";
import { FormSubmissionSummaryUseCase } from "./application/use-cases/submission-summary.usecase";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule],
  controllers: [FormsController, PublicFormsController],
  providers: [
    PrismaFormRepository,
    { provide: FORM_REPOSITORY, useExisting: PrismaFormRepository },
    {
      provide: CreateFormUseCase,
      useFactory: (repo, idGen, clock) => new CreateFormUseCase(repo, idGen, clock),
      inject: [FORM_REPOSITORY, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: UpdateFormUseCase,
      useFactory: (repo, clock) => new UpdateFormUseCase(repo, clock),
      inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
    },
    {
      provide: DeleteFormUseCase,
      useFactory: (repo, clock) => new DeleteFormUseCase(repo, clock),
      inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
    },
    {
      provide: GetFormUseCase,
      useFactory: (repo) => new GetFormUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: ListFormsUseCase,
      useFactory: (repo) => new ListFormsUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: AddFieldUseCase,
      useFactory: (repo, idGen, clock) => new AddFieldUseCase(repo, idGen, clock),
      inject: [FORM_REPOSITORY, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: UpdateFieldUseCase,
      useFactory: (repo, clock) => new UpdateFieldUseCase(repo, clock),
      inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
    },
    {
      provide: RemoveFieldUseCase,
      useFactory: (repo) => new RemoveFieldUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: ReorderFieldsUseCase,
      useFactory: (repo) => new ReorderFieldsUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: PublishFormUseCase,
      useFactory: (repo, clock) => new PublishFormUseCase(repo, clock),
      inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
    },
    {
      provide: UnpublishFormUseCase,
      useFactory: (repo, clock) => new UnpublishFormUseCase(repo, clock),
      inject: [FORM_REPOSITORY, CLOCK_PORT_TOKEN],
    },
    {
      provide: ListFormSubmissionsUseCase,
      useFactory: (repo) => new ListFormSubmissionsUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: GetFormSubmissionUseCase,
      useFactory: (repo) => new GetFormSubmissionUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: FormSubmissionSummaryUseCase,
      useFactory: (repo) => new FormSubmissionSummaryUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: PublicGetFormUseCase,
      useFactory: (repo) => new PublicGetFormUseCase(repo),
      inject: [FORM_REPOSITORY],
    },
    {
      provide: PublicSubmitFormUseCase,
      useFactory: (repo, idGen, clock) => new PublicSubmitFormUseCase(repo, idGen, clock),
      inject: [FORM_REPOSITORY, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
  ],
  exports: [CreateFormUseCase],
})
export class FormsModule {}
