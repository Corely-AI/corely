import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import {
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
} from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { invalidateResourceQueries } from "@/shared/crud";
import { classGroupKeys } from "../queries";
import {
  ClassGroupScheduleBuilder,
  type ScheduleBuilderOutput,
} from "../components/class-group-schedule-builder";

export default function ClassGroupEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: classGroupKeys.detail(id ?? ""),
    queryFn: () => (id ? classesApi.getClassGroup(id) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const group = data?.classGroup;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [price, setPrice] = useState("");
  const [scheduleOutput, setScheduleOutput] = useState<ScheduleBuilderOutput>({
    enabled: false,
    error: "",
    schedulePattern: null,
  });

  useEffect(() => {
    if (!group) {
      return;
    }
    setName(group.name);
    setSubject(group.subject);
    setLevel(group.level);
    setCurrency(group.currency);
    setPrice((group.defaultPricePerSession / 100).toFixed(2));
  }, [group]);

  const mutation = useMutation({
    mutationFn: async () => {
      const priceValue = Number(price);
      const schedulePatternPayload = scheduleOutput.enabled ? scheduleOutput.schedulePattern : null;
      const payload = {
        name: name.trim(),
        subject: subject.trim(),
        level: level.trim(),
        currency,
        defaultPricePerSession: Number.isFinite(priceValue) ? Math.round(priceValue * 100) : 0,
        schedulePattern: schedulePatternPayload,
      };

      if (isEdit && id) {
        return classesApi.updateClassGroup(id, payload);
      }
      return classesApi.createClassGroup(payload);
    },
    onSuccess: async () => {
      await invalidateResourceQueries(queryClient, "class-groups");
      toast.success(isEdit ? "Class group updated" : "Class group created");
      navigate("/class-groups");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to save class group"),
  });

  const canSave =
    name.trim().length > 0 &&
    subject.trim().length > 0 &&
    level.trim().length > 0 &&
    !scheduleOutput.error;

  const handleSave = () => {
    if (!canSave) {
      toast.error("Fill in all required fields");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">
              {isEdit ? "Edit class group" : "New class group"}
            </div>
            <div className="text-sm text-muted-foreground">
              Define your group subject, level, and default pricing.
            </div>
          </div>
        </div>
        <Button variant="accent" disabled={!canSave || mutation.isPending} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Input value={level} onChange={(e) => setLevel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price per session</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <ClassGroupScheduleBuilder
            initialPattern={group?.schedulePattern ?? null}
            onChange={setScheduleOutput}
          />
        </CardContent>
      </Card>
    </div>
  );
}
