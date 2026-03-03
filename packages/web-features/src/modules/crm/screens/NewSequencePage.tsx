import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@corely/ui";
import type { CreateSequenceInput, SequenceStepType } from "@corely/contracts";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { toast } from "sonner";

type EditableStep = {
  id: string;
  type: SequenceStepType;
  dayDelay: string;
  templateSubject: string;
  templateBody: string;
};

const createStep = (overrides?: Partial<EditableStep>): EditableStep => ({
  id: crypto.randomUUID(),
  type: "TASK",
  dayDelay: "0",
  templateSubject: "",
  templateBody: "",
  ...overrides,
});

const NAILS_PRESET_STEPS: EditableStep[] = [
  createStep({
    type: "EMAIL_AUTO",
    dayDelay: "0",
    templateSubject: "Welcome to Corely Nails",
    templateBody:
      "Hi there,\n\nThanks for your interest. You can preview our demo website here: https://nails.corely.one/\n\nReply to this email if you want us to walk you through it live.",
  }),
  createStep({
    type: "EMAIL_AUTO",
    dayDelay: "3",
    templateSubject: "Quick follow-up on your nails demo",
    templateBody:
      "Hi again,\n\nJust following up to see if you had time to check the demo: https://nails.corely.one/\n\nHappy to answer any questions.",
  }),
  createStep({
    type: "EMAIL_AUTO",
    dayDelay: "7",
    templateSubject: "Final follow-up this week",
    templateBody:
      "Hi,\n\nFinal follow-up from our side this week. If it helps, we can tailor the setup for your business.\n\nDemo link: https://nails.corely.one/",
  }),
];

export default function NewSequencePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<EditableStep[]>([createStep()]);

  const createMutation = useMutation({
    mutationFn: (input: CreateSequenceInput) => crmApi.createSequence(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success(t("crm.sequences.created"));
      navigate("/crm/sequences");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("crm.sequences.createFailed"));
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("crm.sequences.nameRequired"));
      return;
    }

    if (steps.length === 0) {
      toast.error(t("crm.sequences.addAtLeastOneStep"));
      return;
    }

    const normalizedSteps = steps.map((step, index) => ({
      stepOrder: index + 1,
      type: step.type,
      dayDelay: Number(step.dayDelay || "0"),
      templateSubject: step.templateSubject.trim() || undefined,
      templateBody: step.templateBody.trim() || undefined,
    }));

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      steps: normalizedSteps,
    });
  };

  const isPresetDisabled = useMemo(
    () =>
      steps.length === NAILS_PRESET_STEPS.length &&
      steps.every((step) => step.type === "EMAIL_AUTO"),
    [steps]
  );

  const addStep = () => {
    setSteps((prev) => [...prev, createStep()]);
  };

  const removeStep = (stepId: string) => {
    setSteps((prev) => (prev.length === 1 ? prev : prev.filter((step) => step.id !== stepId)));
  };

  const updateStep = (stepId: string, patch: Partial<EditableStep>) => {
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, ...patch } : step)));
  };

  const applyNailsPreset = () => {
    setName((prev) => prev || t("crm.sequences.nailsPreset.name"));
    setDescription((prev) => prev || t("crm.sequences.nailsPreset.description"));
    setSteps(NAILS_PRESET_STEPS.map((step) => ({ ...step, id: crypto.randomUUID() })));
  };

  return (
    <div
      className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-3xl mx-auto"
      data-testid="crm-sequence-form-page"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/sequences")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-h1 text-foreground">{t("crm.sequences.new")}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("crm.sequences.setupTitle")}</CardTitle>
            <Button
              type="button"
              variant="outline"
              onClick={applyNailsPreset}
              disabled={createMutation.isPending || isPresetDisabled}
            >
              <Sparkles className="h-4 w-4" />
              {t("crm.sequences.applyPreset")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} data-testid="crm-sequence-form">
            <div>
              <Label htmlFor="sequence-name">{t("common.name")}</Label>
              <Input
                id="sequence-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="crm-sequence-name"
              />
            </div>
            <div>
              <Label htmlFor="sequence-description">{t("common.description")}</Label>
              <Input
                id="sequence-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="crm-sequence-description"
              />
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <Card key={step.id} className="border-dashed">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        {t("crm.sequences.stepTitle", { step: index + 1 })}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(step.id)}
                        disabled={steps.length === 1}
                        aria-label={t("crm.sequences.removeStep", { step: index + 1 })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`sequence-step-type-${step.id}`}>
                          {t("crm.sequences.stepType")}
                        </Label>
                        <select
                          id={`sequence-step-type-${step.id}`}
                          value={step.type}
                          onChange={(event) =>
                            updateStep(step.id, {
                              type: event.target.value as SequenceStepType,
                            })
                          }
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        >
                          <option value="TASK">{t("crm.sequences.stepTypes.task")}</option>
                          <option value="CALL">{t("crm.sequences.stepTypes.call")}</option>
                          <option value="EMAIL_MANUAL">
                            {t("crm.sequences.stepTypes.emailManual")}
                          </option>
                          <option value="EMAIL_AUTO">
                            {t("crm.sequences.stepTypes.emailAuto")}
                          </option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor={`sequence-day-delay-${step.id}`}>
                          {t("crm.sequences.dayDelay")}
                        </Label>
                        <Input
                          id={`sequence-day-delay-${step.id}`}
                          type="number"
                          min={0}
                          value={step.dayDelay}
                          onChange={(event) =>
                            updateStep(step.id, { dayDelay: event.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`sequence-step-subject-${step.id}`}>
                        {t("crm.sequences.stepSubject")}
                      </Label>
                      <Input
                        id={`sequence-step-subject-${step.id}`}
                        value={step.templateSubject}
                        onChange={(event) =>
                          updateStep(step.id, { templateSubject: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`sequence-step-body-${step.id}`}>
                        {t("crm.sequences.stepBody")}
                      </Label>
                      <Textarea
                        id={`sequence-step-body-${step.id}`}
                        rows={4}
                        value={step.templateBody}
                        onChange={(event) =>
                          updateStep(step.id, { templateBody: event.target.value })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addStep}>
              <Plus className="h-4 w-4" />
              {t("crm.sequences.addStep")}
            </Button>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="accent"
                disabled={createMutation.isPending}
                data-testid="crm-sequence-save"
              >
                <Save className="h-4 w-4" />
                {createMutation.isPending ? t("crm.sequences.creating") : t("crm.sequences.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
