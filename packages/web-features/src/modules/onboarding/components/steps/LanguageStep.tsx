import React, { useState } from "react";
import { Button, RadioGroup, RadioGroupItem, Label, Card, cn } from "@corely/ui";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";

const SUPPORTED_LANGUAGES = [
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

export const LanguageStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const [selected, setSelected] = useState(locale || "en");

  const title = config.title[selected] || config.title["en"];
  const desc = config.description[selected] || config.description["en"];
  const cta = config.ctaLabel?.[selected] || config.ctaLabel?.["en"] || "Continue";

  return (
    <div
      className="mx-auto flex max-w-md flex-col p-6 lg:p-12"
      data-testid="onboarding-step-language"
    >
      <h1
        className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl"
        data-testid="onboarding-step-title"
      >
        {title}
      </h1>
      <p className="mb-8 text-muted-foreground" data-testid="onboarding-step-description">
        {desc}
      </p>

      <RadioGroup value={selected} onValueChange={setSelected} className="space-y-3">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Label
            key={lang.code}
            htmlFor={`lang-${lang.code}`}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-xl border p-4 transition-colors hover:bg-accent",
              selected === lang.code ? "border-primary bg-primary/5" : "border-border"
            )}
            data-testid={`onboarding-language-option-${lang.code}`}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} className="sr-only" />
              <span className="text-2xl" aria-hidden="true">
                {lang.flag}
              </span>
              <span className="font-medium text-foreground">{lang.label}</span>
            </div>

            {selected === lang.code && <CheckCircle2 className="h-5 w-5 text-primary" />}
          </Label>
        ))}
      </RadioGroup>

      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          className="group gap-2"
          onClick={() => onAdvance({ locale: selected })}
          disabled={isSaving}
          data-testid="onboarding-language-next"
        >
          <span>{cta}</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
};
