import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { Calendar as CalendarIcon, Clock3, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { format } from "date-fns";
import { useAddDealActivity } from "../hooks/useDeal";

const ACTIVITY_TYPES = ["NOTE", "TASK", "CALL", "MEETING", "EMAIL_DRAFT"] as const;

const activitySchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().optional(),
  dueDate: z.date().optional(),
  dueTime: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface ActivityComposerProps {
  dealId: string;
  partyId?: string | null;
}

export const ActivityComposer: React.FC<ActivityComposerProps> = ({ dealId, partyId }) => {
  const addActivity = useAddDealActivity();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: "NOTE",
      subject: "",
      body: "",
      dueDate: undefined,
      dueTime: "",
    },
  });

  const dueDate = form.watch("dueDate");

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
        dueAt: dateWithTime?.toISOString(),
      },
    });
    form.reset({ type: values.type, subject: "", body: "", dueDate: undefined, dueTime: "" });
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Add activity</p>
            <p className="text-sm text-muted-foreground">Log a note, task, call, or meeting.</p>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={addActivity.isPending}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <Form {...form}>
          <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                    <FormLabel>Due date</FormLabel>
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
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
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
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        <Input type="time" {...field} disabled={!dueDate} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Follow up with client" {...field} />
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="What was discussed? Next steps?" {...field} />
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
