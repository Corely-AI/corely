import { Injectable } from "@nestjs/common";
import {
  type AnswerIncomeTaxDraftInterviewInput,
  type AnswerIncomeTaxDraftInterviewOutput,
} from "@corely/contracts";
import {
  BaseUseCase,
  ValidationError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import { TaxReportRepoPort } from "../../domain/ports";
import { IncomeTaxDraftSupportService } from "../services/income-tax-draft-support.service";
import { getIncomeTaxDraftReportById } from "./income-tax-draft-report.helpers";
import {
  buildIncomeTaxDraftChecklist,
  buildIncomeTaxDraftDto,
  buildIncomeTaxDraftMutationOutput,
  findIncomeTaxDraftQuestion,
  isInterviewAnswerValid,
  readIncomeTaxDraftState,
  writeIncomeTaxDraftState,
} from "./income-tax-draft.utils";

export type AnswerIncomeTaxDraftInterviewUseCaseInput = {
  draftId: string;
  request: AnswerIncomeTaxDraftInterviewInput;
};

@RequireTenant()
@Injectable()
export class AnswerIncomeTaxDraftInterviewUseCase extends BaseUseCase<
  AnswerIncomeTaxDraftInterviewUseCaseInput,
  AnswerIncomeTaxDraftInterviewOutput
> {
  constructor(
    private readonly reportRepo: TaxReportRepoPort,
    private readonly support: IncomeTaxDraftSupportService
  ) {
    super({ logger: null as never });
  }

  protected async handle(
    input: AnswerIncomeTaxDraftInterviewUseCaseInput,
    ctx: UseCaseContext
  ): Promise<Result<AnswerIncomeTaxDraftInterviewOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId || ctx.tenantId || "";
    const report = await getIncomeTaxDraftReportById({
      reportRepo: this.reportRepo,
      workspaceId,
      draftId: input.draftId,
    });

    const year = report.periodStart.getUTCFullYear();
    await this.support.assertSupported({ workspaceId, year });

    if (!input.request.confirmedByUser) {
      throw new ValidationError(
        "Interview answers must be explicitly confirmed by the user.",
        undefined,
        "Tax:InterviewConfirmationRequired"
      );
    }

    const question = findIncomeTaxDraftQuestion(input.request.questionId);
    if (!question) {
      throw new ValidationError("Unknown interview question.", {
        questionId: input.request.questionId,
      });
    }

    if (!isInterviewAnswerValid(question.type, input.request.answer)) {
      throw new ValidationError("Answer has an invalid type for this interview question.", {
        questionId: input.request.questionId,
        expectedType: question.type,
      });
    }

    const state = readIncomeTaxDraftState(report.meta);
    state.interviewAnswers[input.request.questionId] = {
      questionId: input.request.questionId,
      answer: input.request.answer,
      evidenceRefs: input.request.evidenceRefs ?? [],
      confirmedByUser: true,
      answeredAt: new Date().toISOString(),
    };

    if (input.request.questionId === "hasChildren" && input.request.answer === false) {
      delete state.interviewAnswers.childcareCostsCents;
    }

    state.computed = null;
    state.checklist = buildIncomeTaxDraftChecklist(state);

    const updatedReport = await this.reportRepo.updateMeta({
      tenantId: workspaceId,
      reportId: report.id,
      meta: writeIncomeTaxDraftState(report.meta, state),
    });

    const draft = buildIncomeTaxDraftDto({
      draftId: updatedReport.id,
      year,
      currency: updatedReport.currency,
      createdAtIso: updatedReport.createdAt.toISOString(),
      updatedAtIso: updatedReport.updatedAt.toISOString(),
      state,
    });

    return ok(buildIncomeTaxDraftMutationOutput(draft));
  }
}
