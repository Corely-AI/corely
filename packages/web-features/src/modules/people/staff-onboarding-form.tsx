import { useState, type FormEvent } from "react";
import { Button, Input } from "@corely/ui";
import { ApproveStaffOnboardingSchema } from "@corely/contracts";
import type { StaffJourneyCopy } from "./staff-journey-copy";
export function StaffOnboardingForm({
  version,
  t,
  busy,
  onSave,
}: {
  version: number;
  t: StaffJourneyCopy;
  busy: boolean;
  onSave: (body: unknown) => void;
}) {
  const [title, setTitle] = useState(""),
    [steps, setSteps] = useState(() => [{ id: crypto.randomUUID(), title: "" }]),
    [invalid, setInvalid] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = ApproveStaffOnboardingSchema.safeParse({ version, title, steps });
    setInvalid(!result.success);
    if (result.success) {
      onSave(result.data);
    }
  }
  return (
    <form onSubmit={submit}>
      <p className="staff-muted">{t.approvalHint}</p>
      {invalid && (
        <p role="alert" className="staff-error">
          {t.invalid}
        </p>
      )}
      <label>
        {t.checklistTitle}
        <Input
          required
          maxLength={240}
          value={title}
          disabled={busy}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      {steps.map((step, index) => (
        <div key={step.id} className="staff-step-row">
          <label>
            {t.step} {index + 1}
            <Input
              required
              maxLength={240}
              value={step.title}
              disabled={busy}
              onChange={(e) =>
                setSteps(steps.map((s) => (s.id === step.id ? { ...s, title: e.target.value } : s)))
              }
            />
          </label>
          <Button
            type="button"
            className="staff-secondary"
            aria-label={`${t.remove} ${index + 1}`}
            disabled={busy || steps.length === 1}
            onClick={() => setSteps(steps.filter((s) => s.id !== step.id))}
          >
            ×
          </Button>
        </div>
      ))}
      <div className="staff-actions">
        <Button
          type="button"
          className="staff-secondary"
          disabled={busy || steps.length >= 10}
          onClick={() => setSteps([...steps, { id: crypto.randomUUID(), title: "" }])}
        >
          {t.addStep}
        </Button>
        <Button type="submit" className="staff-primary" disabled={busy}>
          {t.approve}
        </Button>
      </div>
    </form>
  );
}
