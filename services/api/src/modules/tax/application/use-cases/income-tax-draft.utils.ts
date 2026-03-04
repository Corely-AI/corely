import {
  type IncomeTaxDraftAnswerValue,
  type IncomeTaxDraftChecklist,
  type IncomeTaxDraftChecklistItem,
  type IncomeTaxDraftComputed,
  type IncomeTaxDraftDto,
  type IncomeTaxDraftInterviewAnswer,
  type IncomeTaxDraftInterviewQuestion,
  type IncomeTaxDraftMutationOutput,
  type IncomeTaxDraftNextAction,
  type IncomeTaxDraftQuestionType,
  type IncomeTaxDraftStatus,
  type IncomeTaxDraftSubmission,
  type IncomeTaxDraftSummary,
  IncomeTaxDraftChecklistSchema,
  IncomeTaxDraftComputedSchema,
  IncomeTaxDraftInterviewAnswerSchema,
  IncomeTaxDraftSubmissionSchema,
  TaxEurStatementDtoSchema,
} from "@corely/contracts";
import { z } from "zod";

export const INCOME_TAX_DRAFT_META_KEY = "incomeTaxDraft";

export type IncomeTaxDraftStoredState = {
  interviewAnswers: Record<string, IncomeTaxDraftInterviewAnswer>;
  eurStatement: IncomeTaxDraftDto["eurStatement"];
  computed: IncomeTaxDraftDto["computed"];
  checklist: IncomeTaxDraftDto["checklist"] | null;
  submission: IncomeTaxDraftDto["submission"];
};

const StoredIncomeTaxDraftMetaSchema = z.object({
  interviewAnswers: z.record(z.string(), IncomeTaxDraftInterviewAnswerSchema).default({}),
  eurStatement: TaxEurStatementDtoSchema.nullable().default(null),
  computed: IncomeTaxDraftComputedSchema.nullable().default(null),
  checklist: IncomeTaxDraftChecklistSchema.nullable().default(null),
  submission: IncomeTaxDraftSubmissionSchema.nullable().default(null),
});

type IncomeTaxDraftQuestionDefinition = {
  id: string;
  label: string;
  description?: string;
  type: IncomeTaxDraftQuestionType;
  required: boolean;
};

export const INCOME_TAX_DRAFT_QUESTIONS: ReadonlyArray<IncomeTaxDraftQuestionDefinition> = [
  {
    id: "professionalExpensesCents",
    label: "Business-related home office and professional expenses",
    description: "Total deductible business expenses not already represented in EÜR totals.",
    type: "MONEY_CENTS",
    required: true,
  },
  {
    id: "healthInsuranceCents",
    label: "Health and long-term care insurance contributions",
    description: "Annual contribution amount paid in the selected tax year.",
    type: "MONEY_CENTS",
    required: true,
  },
  {
    id: "hasChildren",
    label: "Do you have children eligible for childcare deductions?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "childcareCostsCents",
    label: "Childcare costs",
    description: "Total childcare spending in the selected tax year.",
    type: "MONEY_CENTS",
    required: false,
  },
  {
    id: "otherDeductionNotes",
    label: "Other deduction notes",
    description: "Optional notes for advisor review.",
    type: "TEXT",
    required: false,
  },
];

const defaultDraftState = (): IncomeTaxDraftStoredState => ({
  interviewAnswers: {},
  eurStatement: null,
  computed: null,
  checklist: null,
  submission: null,
});

export const readIncomeTaxDraftState = (
  meta: Record<string, unknown> | null | undefined
): IncomeTaxDraftStoredState => {
  const metadata = meta && typeof meta === "object" ? meta : undefined;
  const raw = metadata?.[INCOME_TAX_DRAFT_META_KEY];
  if (!raw || typeof raw !== "object") {
    return defaultDraftState();
  }

  const parsed = StoredIncomeTaxDraftMetaSchema.safeParse(raw);
  if (!parsed.success) {
    return defaultDraftState();
  }

  return {
    interviewAnswers: parsed.data.interviewAnswers ?? {},
    eurStatement: parsed.data.eurStatement ?? null,
    computed: parsed.data.computed ?? null,
    checklist: parsed.data.checklist ?? null,
    submission: parsed.data.submission ?? null,
  };
};

export const writeIncomeTaxDraftState = (
  meta: Record<string, unknown> | null | undefined,
  state: IncomeTaxDraftStoredState
): Record<string, unknown> => {
  const nextMeta = meta && typeof meta === "object" ? { ...meta } : {};
  nextMeta[INCOME_TAX_DRAFT_META_KEY] = state;
  return nextMeta;
};

export const findIncomeTaxDraftQuestion = (
  questionId: string
): IncomeTaxDraftQuestionDefinition | null =>
  INCOME_TAX_DRAFT_QUESTIONS.find((question) => question.id === questionId) ?? null;

const isMoneyAnswer = (answer: IncomeTaxDraftAnswerValue): answer is number =>
  typeof answer === "number" && Number.isInteger(answer) && answer >= 0;

const isBooleanAnswer = (answer: IncomeTaxDraftAnswerValue): answer is boolean =>
  typeof answer === "boolean";

const isTextAnswer = (answer: IncomeTaxDraftAnswerValue): answer is string =>
  typeof answer === "string" && answer.trim().length > 0;

export const isInterviewAnswerValid = (
  questionType: IncomeTaxDraftQuestionType,
  answer: IncomeTaxDraftAnswerValue
): boolean => {
  if (questionType === "MONEY_CENTS") {
    return isMoneyAnswer(answer);
  }
  if (questionType === "BOOLEAN") {
    return isBooleanAnswer(answer);
  }
  return isTextAnswer(answer);
};

export const buildInterviewQuestions = (
  state: IncomeTaxDraftStoredState
): IncomeTaxDraftInterviewQuestion[] =>
  INCOME_TAX_DRAFT_QUESTIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    description: definition.description,
    type: definition.type,
    required: definition.required,
    answer: state.interviewAnswers[definition.id],
  }));

const getAnswerAsMoney = (state: IncomeTaxDraftStoredState, questionId: string): number => {
  const answer = state.interviewAnswers[questionId]?.answer;
  return typeof answer === "number" && Number.isInteger(answer) ? Math.max(0, answer) : 0;
};

const getAnswerAsBoolean = (state: IncomeTaxDraftStoredState, questionId: string): boolean => {
  const answer = state.interviewAnswers[questionId]?.answer;
  return typeof answer === "boolean" ? answer : false;
};

const getMissingRequiredQuestionId = (state: IncomeTaxDraftStoredState): string | null => {
  for (const question of INCOME_TAX_DRAFT_QUESTIONS) {
    if (!question.required) {
      continue;
    }
    const answer = state.interviewAnswers[question.id];
    if (!answer || !isInterviewAnswerValid(question.type, answer.answer)) {
      return question.id;
    }
    if (!answer.confirmedByUser) {
      return question.id;
    }
  }
  return null;
};

export const buildIncomeTaxDraftChecklist = (
  state: IncomeTaxDraftStoredState
): IncomeTaxDraftChecklist => {
  const items: IncomeTaxDraftChecklistItem[] = [];

  if (!state.eurStatement) {
    items.push({
      id: "eur.missing",
      severity: "BLOCKER",
      message: "Generate EÜR statement before completing the annual filing draft.",
      actionId: "generate-eur",
    });
  }

  const nextQuestionId = getMissingRequiredQuestionId(state);
  if (nextQuestionId) {
    items.push({
      id: `interview.${nextQuestionId}`,
      severity: "BLOCKER",
      message: `Answer and confirm "${nextQuestionId}".`,
      actionId: `answer-${nextQuestionId}`,
    });
  }

  if (state.eurStatement && !state.computed) {
    items.push({
      id: "computed.missing",
      severity: "BLOCKER",
      message: "Recompute the draft to refresh estimated tax after data changes.",
      actionId: "recompute",
    });
  }

  const isComplete = !items.some((item) => item.severity === "BLOCKER");

  return {
    isComplete,
    nextQuestionId: state.eurStatement ? nextQuestionId : null,
    items,
  };
};

export const buildIncomeTaxDraftComputed = (
  state: IncomeTaxDraftStoredState,
  computedAtIso: string
): IncomeTaxDraftComputed | null => {
  if (!state.eurStatement) {
    return null;
  }

  const incomeCents = state.eurStatement.totals.incomeCents;
  const expenseCents = state.eurStatement.totals.expenseCents;
  const profitCents = state.eurStatement.totals.profitCents;

  const professionalExpensesCents = getAnswerAsMoney(state, "professionalExpensesCents");
  const healthInsuranceCents = getAnswerAsMoney(state, "healthInsuranceCents");
  const hasChildren = getAnswerAsBoolean(state, "hasChildren");
  const childcareCostsCents = hasChildren ? getAnswerAsMoney(state, "childcareCostsCents") : 0;

  const deductionsCents = professionalExpensesCents + healthInsuranceCents + childcareCostsCents;
  const taxableIncomeCents = Math.max(0, profitCents - deductionsCents);
  const estimatedIncomeTaxDueCents = Math.round(taxableIncomeCents * 0.2);

  return {
    incomeCents,
    expenseCents,
    profitCents,
    deductionsCents,
    taxableIncomeCents,
    estimatedIncomeTaxDueCents,
    computedAt: computedAtIso,
  };
};

export const resolveIncomeTaxDraftStatus = (
  state: IncomeTaxDraftStoredState
): IncomeTaxDraftStatus => {
  if (state.submission) {
    return "SUBMITTED";
  }

  const checklist = state.checklist ?? buildIncomeTaxDraftChecklist(state);
  if (checklist.isComplete) {
    return "READY";
  }

  const hasAnswers = Object.keys(state.interviewAnswers).length > 0;
  if (hasAnswers || state.eurStatement) {
    return "IN_PROGRESS";
  }

  return "DRAFT";
};

export const buildIncomeTaxDraftNextRequiredActions = (
  state: IncomeTaxDraftStoredState,
  checklist: IncomeTaxDraftChecklist
): IncomeTaxDraftNextAction[] => {
  const actions: IncomeTaxDraftNextAction[] = [];

  if (!state.eurStatement) {
    actions.push({
      id: "generate-eur",
      label: "Generate EÜR",
      blocking: true,
    });
  }

  if (checklist.nextQuestionId) {
    actions.push({
      id: `answer-${checklist.nextQuestionId}`,
      label: `Answer ${checklist.nextQuestionId}`,
      blocking: true,
    });
  }

  if (state.eurStatement && !state.computed) {
    actions.push({
      id: "recompute",
      label: "Recompute draft",
      blocking: true,
    });
  }

  if (checklist.isComplete && !state.submission) {
    actions.push({
      id: "export-pdf",
      label: "Export draft PDF",
      blocking: false,
    });
    actions.push({
      id: "record-submission",
      label: "Record submission confirmation",
      blocking: false,
    });
  }

  return actions;
};

export const buildIncomeTaxDraftDto = (params: {
  draftId: string;
  year: number;
  currency: string;
  createdAtIso: string;
  updatedAtIso: string;
  state: IncomeTaxDraftStoredState;
}): IncomeTaxDraftDto => {
  const checklist = params.state.checklist ?? buildIncomeTaxDraftChecklist(params.state);

  return {
    draftId: params.draftId,
    year: params.year,
    status: resolveIncomeTaxDraftStatus({
      ...params.state,
      checklist,
    }),
    jurisdiction: "DE",
    strategy: "PERSONAL",
    currency: params.currency,
    interviewQuestions: buildInterviewQuestions(params.state),
    eurStatement: params.state.eurStatement,
    computed: params.state.computed,
    checklist,
    submission: params.state.submission,
    createdAt: params.createdAtIso,
    updatedAt: params.updatedAtIso,
  };
};

export const buildIncomeTaxDraftSummary = (draft: IncomeTaxDraftDto): IncomeTaxDraftSummary => {
  const incomeCents = draft.computed?.incomeCents ?? draft.eurStatement?.totals.incomeCents ?? 0;
  const expenseCents = draft.computed?.expenseCents ?? draft.eurStatement?.totals.expenseCents ?? 0;
  const profitCents = draft.computed?.profitCents ?? draft.eurStatement?.totals.profitCents ?? 0;

  return {
    draftId: draft.draftId,
    year: draft.year,
    status: draft.status,
    jurisdiction: draft.jurisdiction,
    strategy: draft.strategy,
    currency: draft.currency,
    incomeCents,
    expenseCents,
    profitCents,
    taxableIncomeCents: draft.computed?.taxableIncomeCents ?? 0,
    estimatedIncomeTaxDueCents: draft.computed?.estimatedIncomeTaxDueCents ?? 0,
    checklist: draft.checklist,
    updatedAt: draft.updatedAt,
  };
};

export const buildIncomeTaxDraftMutationOutput = (
  draft: IncomeTaxDraftDto
): IncomeTaxDraftMutationOutput => ({
  draft,
  draftSummary: buildIncomeTaxDraftSummary(draft),
  nextRequiredActions: buildIncomeTaxDraftNextRequiredActions(
    {
      interviewAnswers: Object.fromEntries(
        draft.interviewQuestions.flatMap((question) =>
          question.answer ? [[question.id, question.answer] as const] : []
        )
      ),
      eurStatement: draft.eurStatement,
      computed: draft.computed,
      checklist: draft.checklist,
      submission: draft.submission,
    },
    draft.checklist
  ),
});

export const toIncomeTaxSubmission = (params: {
  channel: IncomeTaxDraftSubmission["channel"];
  submittedAtIso: string;
  referenceId?: string;
  notes?: string;
}): IncomeTaxDraftSubmission => ({
  channel: params.channel,
  submittedAt: params.submittedAtIso,
  referenceId: params.referenceId ?? null,
  notes: params.notes ?? null,
});
