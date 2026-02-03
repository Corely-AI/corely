import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon, Clock3 } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { Button } from "@corely/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
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
import { cn } from "@/shared/lib/utils";
import { crmApi } from "@/lib/crm-api";
import { toast } from "sonner";

const ACTIVITY_TYPES = ["NOTE", "TASK", "CALL", "MEETING", "EMAIL_DRAFT"] as const;

export default function NewActivityPage() {
  const { t, i18n } = useTranslation();
  const activityFormSchema = useMemo(
    () =>
      z
        .object({
          type: z.enum(ACTIVITY_TYPES),
          subject: z.string().min(1, t("crm.activity.subjectRequired")),
          body: z.string().optional(),
          partyId: z.string().optional(),
          dealId: z.string().optional(),
          dueAt: z.string().optional(),
        })
        .refine((value) => Boolean(value.partyId || value.dealId), {
          message: t("crm.activity.linkRequired"),
          path: ["partyId"],
        }),
    [t]
  );
  type ActivityFormValues = z.infer<typeof activityFormSchema>;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: "TASK",
      subject: "",
      body: "",
      partyId: "",
      dealId: "",
      dueAt: "",
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
        dueAt: dueAtIso,
      });
    },
    onSuccess: () => {
      toast.success(t("crm.activity.created"));
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      navigate("/crm/activities");
    },
    onError: (error) => {
      console.error("Error creating activity:", error);
      toast.error(t("crm.activity.createFailed"));
    },
  });

  const onSubmit = (values: ActivityFormValues) => {
    createMutation.mutate(values);
  };

  const dueAtRaw = form.watch("dueAt");
  const parsedDueAt = dueAtRaw ? new Date(dueAtRaw) : undefined;
  const dueAt = parsedDueAt && !Number.isNaN(parsedDueAt.getTime()) ? parsedDueAt : undefined;
  const dueTime = dueAt ? dueAt.toISOString().slice(11, 16) : "";

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
                      <FormLabel>{t("crm.activity.subject")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("crm.activity.subjectPlaceholder")} {...field} />
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
                          <SelectTrigger>
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
                  render={({ field }) => (
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
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormDescription>{t("crm.activity.reminderHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dealId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.activity.dealIdOptional")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("crm.activity.dealIdPlaceholder")} {...field} />
                      </FormControl>
                      <FormDescription>{t("crm.activity.linkRequiredHint")}</FormDescription>
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
                        <Input placeholder={t("crm.activity.partyIdPlaceholder")} {...field} />
                      </FormControl>
                      <FormDescription>{t("crm.activity.linkRequiredHint")}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={t("crm.activity.notesPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("crm.activity.tipTitle")}</CardTitle>
              <CardDescription>{t("crm.activity.tipSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>{t("crm.activity.tipOne")}</div>
              <div>{t("crm.activity.tipTwo")}</div>
              <div>{t("crm.activity.tipThree")}</div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
