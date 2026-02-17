import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@corely/ui";
import { Input } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@corely/ui";
import { Calendar } from "@corely/ui";
import { Calendar as CalendarIcon, Clock3, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAddDealActivity } from "../hooks/useDeal";
import { useTranslation } from "react-i18next";
import { useCrmChannels } from "../hooks/useChannels";

const ACTIVITY_TYPES = ["NOTE", "TASK", "CALL", "MEETING", "COMMUNICATION"] as const;
const COMMUNICATION_STATUSES = ["LOGGED", "DRAFT"] as const;

interface ActivityComposerProps {
  dealId: string;
  partyId?: string | null;
}

export const ActivityComposer: React.FC<ActivityComposerProps> = ({ dealId, partyId }) => {
  const { t, i18n } = useTranslation();
  const addActivity = useAddDealActivity();
  const { data: channels = [] } = useCrmChannels();
  const activitySchema = useMemo(
    () =>
      z.object({
        type: z.enum(ACTIVITY_TYPES),
        subject: z.string().min(1, t("crm.activity.subjectRequired")),
        body: z.string().optional(),
        dueDate: z.date().optional(),
        dueTime: z.string().optional(),
        channelKey: z.string().optional(),
        direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
        communicationStatus: z.enum(COMMUNICATION_STATUSES).optional(),
        outcome: z.string().optional(),
        durationMinutes: z.coerce.number().optional(),
        location: z.string().optional(),
      }),
    [t]
  );
  type ActivityFormValues = z.infer<typeof activitySchema>;

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: "NOTE",
      subject: "",
      body: "",
      dueDate: undefined,
      dueTime: "",
      channelKey: "email",
      direction: "OUTBOUND",
      communicationStatus: "LOGGED",
      outcome: "",
      location: "",
    },
  });

  const dueDate = form.watch("dueDate");
  const selectedType = form.watch("type");

  const handleSubmit = (values: ActivityFormValues) => {
    const dateWithTime = values.dueDate ? new Date(values.dueDate) : undefined;
    if (dateWithTime && values.dueTime) {
      const [h, m] = values.dueTime.split(":");
      const hours = Number(h);
      const minutes = Number(m);
      if (!Number.isNaN(hours)) {
        dateWithTime.setHours(hours);
      }
      if (!Number.isNaN(minutes)) {
        dateWithTime.setMinutes(minutes);
      }
      dateWithTime.setSeconds(0, 0);
    }

    addActivity.mutate({
      dealId,
      payload: {
        type: values.type,
        subject: values.subject,
        body: values.body || undefined,
        partyId: partyId || undefined,
        channelKey: values.type === "COMMUNICATION" ? values.channelKey || undefined : undefined,
        direction: values.type === "COMMUNICATION" ? values.direction : undefined,
        communicationStatus:
          values.type === "COMMUNICATION" ? values.communicationStatus : undefined,
        activityDate: values.type === "COMMUNICATION" ? dateWithTime?.toISOString() : undefined,
        dueAt: values.type === "COMMUNICATION" ? undefined : dateWithTime?.toISOString(),
        outcome: values.type === "CALL" ? values.outcome : undefined,
        durationSeconds: values.durationMinutes ? values.durationMinutes * 60 : undefined,
        location: values.type === "MEETING" ? values.location : undefined,
      },
    });
    form.reset({
      type: values.type,
      subject: "",
      body: "",
      dueDate: undefined,
      dueTime: "",
      channelKey: values.channelKey,
      direction: values.direction,
      communicationStatus: values.communicationStatus,
    });
  };

  return (
    <Card className="border-dashed" data-testid="crm-activity-composer">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t("crm.activity.addTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("crm.activity.addSubtitle")}</p>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={addActivity.isPending}
            data-testid="crm-activity-add"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("common.add")}
          </Button>
        </div>

        <Form {...form}>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit(handleSubmit)}
            data-testid="crm-activity-form"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("crm.activity.type")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="crm-activity-type">
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
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("crm.activity.dueDate")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? field.value.toLocaleDateString(i18n.language, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : t("crm.activity.pickDate")}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("crm.activity.time")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="time"
                          {...field}
                          disabled={!dueDate}
                          data-testid="crm-activity-time"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedType === "COMMUNICATION" && (
              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="channelKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.activity.channel")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="crm-activity-channel">
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
                          <SelectTrigger data-testid="crm-activity-direction">
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
                          <SelectTrigger data-testid="crm-activity-communication-status">
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
              </div>
            )}

            {(selectedType === "CALL" || selectedType === "MEETING") && (
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="Example: 15, 30, 60" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType === "CALL" && (
                  <FormField
                    control={form.control}
                    name="outcome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outcome</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="crm-activity-outcome">
                              <SelectValue placeholder="Select outcome" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Connected">Connected</SelectItem>
                            <SelectItem value="Voicemail">Voicemail</SelectItem>
                            <SelectItem value="No Answer">No Answer</SelectItem>
                            <SelectItem value="Busy">Busy</SelectItem>
                            <SelectItem value="Wrong Number">Wrong Number</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedType === "MEETING" && (
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Zoom link or physical location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("crm.activity.subject")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("crm.activity.subjectPlaceholder")}
                      {...field}
                      data-testid="crm-activity-subject"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={t("crm.activity.notesPlaceholder")}
                      {...field}
                      data-testid="crm-activity-body"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
