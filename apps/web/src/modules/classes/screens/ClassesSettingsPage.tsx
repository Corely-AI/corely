import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Label,
} from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { classesQueryKeys } from "../queries/classes.queryKeys";
import type { ClassBillingBasis, ClassBillingMonthStrategy } from "@corely/contracts";

const STRATEGY_OPTIONS: Array<{
  value: ClassBillingMonthStrategy;
  label: string;
  description: string;
}> = [
  {
    value: "PREPAID_CURRENT_MONTH",
    label: "Invoice for current month (prepaid)",
    description: "Invoices are generated at the start of the month for scheduled sessions.",
  },
  {
    value: "ARREARS_PREVIOUS_MONTH",
    label: "Invoice for previous month (arrears)",
    description: "Invoices are generated at the start of the month for attended sessions.",
  },
];

const BASIS_OPTIONS: Array<{
  value: ClassBillingBasis;
  label: string;
  description: string;
}> = [
  {
    value: "SCHEDULED_SESSIONS",
    label: "Scheduled sessions",
    description: "Counts planned/done sessions in the billing month.",
  },
  {
    value: "ATTENDED_SESSIONS",
    label: "Attended sessions",
    description: "Counts billable attendance on done sessions.",
  },
];

export default function ClassesSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: classesQueryKeys.settings.detail("billing"),
    queryFn: () => classesApi.getSettings(),
  });

  const [billingMonthStrategy, setBillingMonthStrategy] =
    useState<ClassBillingMonthStrategy>("PREPAID_CURRENT_MONTH");
  const [billingBasis, setBillingBasis] = useState<ClassBillingBasis>("SCHEDULED_SESSIONS");

  useEffect(() => {
    if (!data?.settings) {
      return;
    }
    setBillingMonthStrategy(data.settings.billingMonthStrategy);
    setBillingBasis(data.settings.billingBasis);
  }, [data]);

  const selectedStrategy = useMemo(
    () => STRATEGY_OPTIONS.find((option) => option.value === billingMonthStrategy),
    [billingMonthStrategy]
  );
  const selectedBasis = useMemo(
    () => BASIS_OPTIONS.find((option) => option.value === billingBasis),
    [billingBasis]
  );

  const updateMutation = useMutation({
    mutationFn: () =>
      classesApi.updateSettings({
        billingMonthStrategy,
        billingBasis,
      }),
    onSuccess: () => {
      toast.success("Classes settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update classes settings");
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-h1 text-foreground">Classes Settings</h1>
        <p className="text-muted-foreground">
          Configure how class invoices are generated for this workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Billing month strategy</Label>
            <Select
              value={billingMonthStrategy}
              onValueChange={(value) => {
                const next = value as ClassBillingMonthStrategy;
                setBillingMonthStrategy(next);
                setBillingBasis(
                  next === "PREPAID_CURRENT_MONTH" ? "SCHEDULED_SESSIONS" : "ATTENDED_SESSIONS"
                );
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select billing strategy" />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStrategy && (
              <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Billing basis</Label>
            <Select
              value={billingBasis}
              onValueChange={(value) => setBillingBasis(value as ClassBillingBasis)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select billing basis" />
              </SelectTrigger>
              <SelectContent>
                {BASIS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBasis && (
              <p className="text-sm text-muted-foreground">{selectedBasis.description}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              Save settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
