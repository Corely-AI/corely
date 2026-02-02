import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import type { DealDto } from "@corely/contracts";
import { cn } from "@/shared/lib/utils";
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation();
  const detailsSchema = useMemo(
    () =>
      z.object({
        notes: z.string().optional(),
        probability: z
          .string()
          .optional()
          .refine(
            (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
            t("crm.deals.probabilityValidation")
          ),
        expectedCloseDate: z.string().optional(),
      }),
    [t]
  );
  type DetailFormValues = z.infer<typeof detailsSchema>;
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
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving}
                data-testid="save-deal-details"
              >
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => (onEditingChange ? onEditingChange(true) : setIsEditing(true))}
            >
              {t("common.edit")}
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
                    <FormLabel>{t("common.notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder={t("crm.deals.notesPlaceholder")} {...field} />
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
                      <FormLabel>{t("crm.deals.probabilityLabel")}</FormLabel>
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
                      <FormLabel>{t("crm.deals.expectedCloseLabel")}</FormLabel>
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
              <p className="text-muted-foreground">{t("common.notes")}</p>
              <p className={cn("mt-1", !deal.notes && "text-muted-foreground")}>
                {deal.notes || t("crm.deals.noNotes")}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">{t("crm.deals.probability")}</p>
                <p>
                  {deal.probability !== null
                    ? t("crm.deals.probabilityValue", { probability: deal.probability })
                    : t("common.notSet")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("crm.deals.expectedCloseTitle")}</p>
                <p>
                  {deal.expectedCloseDate
                    ? new Date(deal.expectedCloseDate).toLocaleDateString(i18n.language, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : t("common.notSet")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">{t("common.created")}</p>
                <p>
                  {new Date(deal.createdAt).toLocaleString(i18n.language, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("common.updated")}</p>
                <p>
                  {new Date(deal.updatedAt).toLocaleString(i18n.language, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
