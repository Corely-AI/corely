import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { z } from "zod";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type {
  CoachingAvailabilitySlot,
  CoachingMeetingType,
  CreateCoachingOfferInput,
} from "@corely/contracts";
import { coachingApi } from "@/lib/coaching-api";
import { coachingOfferKeys } from "../queries";
import { ConfirmDeleteDialog } from "@/shared/crud";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@corely/ui";

const DAYS = [
  { label: "Sun", dayOfWeek: 0 },
  { label: "Mon", dayOfWeek: 1 },
  { label: "Tue", dayOfWeek: 2 },
  { label: "Wed", dayOfWeek: 3 },
  { label: "Thu", dayOfWeek: 4 },
  { label: "Fri", dayOfWeek: 5 },
  { label: "Sat", dayOfWeek: 6 },
] as const;

type AvailabilityRow = {
  enabled: boolean;
  startTime: string;
  endTime: string;
};

type AvailabilityState = Record<number, AvailabilityRow>;

const buildDefaultAvailability = (): AvailabilityState =>
  Object.fromEntries(
    DAYS.map(({ dayOfWeek }) => [
      dayOfWeek,
      { enabled: dayOfWeek >= 1 && dayOfWeek <= 5, startTime: "09:00", endTime: "17:00" },
    ])
  );

const offerFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  localeDefault: z.string().trim().min(2).max(16).default("en"),
  currency: z.string().trim().length(3, "Currency must be 3 characters").default("EUR"),
  priceCents: z
    .string()
    .trim()
    .min(1, "Price is required")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: "Price must be a non-negative integer",
    }),
  sessionDurationMinutes: z
    .string()
    .trim()
    .min(1, "Duration is required")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "Duration must be a positive integer",
    }),
  meetingType: z.enum(["video", "phone", "in_person"]),
  timezone: z.string().trim().min(1, "Timezone is required"),
  minNoticeHours: z
    .string()
    .trim()
    .min(1, "Minimum notice is required")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: "Minimum notice must be a non-negative integer",
    }),
  maxAdvanceDays: z
    .string()
    .trim()
    .min(1, "Max advance booking window is required")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "Max advance days must be a positive integer",
    }),
  bufferBeforeMinutes: z
    .string()
    .trim()
    .default("0")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: "Buffer before must be a non-negative integer",
    }),
  bufferAfterMinutes: z
    .string()
    .trim()
    .default("0")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: "Buffer after must be a non-negative integer",
    }),
  contractRequired: z.boolean().default(true),
  paymentRequired: z.boolean().default(true),
  contractTemplate: z.string().optional(),
  prepQuestionsText: z.string().optional(),
  debriefQuestionsText: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerFormSchema>;

const DEFAULT_VALUES: OfferFormValues = {
  title: "",
  description: "",
  localeDefault: "en",
  currency: "EUR",
  priceCents: "",
  sessionDurationMinutes: "60",
  meetingType: "video",
  timezone: "Europe/Berlin",
  minNoticeHours: "24",
  maxAdvanceDays: "60",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "0",
  contractRequired: true,
  paymentRequired: true,
  contractTemplate: "",
  prepQuestionsText: "",
  debriefQuestionsText: "",
};

const getLocalizedValue = (
  value: Record<string, string> | null | undefined,
  localeDefault: string
) => {
  if (!value) {
    return "";
  }
  return value[localeDefault] ?? value.en ?? Object.values(value)[0] ?? "";
};

const templateToQuestionText = (
  template: { questions?: Array<{ label?: Record<string, string> }> } | null | undefined,
  localeDefault: string
) =>
  (template?.questions ?? [])
    .map((question) => getLocalizedValue(question.label, localeDefault))
    .filter(Boolean)
    .join("\n");

const toQuestionnaireTemplate = (
  title: string,
  localeDefault: string,
  text: string | undefined
) => {
  const questions = (text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!questions.length) {
    return null;
  }

  return {
    title: { [localeDefault]: title },
    questions: questions.map((label, index) => ({
      key: `${title.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
      label: { [localeDefault]: label },
      type: "long_text" as const,
      required: true,
      options: [],
    })),
  };
};

const availabilityToWeeklySlots = (availability: AvailabilityState): CoachingAvailabilitySlot[] =>
  DAYS.filter(({ dayOfWeek }) => availability[dayOfWeek]?.enabled).map(({ dayOfWeek }) => ({
    dayOfWeek,
    startTime: availability[dayOfWeek].startTime,
    endTime: availability[dayOfWeek].endTime,
  }));

const weeklySlotsToAvailability = (
  weeklySlots: CoachingAvailabilitySlot[] | undefined
): AvailabilityState => {
  const base = buildDefaultAvailability();
  for (const { dayOfWeek } of DAYS) {
    base[dayOfWeek].enabled = false;
  }
  for (const slot of weeklySlots ?? []) {
    base[slot.dayOfWeek] = {
      enabled: true,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  }
  return base;
};

export default function CoachingOfferEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { offerId } = useParams<{ offerId: string }>();
  const isEdit = Boolean(offerId);
  const [availability, setAvailability] = useState<AvailabilityState>(buildDefaultAvailability);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const offerQuery = useQuery({
    queryKey: offerId ? coachingOfferKeys.detail(offerId) : ["coaching/offers", "new"],
    queryFn: () => {
      if (!offerId) {
        throw new Error("Missing offer id");
      }
      return coachingApi.getOffer(offerId);
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (!offerQuery.data) {
      return;
    }

    const localeDefault = offerQuery.data.localeDefault || "en";
    form.reset({
      title: getLocalizedValue(offerQuery.data.title, localeDefault),
      description: getLocalizedValue(offerQuery.data.description, localeDefault),
      localeDefault,
      currency: offerQuery.data.currency,
      priceCents: String(offerQuery.data.priceCents),
      sessionDurationMinutes: String(offerQuery.data.sessionDurationMinutes),
      meetingType: offerQuery.data.meetingType,
      timezone: offerQuery.data.availabilityRule.timezone,
      minNoticeHours: String(offerQuery.data.bookingRules.minNoticeHours),
      maxAdvanceDays: String(offerQuery.data.bookingRules.maxAdvanceDays),
      bufferBeforeMinutes: String(offerQuery.data.bookingRules.bufferBeforeMinutes),
      bufferAfterMinutes: String(offerQuery.data.bookingRules.bufferAfterMinutes),
      contractRequired: offerQuery.data.contractRequired,
      paymentRequired: offerQuery.data.paymentRequired,
      contractTemplate: getLocalizedValue(offerQuery.data.contractTemplate, localeDefault),
      prepQuestionsText: templateToQuestionText(offerQuery.data.prepFormTemplate, localeDefault),
      debriefQuestionsText: templateToQuestionText(offerQuery.data.debriefTemplate, localeDefault),
    });
    setAvailability(weeklySlotsToAvailability(offerQuery.data.availabilityRule.weeklySlots));
  }, [form, offerQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: OfferFormValues) => {
      const weeklySlots = availabilityToWeeklySlots(availability);
      if (!weeklySlots.length) {
        throw new Error("At least one availability slot is required");
      }

      const payload: CreateCoachingOfferInput = {
        title: { [values.localeDefault]: values.title.trim() },
        description: values.description?.trim()
          ? { [values.localeDefault]: values.description.trim() }
          : undefined,
        currency: values.currency.trim().toUpperCase(),
        priceCents: Number(values.priceCents),
        sessionDurationMinutes: Number(values.sessionDurationMinutes),
        meetingType: values.meetingType as CoachingMeetingType,
        availabilityRule: {
          timezone: values.timezone.trim(),
          weeklySlots,
          blackouts: offerQuery.data?.availabilityRule.blackouts ?? [],
        },
        bookingRules: {
          minNoticeHours: Number(values.minNoticeHours),
          maxAdvanceDays: Number(values.maxAdvanceDays),
          bufferBeforeMinutes: Number(values.bufferBeforeMinutes),
          bufferAfterMinutes: Number(values.bufferAfterMinutes),
        },
        contractRequired: values.contractRequired,
        paymentRequired: values.paymentRequired,
        localeDefault: values.localeDefault.trim(),
        contractTemplate: values.contractTemplate?.trim()
          ? { [values.localeDefault]: values.contractTemplate.trim() }
          : null,
        prepFormTemplate: toQuestionnaireTemplate(
          "Prep form",
          values.localeDefault,
          values.prepQuestionsText
        ),
        debriefTemplate: toQuestionnaireTemplate(
          "Debrief form",
          values.localeDefault,
          values.debriefQuestionsText
        ),
      };

      if (offerId) {
        return coachingApi.updateOffer(offerId, payload);
      }
      return coachingApi.createOffer(payload);
    },
    onSuccess: async (result) => {
      toast.success(isEdit ? "Offer updated" : "Offer created");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: coachingOfferKeys.all() }),
        queryClient.invalidateQueries({ queryKey: coachingOfferKeys.detail(result.offer.id) }),
      ]);
      navigate(`/coaching/offers/${result.offer.id}`);
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || (error as Error).message || "Failed to save offer");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!offerId) {
        throw new Error("Missing offer id");
      }
      await coachingApi.archiveOffer(offerId);
    },
    onSuccess: async () => {
      toast.success("Offer archived");
      await queryClient.invalidateQueries({ queryKey: coachingOfferKeys.all() });
      navigate("/coaching/offers");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to archive offer");
    },
  });

  const pageTitle = useMemo(
    () => (isEdit ? "Edit coaching offer" : "Create coaching offer"),
    [isEdit]
  );

  const submit = form.handleSubmit(async (values) => {
    await saveMutation.mutateAsync(values);
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coaching/offers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure pricing, meeting type, availability, contract, and questionnaires.
            </p>
          </div>
        </div>
        {isEdit ? (
          <ConfirmDeleteDialog
            trigger={
              <Button variant="destructive" disabled={archiveMutation.isPending}>
                <Trash2 className="h-4 w-4" />
                Archive
              </Button>
            }
            title="Archive offer"
            description="Archived offers are hidden from the active list."
            isLoading={archiveMutation.isPending}
            onConfirm={async () => {
              await archiveMutation.mutateAsync();
            }}
          />
        ) : null}
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer-title">Title</Label>
                <Input id="offer-title" {...form.register("title")} />
                {form.formState.errors.title ? (
                  <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-locale">Default locale</Label>
                <Input id="offer-locale" {...form.register("localeDefault")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-description">Description</Label>
              <Textarea id="offer-description" rows={3} {...form.register("description")} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer-price">Price (cents)</Label>
                <Input id="offer-price" inputMode="numeric" {...form.register("priceCents")} />
                {form.formState.errors.priceCents ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.priceCents.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-currency">Currency</Label>
                <Input id="offer-currency" {...form.register("currency")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-duration">Duration (minutes)</Label>
                <Input
                  id="offer-duration"
                  inputMode="numeric"
                  {...form.register("sessionDurationMinutes")}
                />
                {form.formState.errors.sessionDurationMinutes ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.sessionDurationMinutes.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Meeting type</Label>
                <Select
                  value={form.watch("meetingType")}
                  onValueChange={(value) =>
                    form.setValue("meetingType", value as CoachingMeetingType, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a meeting type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="in_person">In person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={form.watch("contractRequired")}
                  onCheckedChange={(checked) =>
                    form.setValue("contractRequired", Boolean(checked), { shouldDirty: true })
                  }
                />
                <span className="text-sm">Contract required</span>
              </label>
              <label className="flex items-center gap-3">
                <Checkbox
                  checked={form.watch("paymentRequired")}
                  onCheckedChange={(checked) =>
                    form.setValue("paymentRequired", Boolean(checked), { shouldDirty: true })
                  }
                />
                <span className="text-sm">Payment required</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer-timezone">Timezone</Label>
                <Input id="offer-timezone" {...form.register("timezone")} />
                {form.formState.errors.timezone ? (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.timezone.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Weekly availability</Label>
              <div className="space-y-3">
                {DAYS.map(({ label, dayOfWeek }) => {
                  const row = availability[dayOfWeek];
                  return (
                    <div
                      key={dayOfWeek}
                      className="grid grid-cols-[80px_80px_1fr_1fr] gap-3 items-center"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={row.enabled}
                          onCheckedChange={(checked) =>
                            setAvailability((current) => ({
                              ...current,
                              [dayOfWeek]: { ...current[dayOfWeek], enabled: Boolean(checked) },
                            }))
                          }
                        />
                        Active
                      </label>
                      <Input
                        type="time"
                        value={row.startTime}
                        disabled={!row.enabled}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            [dayOfWeek]: {
                              ...current[dayOfWeek],
                              startTime: event.target.value,
                            },
                          }))
                        }
                      />
                      <Input
                        type="time"
                        value={row.endTime}
                        disabled={!row.enabled}
                        onChange={(event) =>
                          setAvailability((current) => ({
                            ...current,
                            [dayOfWeek]: {
                              ...current[dayOfWeek],
                              endTime: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="offer-min-notice">Min notice (hours)</Label>
                <Input
                  id="offer-min-notice"
                  inputMode="numeric"
                  {...form.register("minNoticeHours")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-max-advance">Max advance (days)</Label>
                <Input
                  id="offer-max-advance"
                  inputMode="numeric"
                  {...form.register("maxAdvanceDays")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-buffer-before">Buffer before (minutes)</Label>
                <Input
                  id="offer-buffer-before"
                  inputMode="numeric"
                  {...form.register("bufferBeforeMinutes")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-buffer-after">Buffer after (minutes)</Label>
                <Input
                  id="offer-buffer-after"
                  inputMode="numeric"
                  {...form.register("bufferAfterMinutes")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="offer-contract-template">Contract template</Label>
              <Textarea
                id="offer-contract-template"
                rows={6}
                placeholder="Outline the coaching agreement used for this offer."
                {...form.register("contractTemplate")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-prep-form">Prep form questions</Label>
              <Textarea
                id="offer-prep-form"
                rows={5}
                placeholder="One question per line"
                {...form.register("prepQuestionsText")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-debrief-form">Debrief form questions</Label>
              <Textarea
                id="offer-debrief-form"
                rows={5}
                placeholder="One question per line"
                {...form.register("debriefQuestionsText")}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          {isEdit ? (
            <Button asChild variant="outline">
              <Link to={`/coaching/offers/${offerId}`}>
                <Pencil className="h-4 w-4" />
                View details
              </Link>
            </Button>
          ) : null}
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Create offer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
