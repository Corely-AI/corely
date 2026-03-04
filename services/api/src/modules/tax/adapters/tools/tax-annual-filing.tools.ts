import {
  AnswerIncomeTaxDraftInterviewInputSchema,
  ConfirmIncomeTaxDraftSubmissionInputSchema,
  CreateIncomeTaxDraftInputSchema,
} from "@corely/contracts";
import { type Result, type UseCaseError } from "@corely/kernel";
import { z } from "zod";
import { mapToolResult } from "../../../../shared/adapters/tools/tool-mappers";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { type ChatStorePort } from "../../../ai-copilot/application/ports/chat-store.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type CreateIncomeTaxDraftUseCase } from "../../application/use-cases/create-income-tax-draft.use-case";
import { type GetIncomeTaxDraftUseCase } from "../../application/use-cases/get-income-tax-draft.use-case";
import { type GenerateIncomeTaxDraftEurUseCase } from "../../application/use-cases/generate-income-tax-draft-eur.use-case";
import { type RecomputeIncomeTaxDraftUseCase } from "../../application/use-cases/recompute-income-tax-draft.use-case";
import { type GetIncomeTaxDraftChecklistUseCase } from "../../application/use-cases/get-income-tax-draft-checklist.use-case";
import {
  type AnswerIncomeTaxDraftInterviewUseCase,
  type AnswerIncomeTaxDraftInterviewUseCaseInput,
} from "../../application/use-cases/answer-income-tax-draft-interview.use-case";
import { type StartIncomeTaxDraftPdfExportUseCase } from "../../application/use-cases/start-income-tax-draft-pdf-export.use-case";
import {
  type PollIncomeTaxDraftPdfExportUseCase,
  type PollIncomeTaxDraftPdfExportUseCaseInput,
} from "../../application/use-cases/poll-income-tax-draft-pdf-export.use-case";
import {
  type ConfirmIncomeTaxDraftSubmissionUseCase,
  type ConfirmIncomeTaxDraftSubmissionUseCaseInput,
} from "../../application/use-cases/confirm-income-tax-draft-submission.use-case";

type TaxAnnualContext = {
  workspaceId?: string;
  taxYear?: number;
  draftId?: string;
  jurisdiction?: "DE";
  strategy?: "PERSONAL";
};

const TaxDraftRefSchema = z.object({
  draftId: z.string().min(1).optional(),
});

const TaxCreateIncomeDraftToolInputSchema = z.object({
  year: CreateIncomeTaxDraftInputSchema.shape.year.optional(),
});

const TaxAnswerIncomeTaxDraftToolInputSchema = AnswerIncomeTaxDraftInterviewInputSchema.extend({
  draftId: z.string().min(1).optional(),
});

const TaxPollExportToolInputSchema = z.object({
  draftId: z.string().min(1).optional(),
  exportId: z.string().min(1).optional(),
});

const TaxConfirmSubmissionToolInputSchema = ConfirmIncomeTaxDraftSubmissionInputSchema.extend({
  draftId: z.string().min(1).optional(),
});

const ensureToolDraftId = (draftId: string | undefined) => {
  if (!draftId) {
    throw new Error("Tax draft is missing. Create or select a draft first.");
  }
  return draftId;
};

const toToolResult = <T extends Record<string, unknown>>(result: Result<T, UseCaseError>) =>
  mapToolResult(result);

const loadTaxAnnualContext = async (params: {
  chatStore: ChatStorePort;
  runId?: string;
  tenantId: string;
}): Promise<TaxAnnualContext> => {
  if (!params.runId) {
    return {};
  }

  const stored = await params.chatStore.load({
    chatId: params.runId,
    tenantId: params.tenantId,
  });

  return stored.metadata?.taxAnnual ?? {};
};

const saveTaxAnnualContext = async (params: {
  chatStore: ChatStorePort;
  runId?: string;
  tenantId: string;
  patch: TaxAnnualContext;
}) => {
  if (!params.runId) {
    return;
  }

  const cleanPatch = Object.fromEntries(
    Object.entries(params.patch).filter((entry) => entry[1] !== undefined)
  ) as TaxAnnualContext;

  await params.chatStore.save({
    chatId: params.runId,
    tenantId: params.tenantId,
    messages: [],
    metadata: {
      taxAnnual: {
        ...cleanPatch,
      },
    },
  });
};

export const buildTaxAnnualFilingTools = (deps: {
  createDraft: CreateIncomeTaxDraftUseCase;
  getDraft: GetIncomeTaxDraftUseCase;
  generateEur: GenerateIncomeTaxDraftEurUseCase;
  recomputeDraft: RecomputeIncomeTaxDraftUseCase;
  getChecklist: GetIncomeTaxDraftChecklistUseCase;
  answerInterview: AnswerIncomeTaxDraftInterviewUseCase;
  startPdfExport: StartIncomeTaxDraftPdfExportUseCase;
  pollExport: PollIncomeTaxDraftPdfExportUseCase;
  confirmSubmission: ConfirmIncomeTaxDraftSubmissionUseCase;
  chatStore: ChatStorePort;
}): DomainToolPort[] => [
  {
    name: "tax_create_income_tax_draft",
    description: "Create or load the annual income-tax draft for a year.",
    kind: "server",
    inputSchema: TaxCreateIncomeDraftToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxCreateIncomeDraftToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const session = await loadTaxAnnualContext({
        chatStore: deps.chatStore,
        runId,
        tenantId,
      });
      const year = parsed.data.year ?? session.taxYear ?? new Date().getUTCFullYear();

      const result = await deps.createDraft.execute(
        { year },
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );

      const mapped = toToolResult(result);
      if (!("error" in result)) {
        await saveTaxAnnualContext({
          chatStore: deps.chatStore,
          runId,
          tenantId,
          patch: {
            workspaceId: workspaceId ?? tenantId,
            taxYear: year,
            draftId: result.value.draftId,
            jurisdiction: "DE",
            strategy: "PERSONAL",
          },
        });
      }

      return mapped;
    },
  },
  {
    name: "tax_get_income_tax_draft",
    description: "Fetch the current income-tax draft state and computed values.",
    kind: "server",
    inputSchema: TaxDraftRefSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxDraftRefSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);

      const result = await deps.getDraft.execute(
        draftId,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );

      return toToolResult(result);
    },
  },
  {
    name: "tax_generate_eur",
    description: "Generate EÜR statement for the income-tax draft.",
    kind: "server",
    inputSchema: TaxDraftRefSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxDraftRefSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);

      const result = await deps.generateEur.execute(
        draftId,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return toToolResult(result);
    },
  },
  {
    name: "tax_recompute_income_tax_draft",
    description: "Recompute totals, taxable income, and checklist for the draft.",
    kind: "server",
    inputSchema: TaxDraftRefSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxDraftRefSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);

      const result = await deps.recomputeDraft.execute(
        draftId,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return toToolResult(result);
    },
  },
  {
    name: "tax_get_income_tax_checklist",
    description: "Get blockers, warnings, and next required actions for the draft.",
    kind: "server",
    inputSchema: TaxDraftRefSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxDraftRefSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);

      const result = await deps.getChecklist.execute(
        draftId,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return toToolResult(result);
    },
  },
  {
    name: "tax_answer_income_tax_interview",
    description:
      "Record a confirmed interview answer with optional evidence references for the draft.",
    kind: "server",
    inputSchema: TaxAnswerIncomeTaxDraftToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxAnswerIncomeTaxDraftToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);

      const request: AnswerIncomeTaxDraftInterviewUseCaseInput = {
        draftId,
        request: {
          questionId: parsed.data.questionId,
          answer: parsed.data.answer,
          evidenceRefs: parsed.data.evidenceRefs,
          confirmedByUser: parsed.data.confirmedByUser,
        },
      };

      const result = await deps.answerInterview.execute(
        request,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return toToolResult(result);
    },
  },
  {
    name: "tax_export_income_tax_draft_pdf",
    description: "Start a PDF export job for the annual income-tax draft.",
    kind: "server",
    inputSchema: TaxDraftRefSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxDraftRefSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);

      const result = await deps.startPdfExport.execute(
        draftId,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return toToolResult(result);
    },
  },
  {
    name: "tax_poll_income_tax_export",
    description: "Poll income-tax draft PDF export status and retrieve download URL when ready.",
    kind: "server",
    inputSchema: TaxPollExportToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxPollExportToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);
      const exportId = parsed.data.exportId ?? draftId;

      const request: PollIncomeTaxDraftPdfExportUseCaseInput = {
        draftId,
        exportId,
      };

      const result = await deps.pollExport.execute(
        request,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );
      return toToolResult(result);
    },
  },
  {
    name: "tax_record_income_tax_submission",
    description: "Record submission channel/reference for an already filed annual draft.",
    kind: "server",
    inputSchema: TaxConfirmSubmissionToolInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = TaxConfirmSubmissionToolInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const session = await loadTaxAnnualContext({ chatStore: deps.chatStore, runId, tenantId });
      const draftId = ensureToolDraftId(parsed.data.draftId ?? session.draftId);

      const request: ConfirmIncomeTaxDraftSubmissionUseCaseInput = {
        draftId,
        request: {
          channel: parsed.data.channel,
          referenceId: parsed.data.referenceId,
          submittedAt: parsed.data.submittedAt,
          notes: parsed.data.notes,
        },
      };

      const result = await deps.confirmSubmission.execute(
        request,
        buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
      );

      const mapped = toToolResult(result);
      if (mapped.ok) {
        await saveTaxAnnualContext({
          chatStore: deps.chatStore,
          runId,
          tenantId,
          patch: {
            workspaceId: workspaceId ?? tenantId,
            draftId,
            taxYear: session.taxYear,
            jurisdiction: "DE",
            strategy: "PERSONAL",
          },
        });
      }

      return mapped;
    },
  },
];
