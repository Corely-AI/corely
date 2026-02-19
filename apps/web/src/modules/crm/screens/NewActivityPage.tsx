import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  Clock3,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { Alert, AlertDescription, AlertTitle } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import { Checkbox } from "@corely/ui";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@corely/ui";
import { Input } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@corely/ui";
import { Calendar } from "@corely/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@corely/ui";
import { cn } from "@/shared/lib/utils";
import { crmApi } from "@/lib/crm-api";
import { customersApi } from "@/lib/customers-api";
import { toast } from "sonner";
import { useCrmChannels } from "../hooks/useChannels";
import { useCrmAiSettings } from "../hooks/useDeal";
import type {
  ActivityAiExtractOutput,
  ActivityAiParseOutput,
  CreateActivityToolCard,
} from "@corely/contracts";

const ACTIVITY_TYPES = ["NOTE", "TASK", "CALL", "MEETING", "COMMUNICATION"] as const;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const normalizeWhatsAppPhone = (phone: string | null | undefined) => {
  if (!phone) {
    return null;
  }
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6 ? digits : null;
};

export default function NewActivityPage() {
  const { t, i18n } = useTranslation();
  const { data: channels = [] } = useCrmChannels();
  const { data: aiSettings } = useCrmAiSettings();
  const aiEnabled = Boolean(aiSettings?.settings.aiEnabled);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [describeText, setDescribeText] = useState("");
  const [parseResult, setParseResult] = useState<ActivityAiParseOutput | null>(null);
  const [extractResult, setExtractResult] = useState<ActivityAiExtractOutput | null>(null);
  const [selectedFollowUps, setSelectedFollowUps] = useState<Record<string, boolean>>({});
  const [confirmCreateFollowUpsOpen, setConfirmCreateFollowUpsOpen] = useState(false);
  const [dealComboboxOpen, setDealComboboxOpen] = useState(false);
  const [contactComboboxOpen, setContactComboboxOpen] = useState(false);
  const activityFormSchema = useMemo(
    () =>
      z.object({
        type: z.enum(ACTIVITY_TYPES),
        subject: z.string().min(1, t("crm.activity.subjectRequired")),
        body: z.string().optional(),
        partyId: z.string().optional(),
        dealId: z.string().optional(),
        dueAt: z.string().optional(),
        channelKey: z.string().optional(),
        direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
        communicationStatus: z.enum(["LOGGED", "DRAFT"]).optional(),
      }),
    [t]
  );
  type ActivityFormValues = z.infer<typeof activityFormSchema>;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: "TASK",
      subject: "",
      body: "",
      partyId: "",
      dealId: "",
      dueAt: "",
      channelKey: "email",
      direction: "OUTBOUND",
      communicationStatus: "LOGGED",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ActivityFormValues) => {
      const dueAtIso =
        values.dueAt && !Number.isNaN(Date.parse(values.dueAt))
          ? new Date(values.dueAt).toISOString()
          : undefined;

      return crmApi.createActivity({
        type: values.type,
        subject: values.subject,
        body: values.body || undefined,
        partyId: values.partyId || undefined,
        dealId: values.dealId || undefined,
        dueAt: values.type === "COMMUNICATION" ? undefined : dueAtIso,
        channelKey: values.type === "COMMUNICATION" ? values.channelKey : undefined,
        direction: values.type === "COMMUNICATION" ? values.direction : undefined,
        communicationStatus:
          values.type === "COMMUNICATION" ? values.communicationStatus : undefined,
        activityDate: values.type === "COMMUNICATION" ? dueAtIso : undefined,
      });
    },
    onSuccess: () => {
      toast.success(t("crm.activity.created"));
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      navigate("/crm/activities");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t("crm.activity.createFailed")));
    },
  });

  const parseMutation = useMutation({
    mutationFn: async (description: string) =>
      crmApi.parseActivityAi({
        description,
        workspaceLanguage: i18n.language,
      }),
    onSuccess: (result) => {
      setParseResult(result);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to parse activity description"));
    },
  });

  const extractMutation = useMutation({
    mutationFn: async (notes: string) =>
      crmApi.extractActivityAi({
        notes,
        workspaceLanguage: i18n.language,
      }),
    onSuccess: (result) => {
      setExtractResult(result);
      const initialSelection = result.followUpToolCards.reduce<Record<string, boolean>>(
        (acc, toolCard) => {
          const key = toolCard.idempotencyKey ?? toolCard.payload.subject;
          acc[key] = true;
          return acc;
        },
        {}
      );
      setSelectedFollowUps(initialSelection);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to extract activity outcomes"));
    },
  });

  const createFollowUpsMutation = useMutation({
    mutationFn: async (toolCards: CreateActivityToolCard[]) => {
      for (const toolCard of toolCards) {
        await crmApi.createActivity(toolCard.payload, {
          idempotencyKey: toolCard.idempotencyKey,
        });
      }
    },
    onSuccess: () => {
      toast.success("Follow-up tasks created");
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      setConfirmCreateFollowUpsOpen(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create follow-up tasks"));
    },
  });

  const subjectValue = form.watch("subject");
  const notesValue = form.watch("body") ?? "";
  const dueAtRaw = form.watch("dueAt");
  const selectedType = form.watch("type");
  const partyIdValue = form.watch("partyId");
  const dealIdValue = form.watch("dealId");
  const parsedDueAt = dueAtRaw ? new Date(dueAtRaw) : undefined;
  const dueAt = parsedDueAt && !Number.isNaN(parsedDueAt.getTime()) ? parsedDueAt : undefined;
  const dueTime = dueAt ? dueAt.toISOString().slice(11, 16) : "";

  const { data: selectableDealsData, isLoading: selectableDealsLoading } = useQuery({
    queryKey: ["crm", "activity", "selectable-deals"],
    queryFn: () => crmApi.listDeals({ pageSize: 100 }),
    staleTime: 60_000,
  });
  const { data: selectableContactsData, isLoading: selectableContactsLoading } = useQuery({
    queryKey: ["crm", "activity", "selectable-contacts"],
    queryFn: () => customersApi.listCustomers({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const linkSuggestionQuery = `${subjectValue} ${notesValue}`.trim();
  const { data: dealsSuggestionData } = useQuery({
    queryKey: ["crm", "activity", "deal-suggestions", linkSuggestionQuery],
    queryFn: () => crmApi.listDeals({ pageSize: 25 }),
    enabled: aiEnabled && linkSuggestionQuery.length >= 3,
    staleTime: 60_000,
  });
  const { data: contactsSuggestionData } = useQuery({
    queryKey: ["crm", "activity", "contact-suggestions", linkSuggestionQuery],
    queryFn: () => customersApi.searchCustomers({ q: linkSuggestionQuery, pageSize: 5 }),
    enabled: aiEnabled && linkSuggestionQuery.length >= 3,
    staleTime: 60_000,
  });

  const dealSuggestions = useMemo(() => {
    const query = linkSuggestionQuery.toLowerCase();
    const deals = dealsSuggestionData?.deals ?? [];
    return deals
      .map((deal) => {
        const title = deal.title.toLowerCase();
        const score =
          title.includes(query) || query.includes(title)
            ? 0.9
            : query
                .split(/\s+/)
                .filter((token) => token.length >= 3)
                .reduce((acc, token) => (title.includes(token) ? acc + 0.15 : acc), 0);
        return {
          id: deal.id,
          label: deal.title,
          score,
        };
      })
      .filter((item) => item.score >= 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [dealsSuggestionData?.deals, linkSuggestionQuery]);

  const contactSuggestions = useMemo(
    () =>
      (contactsSuggestionData?.customers ?? []).map((customer) => ({
        id: customer.id,
        label: customer.displayName,
      })),
    [contactsSuggestionData?.customers]
  );

  const selectableDealOptions = useMemo(
    () =>
      (selectableDealsData?.deals ?? []).map((deal) => ({
        id: deal.id,
        label: deal.title,
        partyId: deal.partyId,
      })),
    [selectableDealsData?.deals]
  );

  const selectableContactOptions = useMemo(
    () =>
      (selectableContactsData?.customers ?? []).map((customer) => ({
        id: customer.id,
        label: customer.displayName,
        phone: customer.phone,
      })),
    [selectableContactsData?.customers]
  );

  const selectedDealOption = useMemo(
    () => selectableDealOptions.find((deal) => deal.id === dealIdValue),
    [selectableDealOptions, dealIdValue]
  );
  const selectedContactOption = useMemo(
    () => selectableContactOptions.find((contact) => contact.id === partyIdValue),
    [selectableContactOptions, partyIdValue]
  );

  const { data: selectedDealContact } = useQuery({
    queryKey: ["crm", "activity", "selected-deal-contact", selectedDealOption?.partyId],
    queryFn: () => customersApi.getCustomer(selectedDealOption?.partyId as string),
    enabled: Boolean(selectedDealOption?.partyId),
    staleTime: 60_000,
  });

  const whatsappPhone = useMemo(
    () => normalizeWhatsAppPhone(selectedDealContact?.phone),
    [selectedDealContact?.phone]
  );
  const whatsappMessage = useMemo(() => {
    const displayName = selectedDealContact?.displayName?.trim();
    return displayName ? `Hello ${displayName}` : "Hello";
  }, [selectedDealContact?.displayName]);
  const whatsappHref = useMemo(
    () =>
      whatsappPhone
        ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`
        : null,
    [whatsappMessage, whatsappPhone]
  );

  const qualityNudges = useMemo(() => {
    const nudges: string[] = [];
    if (!dueAtRaw) {
      nudges.push("Due date is missing.");
    }
    if (!partyIdValue && !dealIdValue) {
      nudges.push("No linked deal or contact.");
    }
    if (!subjectValue.trim()) {
      nudges.push("Subject is empty. Use Generate subject.");
    }
    return nudges;
  }, [dueAtRaw, partyIdValue, dealIdValue, subjectValue]);

  const selectedFollowUpCards = useMemo(() => {
    const cards = extractResult?.followUpToolCards ?? [];
    return cards.filter((toolCard) => {
      const key = toolCard.idempotencyKey ?? toolCard.payload.subject;
      return Boolean(selectedFollowUps[key]);
    });
  }, [extractResult?.followUpToolCards, selectedFollowUps]);

  const updateDueAt = (date: Date | undefined, time: string | undefined) => {
    if (!date) {
      form.setValue("dueAt", "");
      return;
    }
    const [hoursStr, minutesStr] = (time ?? "").split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const next = new Date(date);
    if (!Number.isNaN(hours)) {
      next.setHours(hours);
    }
    if (!Number.isNaN(minutes)) {
      next.setMinutes(minutes);
    }
    next.setSeconds(0, 0);
    form.setValue("dueAt", next.toISOString(), { shouldDirty: true });
  };

  const generateSubject = () => {
    const firstLine = describeText
      .trim()
      .split(/\n|\./)
      .find((line) => line.trim().length > 0);
    const notesLine = notesValue
      .trim()
      .split(/\n|\./)
      .find((line) => line.trim().length > 0);
    const generated =
      firstLine?.trim() ||
      notesLine?.trim() ||
      `${selectedType === "COMMUNICATION" ? "Send message" : "Follow up"} for customer`;
    form.setValue("subject", generated.slice(0, 120), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const applyParsedFields = () => {
    if (!parseResult) {
      return;
    }
    const parsed = parseResult.result;
    if (
      parsed.activityType &&
      (parsed.activityType === "NOTE" ||
        parsed.activityType === "TASK" ||
        parsed.activityType === "CALL" ||
        parsed.activityType === "MEETING" ||
        parsed.activityType === "COMMUNICATION")
    ) {
      form.setValue("type", parsed.activityType, { shouldDirty: true });
    }
    if (parsed.subject) {
      form.setValue("subject", parsed.subject, { shouldDirty: true, shouldValidate: true });
    }
    if (parsed.notesTemplate) {
      form.setValue("body", parsed.notesTemplate, { shouldDirty: true });
    }
    if (parsed.dueAt) {
      form.setValue("dueAt", parsed.dueAt, { shouldDirty: true });
    }
    if (parsed.suggestedDeals[0]) {
      form.setValue("dealId", parsed.suggestedDeals[0].id, { shouldDirty: true });
    }
    if (parsed.suggestedContacts[0]) {
      form.setValue("partyId", parsed.suggestedContacts[0].id, { shouldDirty: true });
    }
    toast.success("Parsed fields applied");
  };

  const onSubmit = (values: ActivityFormValues) => {
    createMutation.mutate(values);
  };

  const offline = !isOnline;
  const canUseAi = aiEnabled && !offline;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/activities")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{t("crm.activity.newTitle")}</h1>
            <p className="text-muted-foreground">{t("crm.activity.newSubtitle")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/crm/activities")}
            disabled={createMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
            data-testid="submit-activity-button"
          >
            {createMutation.isPending ? t("common.saving") : t("crm.activity.create")}
          </Button>
        </div>
      </div>

      {aiEnabled ? (
        <Card data-testid="crm-activity-describe-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Describe it
            </CardTitle>
            <CardDescription>
              Example: Call John tomorrow 10:00 about pricing, then send a follow-up email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={describeText}
                onChange={(event) => setDescribeText(event.target.value)}
                placeholder="Describe the activity in plain language"
                data-testid="crm-activity-describe-input"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!describeText.trim()) {
                    toast.error("Describe the activity first.");
                    return;
                  }
                  parseMutation.mutate(describeText.trim());
                }}
                disabled={!canUseAi || parseMutation.isPending}
                data-testid="crm-activity-describe-parse"
              >
                {parseMutation.isPending ? "Parsing..." : "Parse"}
              </Button>
              <Button
                variant="secondary"
                onClick={applyParsedFields}
                disabled={!parseResult}
                data-testid="crm-activity-describe-apply"
              >
                Apply
              </Button>
            </div>

            {offline ? (
              <p className="text-xs text-muted-foreground">AI requires connection.</p>
            ) : null}

            {parseResult ? (
              <div className="rounded-md border p-3 space-y-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  {parseResult.result.activityType ? (
                    <Badge variant="secondary">Type: {parseResult.result.activityType}</Badge>
                  ) : null}
                  <Badge variant="outline">
                    Confidence: {Math.round(parseResult.result.confidence * 100)}%
                  </Badge>
                </div>
                {parseResult.result.subject ? <p>Subject: {parseResult.result.subject}</p> : null}
                {parseResult.result.dueAt ? (
                  <p>Due: {new Date(parseResult.result.dueAt).toLocaleString(i18n.language)}</p>
                ) : null}
                {parseResult.result.suggestedDeals.length ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Suggested deals</p>
                    <div className="flex flex-wrap gap-2">
                      {parseResult.result.suggestedDeals.map((item) => (
                        <Button
                          key={item.id}
                          size="sm"
                          variant="outline"
                          onClick={() => form.setValue("dealId", item.id, { shouldDirty: true })}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {parseResult.result.suggestedContacts.length ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Suggested contacts</p>
                    <div className="flex flex-wrap gap-2">
                      {parseResult.result.suggestedContacts.map((item) => (
                        <Button
                          key={item.id}
                          size="sm"
                          variant="outline"
                          onClick={() => form.setValue("partyId", item.id, { shouldDirty: true })}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          data-testid="activity-form"
        >
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel>{t("crm.activity.subject")}</FormLabel>
                        <Button type="button" variant="outline" size="sm" onClick={generateSubject}>
                          Generate subject
                        </Button>
                      </div>
                      <FormControl>
                        <Input
                          placeholder={t("crm.activity.subjectPlaceholder")}
                          {...field}
                          data-testid="crm-new-activity-subject"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.activity.type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="crm-new-activity-type">
                            <SelectValue placeholder={t("crm.activity.selectType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {t(`crm.activity.types.${type.toLowerCase()}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueAt"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t("crm.activity.dueAt")}</FormLabel>
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "justify-start text-left font-normal",
                                  !dueAt && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dueAt ? (
                                  dueAt.toLocaleDateString(i18n.language, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })
                                ) : (
                                  <span>{t("crm.activity.selectDate")}</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dueAt}
                              onSelect={(date) => updateDueAt(date ?? undefined, dueTime)}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={dueTime}
                              onChange={(event) =>
                                updateDueAt(dueAt ?? new Date(), event.target.value)
                              }
                              data-testid="crm-new-activity-time"
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormDescription>{t("crm.activity.reminderHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === "COMMUNICATION" && (
                  <>
                    <FormField
                      control={form.control}
                      name="channelKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("crm.activity.channel")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="crm-new-activity-channel">
                                <SelectValue placeholder={t("crm.activity.channel")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {channels.map((channel) => (
                                <SelectItem key={channel.key} value={channel.key}>
                                  {channel.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="direction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("crm.activity.direction")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="crm-new-activity-direction">
                                <SelectValue placeholder={t("crm.activity.direction")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="OUTBOUND">
                                {t("crm.activity.directionOutbound")}
                              </SelectItem>
                              <SelectItem value="INBOUND">
                                {t("crm.activity.directionInbound")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="communicationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("crm.activity.communicationStatus")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="crm-new-activity-communication-status">
                                <SelectValue placeholder={t("crm.activity.communicationStatus")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LOGGED">
                                {t("crm.activity.communicationLogged")}
                              </SelectItem>
                              <SelectItem value="DRAFT">
                                {t("crm.activity.communicationDraft")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="dealId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.activity.dealIdOptional")}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <input
                            type="hidden"
                            name={field.name}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            data-testid="crm-new-activity-deal-id"
                          />
                          <Popover open={dealComboboxOpen} onOpenChange={setDealComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                type="button"
                                role="combobox"
                                aria-expanded={dealComboboxOpen}
                                data-testid="crm-new-activity-deal-picker"
                                className="w-full justify-between"
                              >
                                <span className={cn(!field.value && "text-muted-foreground")}>
                                  {selectedDealOption?.label ||
                                    field.value ||
                                    t("crm.activity.dealIdPlaceholder")}
                                </span>
                                <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                              <Command>
                                <CommandInput placeholder="Search deals..." />
                                <CommandList>
                                  <CommandEmpty>
                                    {selectableDealsLoading ? "Loading deals..." : "No deals found"}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {field.value ? (
                                      <CommandItem
                                        value="clear-selected-deal"
                                        onSelect={() => {
                                          field.onChange("");
                                          setDealComboboxOpen(false);
                                        }}
                                      >
                                        Clear selection
                                      </CommandItem>
                                    ) : null}
                                    {selectableDealOptions.map((deal) => (
                                      <CommandItem
                                        key={deal.id}
                                        value={`${deal.label} ${deal.id}`}
                                        data-testid={`crm-new-activity-deal-option-${deal.id}`}
                                        onSelect={() => {
                                          field.onChange(deal.id);
                                          setDealComboboxOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === deal.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex min-w-0 flex-col">
                                          <span className="truncate">{deal.label}</span>
                                          <span className="text-xs text-muted-foreground truncate">
                                            {deal.id}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </FormControl>
                      <FormDescription>{t("crm.activity.linkRequiredHint")}</FormDescription>
                      {whatsappHref ? (
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-fit"
                          data-testid="crm-new-activity-whatsapp-link"
                        >
                          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Chat on WhatsApp
                          </a>
                        </Button>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.activity.partyIdOptional")}</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <input
                            type="hidden"
                            name={field.name}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            data-testid="crm-new-activity-party-id"
                          />
                          <Popover open={contactComboboxOpen} onOpenChange={setContactComboboxOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                type="button"
                                role="combobox"
                                aria-expanded={contactComboboxOpen}
                                data-testid="crm-new-activity-party-picker"
                                className="w-full justify-between"
                              >
                                <span className={cn(!field.value && "text-muted-foreground")}>
                                  {selectedContactOption?.label ||
                                    field.value ||
                                    t("crm.activity.partyIdPlaceholder")}
                                </span>
                                <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                              <Command>
                                <CommandInput placeholder="Search contacts..." />
                                <CommandList>
                                  <CommandEmpty>
                                    {selectableContactsLoading
                                      ? "Loading contacts..."
                                      : "No contacts found"}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {field.value ? (
                                      <CommandItem
                                        value="clear-selected-contact"
                                        onSelect={() => {
                                          field.onChange("");
                                          setContactComboboxOpen(false);
                                        }}
                                      >
                                        Clear selection
                                      </CommandItem>
                                    ) : null}
                                    {selectableContactOptions.map((contact) => (
                                      <CommandItem
                                        key={contact.id}
                                        value={`${contact.label} ${contact.id}`}
                                        data-testid={`crm-new-activity-party-option-${contact.id}`}
                                        onSelect={() => {
                                          field.onChange(contact.id);
                                          setContactComboboxOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === contact.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex min-w-0 flex-col">
                                          <span className="truncate">{contact.label}</span>
                                          <span className="text-xs text-muted-foreground truncate">
                                            {contact.id}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </FormControl>
                      <FormDescription>{t("crm.activity.linkRequiredHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {aiEnabled && (dealSuggestions.length || contactSuggestions.length) ? (
                  <div className="md:col-span-2 space-y-2 rounded-md border p-3">
                    <p className="text-sm font-medium">Smart linking suggestions</p>
                    {dealSuggestions.length ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Deals</p>
                        <div className="flex flex-wrap gap-2">
                          {dealSuggestions.map((dealSuggestion) => (
                            <Button
                              key={dealSuggestion.id}
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() =>
                                form.setValue("dealId", dealSuggestion.id, { shouldDirty: true })
                              }
                            >
                              {dealSuggestion.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {contactSuggestions.length ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Contacts</p>
                        <div className="flex flex-wrap gap-2">
                          {contactSuggestions.map((contactSuggestion) => (
                            <Button
                              key={contactSuggestion.id}
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() =>
                                form.setValue("partyId", contactSuggestion.id, {
                                  shouldDirty: true,
                                })
                              }
                            >
                              {contactSuggestion.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>{t("common.notes")}</FormLabel>
                      {aiEnabled ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => extractMutation.mutate(notesValue)}
                            disabled={!canUseAi || !notesValue.trim() || extractMutation.isPending}
                          >
                            Summarize
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => extractMutation.mutate(notesValue)}
                            disabled={!canUseAi || !notesValue.trim() || extractMutation.isPending}
                          >
                            Extract action items
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (!extractResult?.followUpToolCards.length) {
                                extractMutation.mutate(notesValue);
                                return;
                              }
                              setConfirmCreateFollowUpsOpen(true);
                            }}
                            disabled={
                              !canUseAi || !notesValue.trim() || createFollowUpsMutation.isPending
                            }
                          >
                            Create follow-ups
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={t("crm.activity.notesPlaceholder")}
                        {...field}
                        data-testid="crm-new-activity-notes"
                      />
                    </FormControl>
                    {aiEnabled && offline ? (
                      <p className="text-xs text-muted-foreground">AI requires connection.</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {extractResult ? (
                <div
                  className="space-y-3 rounded-md border p-3"
                  data-testid="crm-activity-ai-extract"
                >
                  <p className="text-sm font-medium">AI Notes Summary</p>
                  <p className="text-sm">{extractResult.result.summary}</p>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {Math.round(extractResult.result.confidence * 100)}%
                  </p>
                  {extractResult.result.actionItems.length ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Action items</p>
                      {extractResult.followUpToolCards.map((toolCard) => {
                        const key = toolCard.idempotencyKey ?? toolCard.payload.subject;
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-3 rounded border px-3 py-2"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{toolCard.payload.subject}</p>
                              <p className="text-xs text-muted-foreground">{toolCard.title}</p>
                            </div>
                            <Checkbox
                              checked={Boolean(selectedFollowUps[key])}
                              onCheckedChange={(checked) =>
                                setSelectedFollowUps((prev) => ({
                                  ...prev,
                                  [key]: checked === true,
                                }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("crm.activity.tipTitle")}</CardTitle>
              <CardDescription>{t("crm.activity.tipSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>{t("crm.activity.tipOne")}</div>
              <div>{t("crm.activity.tipTwo")}</div>
              <div>{t("crm.activity.tipThree")}</div>
              <Alert>
                <AlertTitle>Quality checks (non-blocking)</AlertTitle>
                <AlertDescription className="space-y-1">
                  {qualityNudges.map((nudge) => (
                    <p key={nudge}>{nudge}</p>
                  ))}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </form>
      </Form>

      <AlertDialog open={confirmCreateFollowUpsOpen} onOpenChange={setConfirmCreateFollowUpsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create follow-up tasks</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedFollowUpCards.length} selected follow-up task(s) will be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void createFollowUpsMutation.mutateAsync(selectedFollowUpCards);
              }}
            >
              Create selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
