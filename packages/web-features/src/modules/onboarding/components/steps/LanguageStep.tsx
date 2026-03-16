import React, { useState } from "react";
import { Button, RadioGroup, RadioGroupItem, Label, cn } from "@corely/ui";
import { ArrowRight, CheckCircle2, Languages } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";

const SUPPORTED_LANGUAGES = [
  { code: "de", label: "Deutsch", flag: "🇩🇪", hint: "Voreingestellte Sprache" },
  { code: "en", label: "English", flag: "🇬🇧", hint: "Default language" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳", hint: "Ngôn ngữ mặc định" },
];

export const LanguageStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const [selected, setSelected] = useState(locale || "en");

  const title = config.title[selected] || config.title["en"];
  const desc = config.description[selected] || config.description["en"];
  const cta = config.ctaLabel?.[selected] || config.ctaLabel?.["en"] || "Continue";

  return (
    <div
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-language"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <Languages className="h-10 w-10" />
      </div>

      <div className="max-w-2xl space-y-4 mb-16">
        <h1
          className="text-6xl font-black tracking-tight sm:text-7xl bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-[0.95]"
          data-testid="onboarding-step-title"
        >
          {title}
        </h1>
        <p
          className="text-2xl text-muted-foreground/80 leading-relaxed max-w-xl font-medium"
          data-testid="onboarding-step-description"
        >
          {desc}
        </p>
      </div>

      <RadioGroup
        value={selected}
        onValueChange={setSelected}
        className="grid grid-cols-1 gap-6 max-w-xl mb-16"
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <Label
              key={lang.code}
              htmlFor={`lang-${lang.code}`}
              className={cn(
                "group relative flex cursor-pointer items-center justify-between rounded-[2rem] border p-8 transition-all duration-500",
                isSelected
                  ? "border-accent/40 bg-accent/[0.04] shadow-2xl shadow-accent/10 ring-1 ring-accent/20"
                  : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
              )}
              data-testid={`onboarding-language-option-${lang.code}`}
            >
              <div className="flex items-center gap-6">
                <RadioGroupItem value={lang.code} id={`lang-${lang.code}`} className="sr-only" />
                <div
                  className={cn(
                    "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-5xl transition-all duration-500",
                    isSelected ? "scale-110 rotate-3 shadow-lg" : "group-hover:scale-110"
                  )}
                >
                  <span aria-hidden="true" className="filter drop-shadow-md">
                    {lang.flag}
                  </span>
                </div>
                <div className="space-y-1">
                  <span
                    className={cn(
                      "block text-2xl font-black tracking-tight transition-colors",
                      isSelected
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground/80"
                    )}
                  >
                    {lang.label}
                  </span>
                  <span className="block text-xs text-accent/50 tracking-[0.2em] uppercase font-black">
                    {lang.hint}
                  </span>
                </div>
              </div>

              {isSelected && (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-2xl animate-in zoom-in duration-500 glow-accent">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
            </Label>
          );
        })}
      </RadioGroup>

      <div className="w-full sm:w-auto">
        <Button
          size="lg"
          className="h-20 px-14 rounded-[2rem] text-xl font-black bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] transition-all duration-500 group shadow-2xl shadow-accent/20"
          onClick={() => onAdvance({ locale: selected })}
          disabled={isSaving}
          data-testid="onboarding-language-next"
        >
          <span className="flex items-center gap-4">
            {cta}
            <ArrowRight className="h-6 w-6 transition-transform duration-500 group-hover:translate-x-2" />
          </span>
        </Button>
      </div>
    </div>
  );
};
