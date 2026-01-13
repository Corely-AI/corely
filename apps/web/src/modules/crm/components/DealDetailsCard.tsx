import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import type { DealDto } from "@corely/contracts";
import { format } from "date-fns";
import { cn } from "@/shared/lib/utils";

const detailsSchema = z.object({
  notes: z.string().optional(),
  probability: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "Probability must be between 0 and 100"
    ),
  expectedCloseDate: z.string().optional(),
});

type DetailFormValues = z.infer<typeof detailsSchema>;

interface DealDetailsCardProps {
  deal: DealDto;
  onSave: (patch: { notes?: string; probability?: number; expectedCloseDate?: string }) => void;
  isSaving?: boolean;
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export const DealDetailsCard: React.FC<DealDetailsCardProps> = ({
  deal,
  onSave,
  isSaving,
  editing,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(editing ?? false);

  const form = useForm<DetailFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      notes: deal.notes ?? "",
      probability: deal.probability?.toString() ?? "",
      expectedCloseDate: deal.expectedCloseDate ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      notes: deal.notes ?? "",
      probability: deal.probability?.toString() ?? "",
      expectedCloseDate: deal.expectedCloseDate ?? "",
    });
  }, [deal, form]);

  useEffect(() => {
    if (editing !== undefined) {
      setIsEditing(editing);
    }
  }, [editing]);

  const onSubmit = (values: DetailFormValues) => {
    onSave({
      notes: values.notes || undefined,
      probability:
        values.probability && !Number.isNaN(Number(values.probability))
          ? Number(values.probability)
          : undefined,
      expectedCloseDate: values.expectedCloseDate || undefined,
    });
    if (onEditingChange) {
      onEditingChange(false);
    } else {
      setIsEditing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Details</CardTitle>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (onEditingChange ? onEditingChange(false) : setIsEditing(false))}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving}
                data-testid="save-deal-details"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (onEditingChange ? onEditingChange(true) : setIsEditing(true))}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Add deal context or next steps" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expectedCloseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected close date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Notes</p>
              <p className={cn("mt-1", !deal.notes && "text-muted-foreground")}>
                {deal.notes || "No notes yet"}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Probability</p>
                <p>{deal.probability !== null ? `${deal.probability}%` : "Not set"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expected close</p>
                <p>
                  {deal.expectedCloseDate
                    ? format(new Date(deal.expectedCloseDate), "PPP")
                    : "Not set"}
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{format(new Date(deal.createdAt), "PPp")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Updated</p>
                <p>{format(new Date(deal.updatedAt), "PPp")}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
