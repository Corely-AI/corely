import type { CoachingQuestionnaireTemplate, LocalizedText } from "@corely/contracts";
import type { CoachingResolvedQuestionnaire } from "./coaching.types";

export const resolveLocalizedText = (
  text: LocalizedText | null | undefined,
  locale: string,
  fallbackLocale = "en"
) => {
  if (!text) {
    return "";
  }
  return (
    text[locale] ??
    text[locale.split("-")[0] ?? ""] ??
    text[fallbackLocale] ??
    Object.values(text)[0] ??
    ""
  );
};

export const resolveQuestionnaireTemplate = (params: {
  sessionId: string;
  engagementId: string;
  locale: string;
  template: CoachingQuestionnaireTemplate;
}): CoachingResolvedQuestionnaire => ({
  sessionId: params.sessionId,
  engagementId: params.engagementId,
  locale: params.locale,
  title: resolveLocalizedText(params.template.title, params.locale),
  description: params.template.description
    ? resolveLocalizedText(params.template.description, params.locale)
    : null,
  questions: params.template.questions.map((question) => ({
    key: question.key,
    type: question.type,
    required: question.required,
    labelResolved: resolveLocalizedText(question.label, params.locale),
    helpTextResolved: question.helpText
      ? resolveLocalizedText(question.helpText, params.locale)
      : null,
    label: question.label,
    helpText: question.helpText,
    optionsResolved: (question.options ?? []).map((option) => ({
      value: option.value,
      label: option.label,
      labelResolved: resolveLocalizedText(option.label, params.locale),
    })),
  })),
});
