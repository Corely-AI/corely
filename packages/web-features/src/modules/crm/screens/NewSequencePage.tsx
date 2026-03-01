import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@corely/ui";
import type { CreateSequenceInput, SequenceStepType } from "@corely/contracts";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { toast } from "sonner";

export default function NewSequencePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stepType, setStepType] = useState<SequenceStepType>("TASK");
  const [dayDelay, setDayDelay] = useState("0");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const createMutation = useMutation({
    mutationFn: (input: CreateSequenceInput) => crmApi.createSequence(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sequence created");
      navigate("/crm/sequences");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create sequence");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      description: description || undefined,
      steps: [
        {
          stepOrder: 1,
          type: stepType,
          dayDelay: Number(dayDelay),
          templateSubject: templateSubject || undefined,
          templateBody: templateBody || undefined,
        },
      ],
    });
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
        <h1 className="text-h1 text-foreground">New Sequence</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sequence Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} data-testid="crm-sequence-form">
            <div>
              <Label htmlFor="sequence-name">Name</Label>
              <Input
                id="sequence-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="crm-sequence-name"
              />
            </div>
            <div>
              <Label htmlFor="sequence-description">Description</Label>
              <Input
                id="sequence-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="crm-sequence-description"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sequence-step-type">Step Type</Label>
                <select
                  id="sequence-step-type"
                  value={stepType}
                  onChange={(e) => setStepType(e.target.value as SequenceStepType)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  data-testid="crm-sequence-step-type"
                >
                  <option value="TASK">Task</option>
                  <option value="CALL">Call</option>
                  <option value="EMAIL_MANUAL">Email Manual</option>
                  <option value="EMAIL_AUTO">Email Auto</option>
                </select>
              </div>
              <div>
                <Label htmlFor="sequence-day-delay">Day Delay</Label>
                <Input
                  id="sequence-day-delay"
                  type="number"
                  min={0}
                  value={dayDelay}
                  onChange={(e) => setDayDelay(e.target.value)}
                  data-testid="crm-sequence-day-delay"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="sequence-step-subject">Step Subject</Label>
              <Input
                id="sequence-step-subject"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                data-testid="crm-sequence-step-subject"
              />
            </div>
            <div>
              <Label htmlFor="sequence-step-body">Step Body</Label>
              <textarea
                id="sequence-step-body"
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                data-testid="crm-sequence-step-body"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="accent"
                disabled={createMutation.isPending}
                data-testid="crm-sequence-save"
              >
                <Save className="h-4 w-4" />
                {createMutation.isPending ? "Creating..." : "Create Sequence"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
