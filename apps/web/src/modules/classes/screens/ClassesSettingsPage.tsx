import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  RadioGroup,
  RadioGroupItem,
} from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { classesQueryKeys } from "../queries/classes.queryKeys";
import type {
  ClassBillingBasis,
  ClassBillingMonthStrategy,
  AttendanceMode,
} from "@corely/contracts";

export default function ClassesSettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: classesQueryKeys.settings.detail("billing"),
    queryFn: () => classesApi.getSettings(),
  });

  const [billingMonthStrategy, setBillingMonthStrategy] =
    useState<ClassBillingMonthStrategy>("PREPAID_CURRENT_MONTH");
  const [billingBasis, setBillingBasis] = useState<ClassBillingBasis>("SCHEDULED_SESSIONS");
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>("MANUAL");

  const STRATEGY_OPTIONS = useMemo(
    () => [
      {
        value: "PREPAID_CURRENT_MONTH" as const,
        label: t("classes.settings.strategies.prepaid.label"),
        description: t("classes.settings.strategies.prepaid.description"),
      },
      {
        value: "ARREARS_PREVIOUS_MONTH" as const,
        label: t("classes.settings.strategies.arrears.label"),
        description: t("classes.settings.strategies.arrears.description"),
      },
    ],
    [t]
  );

  const BASIS_OPTIONS = useMemo(
    () => [
      {
        value: "SCHEDULED_SESSIONS" as const,
        label: t("classes.settings.bases.scheduled.label"),
        description: t("classes.settings.bases.scheduled.description"),
      },
      {
        value: "ATTENDED_SESSIONS" as const,
        label: t("classes.settings.bases.attended.label"),
        description: t("classes.settings.bases.attended.description"),
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!data?.settings) {
      return;
    }
    setBillingMonthStrategy(data.settings.billingMonthStrategy);
    setBillingBasis(data.settings.billingBasis);
    setAttendanceMode(data.settings.attendanceMode);
  }, [data]);

  const selectedStrategy = useMemo(
    () => STRATEGY_OPTIONS.find((option) => option.value === billingMonthStrategy),
    [billingMonthStrategy, STRATEGY_OPTIONS]
  );
  const selectedBasis = useMemo(
    () => BASIS_OPTIONS.find((option) => option.value === billingBasis),
    [billingBasis, BASIS_OPTIONS]
  );

  const updateMutation = useMutation({
    mutationFn: () =>
      classesApi.updateSettings({
        billingMonthStrategy,
        billingBasis,
        attendanceMode,
      }),
    onSuccess: () => {
      toast.success(t("classes.settings.updated"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("classes.settings.updateFailed"));
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-h1 text-foreground">{t("classes.settings.title")}</h1>
        <p className="text-muted-foreground">{t("classes.settings.description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("classes.settings.attendance.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label>{t("classes.settings.attendance.mode")}</Label>
            <RadioGroup
              value={attendanceMode}
              onValueChange={(val) => setAttendanceMode(val as AttendanceMode)}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="MANUAL" id="mode-manual" className="mt-1" />
                <Label htmlFor="mode-manual" className="font-normal cursor-pointer">
                  <div className="font-medium">{t("classes.settings.attendance.manual.label")}</div>
                  <div className="text-muted-foreground text-sm">
                    {t("classes.settings.attendance.manual.description")}
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="AUTO_FULL" id="mode-auto" className="mt-1" />
                <Label htmlFor="mode-auto" className="font-normal cursor-pointer">
                  <div className="font-medium">
                    {t("classes.settings.attendance.autoFull.label")}
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {t("classes.settings.attendance.autoFull.description")}
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("classes.settings.billingStrategy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("classes.settings.monthStrategy")}</Label>
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
                <SelectValue placeholder={t("classes.settings.placeholderStrategy")} />
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
            <Label>{t("classes.settings.billingBasis")}</Label>
            <Select
              value={billingBasis}
              onValueChange={(value) => setBillingBasis(value as ClassBillingBasis)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("classes.settings.placeholderBasis")} />
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          {t("classes.settings.save")}
        </Button>
      </div>
    </div>
  );
}
