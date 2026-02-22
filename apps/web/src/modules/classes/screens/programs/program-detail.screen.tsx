import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@corely/ui";
import { toast } from "sonner";
import type { ClassSessionType, MilestoneType } from "@corely/contracts";
import {
  useCreateCohortFromProgramMutation,
  useProgramMutations,
  useProgramQuery,
} from "../../hooks/use-classes-academy";

const SESSION_TYPES: ClassSessionType[] = ["LECTURE", "LAB", "OFFICE_HOURS", "REVIEW", "DEMO_DAY"];
const MILESTONE_TYPES: MilestoneType[] = ["PROJECT", "ASSESSMENT", "CHECKPOINT"];

type SessionTemplateRow = {
  index: number;
  title: string;
  defaultDurationMin: string;
  type: ClassSessionType;
};

type MilestoneTemplateRow = {
  index: number;
  title: string;
  required: boolean;
  type: MilestoneType;
};

export default function ProgramDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = !id;
  const isEdit = isNew || location.pathname.endsWith("/edit");

  const { data, isLoading, isError, refetch } = useProgramQuery(id);
  const programMutations = useProgramMutations(id);
  const createCohortMutation = useCreateCohortFromProgramMutation(id);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [levelTag, setLevelTag] = React.useState("");
  const [expectedSessionsCount, setExpectedSessionsCount] = React.useState("");
  const [defaultTimezone, setDefaultTimezone] = React.useState("Europe/Berlin");
  const [sessionTemplates, setSessionTemplates] = React.useState<SessionTemplateRow[]>([]);
  const [milestoneTemplates, setMilestoneTemplates] = React.useState<MilestoneTemplateRow[]>([]);
  const [cohortName, setCohortName] = React.useState("");
  const [cohortSubject, setCohortSubject] = React.useState("");
  const [cohortLevel, setCohortLevel] = React.useState("");
  const [defaultPrice, setDefaultPrice] = React.useState("0");
  const [currency, setCurrency] = React.useState("EUR");

  React.useEffect(() => {
    if (!data?.program) {
      if (!isNew) {
        return;
      }
      setSessionTemplates([]);
      setMilestoneTemplates([]);
      return;
    }

    setTitle(data.program.title);
    setDescription(data.program.description ?? "");
    setLevelTag(data.program.levelTag ?? "");
    setExpectedSessionsCount(
      data.program.expectedSessionsCount ? String(data.program.expectedSessionsCount) : ""
    );
    setDefaultTimezone(data.program.defaultTimezone ?? "Europe/Berlin");
    setSessionTemplates(
      data.sessionTemplates.map((template) => ({
        index: template.index,
        title: template.title ?? "",
        defaultDurationMin: template.defaultDurationMin ? String(template.defaultDurationMin) : "",
        type: template.type,
      }))
    );
    setMilestoneTemplates(
      data.milestoneTemplates.map((template) => ({
        index: template.index,
        title: template.title,
        required: template.required,
        type: template.type,
      }))
    );
    setCohortName(`${data.program.title} ${new Date().toISOString().slice(0, 7)}`);
    setCohortSubject(data.program.title);
    setCohortLevel(data.program.levelTag ?? "");
  }, [data, isNew]);

  const saveProgram = async () => {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      levelTag: levelTag.trim() || null,
      expectedSessionsCount: expectedSessionsCount ? Number(expectedSessionsCount) : null,
      defaultTimezone: defaultTimezone.trim() || null,
      sessionTemplates: sessionTemplates
        .filter((item) => item.index > 0)
        .map((item) => ({
          index: item.index,
          title: item.title.trim() || null,
          defaultDurationMin: item.defaultDurationMin ? Number(item.defaultDurationMin) : null,
          type: item.type,
        })),
      milestoneTemplates: milestoneTemplates
        .filter((item) => item.index > 0 && item.title.trim().length > 0)
        .map((item) => ({
          index: item.index,
          title: item.title.trim(),
          required: item.required,
          type: item.type,
        })),
    };

    try {
      if (isNew) {
        const created = await programMutations.create.mutateAsync(payload);
        toast.success("Combo created");
        navigate(`/classes/programs/${created.program.id}`);
        return;
      }
      await programMutations.update.mutateAsync({
        title: payload.title,
        description: payload.description,
        levelTag: payload.levelTag,
        expectedSessionsCount: payload.expectedSessionsCount,
        defaultTimezone: payload.defaultTimezone,
      });
      await programMutations.replaceSessionTemplates.mutateAsync({
        items: payload.sessionTemplates,
      });
      await programMutations.replaceMilestoneTemplates.mutateAsync({
        items: payload.milestoneTemplates,
      });
      toast.success("Combo updated");
      if (id) {
        navigate(`/classes/programs/${id}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save combo");
    }
  };

  const createCohort = async () => {
    if (!id) {
      return;
    }
    if (!cohortName.trim()) {
      toast.error("Cohort name is required.");
      return;
    }
    try {
      const created = await createCohortMutation.mutateAsync({
        cohortName: cohortName.trim(),
        subject: cohortSubject.trim() || title.trim(),
        level: cohortLevel.trim() || levelTag.trim() || "A1",
        defaultPricePerSession: Math.max(0, Math.round(Number(defaultPrice || "0") * 100)),
        currency,
        timezone: defaultTimezone || "Europe/Berlin",
        generateSessionsFromTemplates: false,
      });
      toast.success("Cohort created from combo");
      navigate(`/classes/cohorts/${created.classGroup.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create cohort");
    }
  };

  const pending =
    programMutations.create.isPending ||
    programMutations.update.isPending ||
    programMutations.replaceSessionTemplates.isPending ||
    programMutations.replaceMilestoneTemplates.isPending ||
    programMutations.remove.isPending ||
    createCohortMutation.isPending;

  if (!isNew && isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading combo...</div>;
  }

  if (!isNew && isError) {
    return (
      <div className="p-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-3 text-sm text-destructive">Failed to load combo.</div>
          <Button variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8" data-testid="classes-program-detail-screen">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {isNew ? "New combo" : title || "Combo detail"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Define templates and spin up cohorts from this combo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && !isEdit ? (
            <Button
              variant="outline"
              data-testid="classes-program-edit-button"
              onClick={() => navigate(`/classes/programs/${id}/edit`)}
            >
              Edit
            </Button>
          ) : null}
          {!isNew ? (
            <Button
              variant="outline"
              data-testid="classes-program-delete-button"
              disabled={pending}
              onClick={async () => {
                if (!id) {
                  return;
                }
                try {
                  await programMutations.remove.mutateAsync(id);
                  toast.success("Combo deleted");
                  navigate("/classes/programs");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to delete combo");
                }
              }}
            >
              Delete
            </Button>
          ) : null}
          {isEdit ? (
            <Button
              variant="accent"
              data-testid="classes-program-save-button"
              disabled={pending}
              onClick={() => void saveProgram()}
            >
              Save
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={!isEdit}
              data-testid="classes-program-title-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Level tag</Label>
            <Input
              value={levelTag}
              onChange={(event) => setLevelTag(event.target.value)}
              placeholder="A1.1, A1.2, B1..."
              disabled={!isEdit}
              data-testid="classes-program-level-tag-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Expected sessions</Label>
            <Input
              type="number"
              min="0"
              value={expectedSessionsCount}
              onChange={(event) => setExpectedSessionsCount(event.target.value)}
              disabled={!isEdit}
              data-testid="classes-program-expected-sessions-input"
            />
          </div>
          <div className="space-y-2">
            <Label>Default timezone</Label>
            <Input
              value={defaultTimezone}
              onChange={(event) => setDefaultTimezone(event.target.value)}
              disabled={!isEdit}
              data-testid="classes-program-timezone-input"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={!isEdit}
              data-testid="classes-program-description-input"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Session templates</h2>
            {isEdit ? (
              <Button
                variant="outline"
                data-testid="classes-program-add-session-template-button"
                onClick={() =>
                  setSessionTemplates((current) => [
                    ...current,
                    {
                      index: current.length + 1,
                      title: "",
                      defaultDurationMin: "120",
                      type: "LECTURE",
                    },
                  ])
                }
              >
                Add session template
              </Button>
            ) : null}
          </div>
          <div className="space-y-3">
            {sessionTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground">No session templates configured.</div>
            ) : (
              sessionTemplates.map((item, index) => (
                <div
                  key={`${item.index}-${index}`}
                  className="grid gap-3 md:grid-cols-12"
                  data-testid={`classes-program-session-template-row-${index}`}
                >
                  <Input
                    className="md:col-span-1"
                    value={String(item.index)}
                    type="number"
                    onChange={(event) =>
                      setSessionTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, index: Number(event.target.value) } : row
                        )
                      )
                    }
                    disabled={!isEdit}
                    data-testid={`classes-program-session-template-index-${index}`}
                  />
                  <Input
                    className="md:col-span-5"
                    value={item.title}
                    placeholder="Template title"
                    onChange={(event) =>
                      setSessionTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, title: event.target.value } : row
                        )
                      )
                    }
                    disabled={!isEdit}
                    data-testid={`classes-program-session-template-title-${index}`}
                  />
                  <Input
                    className="md:col-span-2"
                    value={item.defaultDurationMin}
                    type="number"
                    min="0"
                    onChange={(event) =>
                      setSessionTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index
                            ? { ...row, defaultDurationMin: event.target.value }
                            : row
                        )
                      )
                    }
                    disabled={!isEdit}
                    data-testid={`classes-program-session-template-duration-${index}`}
                  />
                  <Select
                    value={item.type}
                    onValueChange={(next) =>
                      setSessionTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, type: next as ClassSessionType } : row
                        )
                      )
                    }
                    disabled={!isEdit}
                  >
                    <SelectTrigger
                      className="md:col-span-3"
                      data-testid={`classes-program-session-template-type-${index}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit ? (
                    <Button
                      className="md:col-span-1"
                      variant="ghost"
                      data-testid={`classes-program-session-template-remove-${index}`}
                      onClick={() =>
                        setSessionTemplates((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index)
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Milestone templates</h2>
            {isEdit ? (
              <Button
                variant="outline"
                data-testid="classes-program-add-milestone-template-button"
                onClick={() =>
                  setMilestoneTemplates((current) => [
                    ...current,
                    {
                      index: current.length + 1,
                      title: "",
                      required: true,
                      type: "CHECKPOINT",
                    },
                  ])
                }
              >
                Add milestone template
              </Button>
            ) : null}
          </div>
          <div className="space-y-3">
            {milestoneTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No milestone templates configured.
              </div>
            ) : (
              milestoneTemplates.map((item, index) => (
                <div
                  key={`${item.index}-${index}`}
                  className="grid gap-3 md:grid-cols-12"
                  data-testid={`classes-program-milestone-template-row-${index}`}
                >
                  <Input
                    className="md:col-span-1"
                    value={String(item.index)}
                    type="number"
                    onChange={(event) =>
                      setMilestoneTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, index: Number(event.target.value) } : row
                        )
                      )
                    }
                    disabled={!isEdit}
                    data-testid={`classes-program-milestone-template-index-${index}`}
                  />
                  <Input
                    className="md:col-span-6"
                    value={item.title}
                    placeholder="Milestone title"
                    onChange={(event) =>
                      setMilestoneTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, title: event.target.value } : row
                        )
                      )
                    }
                    disabled={!isEdit}
                    data-testid={`classes-program-milestone-template-title-${index}`}
                  />
                  <Select
                    value={item.type}
                    onValueChange={(next) =>
                      setMilestoneTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, type: next as MilestoneType } : row
                        )
                      )
                    }
                    disabled={!isEdit}
                  >
                    <SelectTrigger
                      className="md:col-span-3"
                      data-testid={`classes-program-milestone-template-type-${index}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MILESTONE_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="md:col-span-1"
                    variant={item.required ? "accent-outline" : "outline"}
                    disabled={!isEdit}
                    data-testid={`classes-program-milestone-template-required-${index}`}
                    onClick={() =>
                      setMilestoneTemplates((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, required: !row.required } : row
                        )
                      )
                    }
                  >
                    {item.required ? "Required" : "Optional"}
                  </Button>
                  {isEdit ? (
                    <Button
                      className="md:col-span-1"
                      variant="ghost"
                      data-testid={`classes-program-milestone-template-remove-${index}`}
                      onClick={() =>
                        setMilestoneTemplates((current) =>
                          current.filter((_, rowIndex) => rowIndex !== index)
                        )
                      }
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {!isNew ? (
        <Card data-testid="classes-program-create-cohort-panel">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Create cohort from this combo</h2>
              <Badge variant="outline">Quick flow</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cohort name</Label>
                <Input
                  value={cohortName}
                  onChange={(event) => setCohortName(event.target.value)}
                  data-testid="classes-program-create-cohort-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={cohortSubject}
                  onChange={(event) => setCohortSubject(event.target.value)}
                  data-testid="classes-program-create-cohort-subject-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Input
                  value={cohortLevel}
                  onChange={(event) => setCohortLevel(event.target.value)}
                  data-testid="classes-program-create-cohort-level-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input
                  value={defaultTimezone}
                  onChange={(event) => setDefaultTimezone(event.target.value)}
                  data-testid="classes-program-create-cohort-timezone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Default price per session</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultPrice}
                  onChange={(event) => setDefaultPrice(event.target.value)}
                  data-testid="classes-program-create-cohort-price-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  data-testid="classes-program-create-cohort-currency-input"
                />
              </div>
            </div>
            <Button
              variant="accent"
              data-testid="classes-program-create-cohort-button"
              disabled={pending}
              onClick={() => void createCohort()}
            >
              Create cohort
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
