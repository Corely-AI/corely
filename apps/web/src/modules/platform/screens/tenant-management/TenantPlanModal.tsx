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
    if (!tenant) {return;}
    onSave(tenant.id, {
      ...data,
      plan: data.plan || null,
      planStatus: data.planStatus || null,
      billingMethod: data.billingMethod || null,
      billingNote: data.billingNote || null,
    });
  };

  if (!tenant) {return null;}

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="tenant-plan-modal">
        <DialogHeader>
          <DialogTitle>Manage Subscription Plan</DialogTitle>
          <DialogDescription>
            Update the active plan and billing details for {tenant.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="plan-select-trigger">
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="free" data-testid="plan-option-free">
                        Free
                      </SelectItem>
                      <SelectItem value="starter" data-testid="plan-option-starter">
                        Starter
                      </SelectItem>
                      <SelectItem value="pro" data-testid="plan-option-pro">
                        Pro
                      </SelectItem>
                      <SelectItem value="multi_location" data-testid="plan-option-multi_location">
                        Multi Location
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
                  <FormLabel>Plan Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="plan-status-select-trigger">
                        <SelectValue placeholder="Select plan status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active" data-testid="plan-status-option-active">
                        Active
                      </SelectItem>
                      <SelectItem value="trial" data-testid="plan-status-option-trial">
                        Trial
                      </SelectItem>
                      <SelectItem value="inactive" data-testid="plan-status-option-inactive">
                        Inactive
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
                  <FormLabel>Billing Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                    value={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="billing-method-select-trigger">
                        <SelectValue placeholder="Select billing method" />
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
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="cash" data-testid="billing-method-option-cash">
                        Cash
                      </SelectItem>
                      <SelectItem value="manual" data-testid="billing-method-option-manual">
                        Manual/Other
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
                  <FormLabel>Billing Note (Reference, Bank details, etc.)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Paid in cash, reference #12345"
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
