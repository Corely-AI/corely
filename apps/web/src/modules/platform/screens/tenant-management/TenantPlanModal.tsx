import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@corely/ui";
import { type TenantDto, type UpdateTenantInput } from "@corely/contracts";

const planSettingsSchema = z.object({
  plan: z.enum(["free", "starter", "pro", "multi_location"]).nullable().optional(),
  planStatus: z.enum(["active", "inactive", "trial"]).nullable().optional(),
  billingMethod: z.enum(["stripe", "bank_transfer", "cash", "manual"]).nullable().optional(),
  billingNote: z.string().nullable().optional(),
});

type PlanSettingsFormValues = z.infer<typeof planSettingsSchema>;

export interface TenantPlanModalProps {
  tenant: TenantDto | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tenantId: string, input: UpdateTenantInput) => void;
  isSaving: boolean;
}

export function TenantPlanModal({
  tenant,
  isOpen,
  onOpenChange,
  onSave,
  isSaving,
}: TenantPlanModalProps) {
  const uiCopy = useUiCopy("ui.platform-tenant-management-tenantplanmodal");
  const { t } = useTranslation();

  const form = useForm<PlanSettingsFormValues>({
    resolver: zodResolver(planSettingsSchema),
    defaultValues: {
      plan: tenant?.plan ?? null,
      planStatus: tenant?.planStatus ?? null,
      billingMethod: tenant?.billingMethod ?? null,
      billingNote: tenant?.billingNote ?? "",
    },
  });

  // Reset form when tenant changes
  React.useEffect(() => {
    if (tenant) {
      form.reset({
        plan: tenant.plan ?? null,
        planStatus: tenant.planStatus ?? null,
        billingMethod: tenant.billingMethod ?? null,
        billingNote: tenant.billingNote ?? "",
      });
    }
  }, [tenant, form]);

  const onSubmit = (data: PlanSettingsFormValues) => {
    if (!tenant) {
      return;
    }
    onSave(tenant.id, {
      ...data,
      plan: data.plan || null,
      planStatus: data.planStatus || null,
      billingMethod: data.billingMethod || null,
      billingNote: data.billingNote || null,
    });
  };

  if (!tenant) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="tenant-plan-modal">
        <DialogHeader>
          <DialogTitle>{uiCopy("manage-subscription-plan")}</DialogTitle>
          <DialogDescription>
            {uiCopy("update-the-active-plan") + " "}
            {tenant.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{uiCopy("plan")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="plan-select-trigger">
                        <SelectValue placeholder={uiCopy("select-a-plan")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free" data-testid="plan-option-free">
                        {uiCopy("free")}
                      </SelectItem>
                      <SelectItem value="starter" data-testid="plan-option-starter">
                        {uiCopy("starter")}
                      </SelectItem>
                      <SelectItem value="pro" data-testid="plan-option-pro">
                        {uiCopy("pro")}
                      </SelectItem>
                      <SelectItem value="multi_location" data-testid="plan-option-multi_location">
                        {uiCopy("multi-location")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="planStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{uiCopy("plan-status")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="plan-status-select-trigger">
                        <SelectValue placeholder={uiCopy("select-plan-status")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active" data-testid="plan-status-option-active">
                        {uiCopy("active")}
                      </SelectItem>
                      <SelectItem value="trial" data-testid="plan-status-option-trial">
                        {uiCopy("trial")}
                      </SelectItem>
                      <SelectItem value="inactive" data-testid="plan-status-option-inactive">
                        {uiCopy("inactive")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{uiCopy("billing-method")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="billing-method-select-trigger">
                        <SelectValue placeholder={uiCopy("select-billing-method")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="stripe" data-testid="billing-method-option-stripe">
                        Stripe
                      </SelectItem>
                      <SelectItem
                        value="bank_transfer"
                        data-testid="billing-method-option-bank_transfer"
                      >
                        {uiCopy("bank-transfer")}
                      </SelectItem>
                      <SelectItem value="cash" data-testid="billing-method-option-cash">
                        {uiCopy("cash")}
                      </SelectItem>
                      <SelectItem value="manual" data-testid="billing-method-option-manual">
                        {uiCopy("manual-other")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billingNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{uiCopy("billing-note-reference-bank")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={uiCopy("e-g-paid-in")}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ""}
                      data-testid="billing-note-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} data-testid="save-plan-button">
                {isSaving ? t("common.saving") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
