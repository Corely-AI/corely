import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useMemo, useState } from "react";
import {
  Checkbox,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@corely/ui";
import { toast } from "sonner";
import {
  MONTHS,
  ORDINALS,
  WEEKDAYS,
  buildSchedulePattern,
  formatScheduleSummary,
  getFrequencyUnit,
  getScheduleError,
  parseJsonInput,
  parseSchedulePattern,
  resolveScheduleState,
} from "./class-group-schedule-utils";
import type {
  MonthlyMode,
  ScheduleBuilderState,
  ScheduleEndsType,
  ScheduleFrequency,
  ScheduleMode,
  WeekdayCode,
} from "./class-group-schedule-utils";

export type ScheduleBuilderOutput = {
  enabled: boolean;
  error: string;
  schedulePattern: Record<string, unknown> | null;
};

type ClassGroupScheduleBuilderProps = {
  initialPattern: unknown;
  onChange: (output: ScheduleBuilderOutput) => void;
};

export function ClassGroupScheduleBuilder({
  initialPattern,
  onChange,
}: ClassGroupScheduleBuilderProps) {
  const uiCopy = useUiCopy("ui.classes-class-group-schedule-builder");
  const [scheduleState, setScheduleState] = useState<ScheduleBuilderState>(() =>
    resolveScheduleState(initialPattern)
  );

  useEffect(() => {
    setScheduleState(resolveScheduleState(initialPattern));
  }, [initialPattern]);

  const scheduleError = useMemo(() => getScheduleError(scheduleState), [scheduleState]);
  const scheduleSummary = useMemo(() => formatScheduleSummary(scheduleState), [scheduleState]);

  const schedulePattern = useMemo(() => {
    if (!scheduleState.enabled) {
      return null;
    }
    if (scheduleState.mode === "advanced") {
      if (!scheduleState.advancedJson.trim()) {
        return null;
      }
      try {
        return parseJsonInput(scheduleState.advancedJson) as Record<string, unknown> | null;
      } catch {
        return null;
      }
    }
    return buildSchedulePattern(scheduleState);
  }, [scheduleState]);

  useEffect(() => {
    onChange({ enabled: scheduleState.enabled, error: scheduleError, schedulePattern });
  }, [onChange, scheduleError, schedulePattern, scheduleState.enabled]);

  const updateSchedule = (patch: Partial<ScheduleBuilderState>) => {
    setScheduleState((prev) => ({ ...prev, ...patch }));
  };

  const toggleWeekday = (day: WeekdayCode) => {
    setScheduleState((prev) => {
      const next = prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((item) => item !== day)
        : [...prev.daysOfWeek, day];
      return { ...prev, daysOfWeek: next };
    });
  };

  const handleScheduleModeChange = (mode: ScheduleMode) => {
    if (mode === scheduleState.mode) {
      return;
    }
    if (mode === "advanced") {
      updateSchedule({
        mode,
        advancedJson: JSON.stringify(buildSchedulePattern(scheduleState), null, 2),
      });
      return;
    }
    try {
      const parsed = JSON.parse(scheduleState.advancedJson);
      const parsedState = parseSchedulePattern(parsed);
      if (!parsedState) {
        toast.error(uiCopy("advanced-json-doesn-t"));
        return;
      }
      setScheduleState((prev) => ({
        ...prev,
        ...parsedState,
        mode: "guided",
      }));
    } catch {
      toast.error(uiCopy("advanced-json-is-invalid"));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-4 py-3">
        <div>
          <Label>{uiCopy("recurring-schedule")}</Label>
          <p className="text-sm text-muted-foreground">{uiCopy("optional-capture-a-repeat")}</p>
        </div>
        <Switch
          checked={scheduleState.enabled}
          onCheckedChange={(checked) => updateSchedule({ enabled: Boolean(checked) })}
        />
      </div>

      {scheduleState.enabled ? (
        <div className="space-y-4 rounded-md border border-border/60 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{uiCopy("input-mode")}</Label>
              <Select
                value={scheduleState.mode}
                onValueChange={(value) => handleScheduleModeChange(value as ScheduleMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="guided">{uiCopy("guided-builder")}</SelectItem>
                  <SelectItem value="advanced">{uiCopy("advanced-json")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scheduleState.mode === "guided" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{uiCopy("starts-on")}</Label>
                  <Input
                    type="date"
                    value={scheduleState.startsOn}
                    onChange={(e) => updateSchedule({ startsOn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{uiCopy("time")}</Label>
                  <Input
                    type="time"
                    value={scheduleState.time}
                    onChange={(e) => updateSchedule({ time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{uiCopy("repeats")}</Label>
                  <Select
                    value={scheduleState.frequency}
                    onValueChange={(value) =>
                      updateSchedule({ frequency: value as ScheduleFrequency })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">{uiCopy("daily")}</SelectItem>
                      <SelectItem value="WEEKLY">{uiCopy("weekly")}</SelectItem>
                      <SelectItem value="MONTHLY">{uiCopy("monthly")}</SelectItem>
                      <SelectItem value="YEARLY">{uiCopy("yearly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{uiCopy("every")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={scheduleState.interval}
                      onChange={(e) => updateSchedule({ interval: Number(e.target.value) || 1 })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {getFrequencyUnit(scheduleState.frequency)}
                      {scheduleState.interval === 1 ? "" : uiCopy("s")}
                    </span>
                  </div>
                </div>
              </div>

              {scheduleState.frequency === "WEEKLY" ? (
                <div className="space-y-2">
                  <Label>{uiCopy("days-of-week")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1 text-sm"
                      >
                        <Checkbox
                          checked={scheduleState.daysOfWeek.includes(day.value)}
                          onCheckedChange={() => toggleWeekday(day.value)}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {scheduleState.frequency === "MONTHLY" ? (
                <div className="space-y-2">
                  <Label>{uiCopy("monthly-pattern")}</Label>
                  <RadioGroup
                    value={scheduleState.monthlyMode}
                    onValueChange={(value) => updateSchedule({ monthlyMode: value as MonthlyMode })}
                    className="grid gap-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <RadioGroupItem value="DAY_OF_MONTH" id="monthly-day-of-month" />
                      <Label htmlFor="monthly-day-of-month">{uiCopy("on-day")}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        className="w-24"
                        disabled={scheduleState.monthlyMode !== "DAY_OF_MONTH"}
                        value={scheduleState.monthlyDay}
                        onChange={(e) =>
                          updateSchedule({ monthlyDay: Number(e.target.value) || 1 })
                        }
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RadioGroupItem value="WEEKDAY_OF_MONTH" id="monthly-weekday-of-month" />
                      <Label htmlFor="monthly-weekday-of-month">{uiCopy("on-the")}</Label>
                      <Select
                        value={String(scheduleState.monthlyWeek)}
                        onValueChange={(value) => updateSchedule({ monthlyWeek: Number(value) })}
                        disabled={scheduleState.monthlyMode !== "WEEKDAY_OF_MONTH"}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDINALS.map((ordinal) => (
                            <SelectItem key={ordinal.value} value={String(ordinal.value)}>
                              {ordinal.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={scheduleState.monthlyWeekday}
                        onValueChange={(value) =>
                          updateSchedule({ monthlyWeekday: value as WeekdayCode })
                        }
                        disabled={scheduleState.monthlyMode !== "WEEKDAY_OF_MONTH"}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </RadioGroup>
                </div>
              ) : null}

              {scheduleState.frequency === "YEARLY" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{uiCopy("month")}</Label>
                    <Select
                      value={String(scheduleState.yearlyMonth)}
                      onValueChange={(value) => updateSchedule({ yearlyMonth: Number(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={String(month.value)}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{uiCopy("day")}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={scheduleState.yearlyDay}
                      onChange={(e) => updateSchedule({ yearlyDay: Number(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>{uiCopy("ends")}</Label>
                <RadioGroup
                  value={scheduleState.endsType}
                  onValueChange={(value) => updateSchedule({ endsType: value as ScheduleEndsType })}
                  className="grid gap-3"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="NEVER" id="ends-never" />
                    <Label htmlFor="ends-never">{uiCopy("never")}</Label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RadioGroupItem value="ON_DATE" id="ends-on-date" />
                    <Label htmlFor="ends-on-date">{uiCopy("on-date")}</Label>
                    <Input
                      type="date"
                      className="w-44"
                      disabled={scheduleState.endsType !== "ON_DATE"}
                      value={scheduleState.endsOn}
                      onChange={(e) => updateSchedule({ endsOn: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RadioGroupItem value="AFTER" id="ends-after" />
                    <Label htmlFor="ends-after">{uiCopy("after")}</Label>
                    <Input
                      type="number"
                      min="1"
                      className="w-24"
                      disabled={scheduleState.endsType !== "AFTER"}
                      value={scheduleState.endsAfter}
                      onChange={(e) => updateSchedule({ endsAfter: Number(e.target.value) || 1 })}
                    />
                    <span className="text-sm text-muted-foreground">{uiCopy("occurrences")}</span>
                  </div>
                </RadioGroup>
              </div>

              {scheduleSummary ? (
                <p className="text-sm text-muted-foreground">
                  {uiCopy("summary") + " "}
                  {scheduleSummary}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{uiCopy("schedule-json")}</Label>
              <Textarea
                value={scheduleState.advancedJson}
                onChange={(e) => updateSchedule({ advancedJson: e.target.value })}
                placeholder={uiCopy("recurrence-frequency-weekly-interval")}
                rows={6}
              />
              <p className="text-sm text-muted-foreground">{uiCopy("advanced-format-is-stored")}</p>
            </div>
          )}

          {scheduleError ? <p className="text-sm text-destructive">{scheduleError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
