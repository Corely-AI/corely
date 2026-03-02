import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
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
import type { SequenceStepType, UpdateSequenceInput } from "@corely/contracts";
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

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<EditableStep[]>([]);

  const {
    data: sequence,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["sequence", id],
    queryFn: () => crmApi.getSequence(id ?? ""),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!sequence) {
      return;
    }
    setName(sequence.name);
    setDescription(sequence.description ?? "");
    setSteps(
      (sequence.steps ?? [])
        .slice()
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step) =>
          createStep({
            id: step.id,
            type: step.type,
            dayDelay: String(step.dayDelay),
            templateSubject: step.templateSubject ?? "",
            templateBody: step.templateBody ?? "",
          })
        )
    );
    setIsEditing(false);
  }, [sequence]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateSequenceInput) => crmApi.updateSequence(id ?? "", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sequences"] });
      void queryClient.invalidateQueries({ queryKey: ["sequence", id] });
      toast.success("Sequence updated");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update sequence");
    },
  });

  const isPresetDisabled = useMemo(
    () =>
      steps.length === NAILS_PRESET_STEPS.length &&
      steps.every((step) => step.type === "EMAIL_AUTO"),
    [steps]
  );

  if (!id) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Invalid sequence id.
          </CardContent>
        </Card>
      </div>
    );
  }

  const setReadonly = !isEditing || updateMutation.isPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Sequence name is required");
      return;
    }
    if (steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }

    const normalizedSteps = steps.map((step, index) => ({
      stepOrder: index + 1,
      type: step.type,
      dayDelay: Number(step.dayDelay || "0"),
      templateSubject: step.templateSubject.trim() || undefined,
      templateBody: step.templateBody.trim() || undefined,
    }));

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      steps: normalizedSteps,
    });
  };

  const addStep = () => {
    if (setReadonly) {
      return;
    }
    setSteps((prev) => [...prev, createStep()]);
  };

  const removeStep = (stepId: string) => {
    if (setReadonly) {
      return;
    }
    setSteps((prev) => (prev.length === 1 ? prev : prev.filter((step) => step.id !== stepId)));
  };

  const updateStep = (stepId: string, patch: Partial<EditableStep>) => {
    if (setReadonly) {
      return;
    }
    setSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, ...patch } : step)));
  };

  const applyNailsPreset = () => {
    if (setReadonly) {
      return;
    }
    setName((prev) => prev || "Lead to Won - Nails");
    setDescription(
      (prev) => prev || "Automated day 1/day 3/day 7 email follow-up for nails leads."
    );
    setSteps(NAILS_PRESET_STEPS.map((step) => ({ ...step, id: crypto.randomUUID() })));
  };

  const onCancelEdit = () => {
    if (!sequence) {
      setIsEditing(false);
      return;
    }
    setName(sequence.name);
    setDescription(sequence.description ?? "");
    setSteps(
      (sequence.steps ?? [])
        .slice()
        .sort((a, b) => a.stepOrder - b.stepOrder)
        .map((step) =>
          createStep({
            id: step.id,
            type: step.type,
            dayDelay: String(step.dayDelay),
            templateSubject: step.templateSubject ?? "",
            templateBody: step.templateBody ?? "",
          })
        )
    );
    setIsEditing(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-sequence-detail-page">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/sequences")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-h1 text-foreground">
            {isLoading ? "Sequence" : (sequence?.name ?? "Sequence")}
          </h1>
        </div>
        {!isLoading && !isError && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button type="button" variant="outline" onClick={onCancelEdit}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" form="sequence-detail-form" variant="accent">
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            ) : (
              <Button type="button" variant="accent" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading sequence...
          </CardContent>
        </Card>
      ) : isError || !sequence ? (
        <Card>
          <CardContent className="py-6 space-y-3">
            <p className="text-sm text-muted-foreground">Could not load this sequence.</p>
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{isEditing ? "Edit Sequence" : "Sequence Details"}</CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={applyNailsPreset}
                disabled={setReadonly || isPresetDisabled}
              >
                <Sparkles className="h-4 w-4" />
                Apply Nails 3-step preset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form
              id="sequence-detail-form"
              className="space-y-4"
              onSubmit={onSubmit}
              data-testid="crm-sequence-detail-form"
            >
              <div>
                <Label htmlFor="sequence-name">Name</Label>
                <Input
                  id="sequence-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={setReadonly}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sequence-description">Description</Label>
                <Input
                  id="sequence-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={setReadonly}
                />
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <Card key={step.id} className="border-dashed">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">Step {index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(step.id)}
                          disabled={setReadonly || steps.length === 1}
                          aria-label={`Remove step ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`sequence-step-type-${step.id}`}>Step Type</Label>
                          <select
                            id={`sequence-step-type-${step.id}`}
                            value={step.type}
                            disabled={setReadonly}
                            onChange={(event) =>
                              updateStep(step.id, {
                                type: event.target.value as SequenceStepType,
                              })
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                          >
                            <option value="TASK">Task</option>
                            <option value="CALL">Call</option>
                            <option value="EMAIL_MANUAL">Email Manual</option>
                            <option value="EMAIL_AUTO">Email Auto</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`sequence-day-delay-${step.id}`}>Day Delay</Label>
                          <Input
                            id={`sequence-day-delay-${step.id}`}
                            type="number"
                            min={0}
                            value={step.dayDelay}
                            disabled={setReadonly}
                            onChange={(event) =>
                              updateStep(step.id, { dayDelay: event.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`sequence-step-subject-${step.id}`}>Step Subject</Label>
                        <Input
                          id={`sequence-step-subject-${step.id}`}
                          value={step.templateSubject}
                          disabled={setReadonly}
                          onChange={(event) =>
                            updateStep(step.id, { templateSubject: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`sequence-step-body-${step.id}`}>Step Body</Label>
                        <Textarea
                          id={`sequence-step-body-${step.id}`}
                          rows={4}
                          value={step.templateBody}
                          disabled={setReadonly}
                          onChange={(event) =>
                            updateStep(step.id, { templateBody: event.target.value })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addStep} disabled={setReadonly}>
                <Plus className="h-4 w-4" />
                Add Step
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
