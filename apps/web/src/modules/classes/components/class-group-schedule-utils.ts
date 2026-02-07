export const WEEKDAYS = [
  { value: "MO", label: "Mon" },
  { value: "TU", label: "Tue" },
  { value: "WE", label: "Wed" },
  { value: "TH", label: "Thu" },
  { value: "FR", label: "Fri" },
  { value: "SA", label: "Sat" },
  { value: "SU", label: "Sun" },
] as const;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export const ORDINALS = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
] as const;

export type WeekdayCode = (typeof WEEKDAYS)[number]["value"];
export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type ScheduleEndsType = "NEVER" | "ON_DATE" | "AFTER";
export type ScheduleMode = "guided" | "advanced";
export type MonthlyMode = "DAY_OF_MONTH" | "WEEKDAY_OF_MONTH";

export type ScheduleBuilderState = {
  enabled: boolean;
  mode: ScheduleMode;
  frequency: ScheduleFrequency;
  interval: number;
  startsOn: string;
  time: string;
  daysOfWeek: WeekdayCode[];
  monthlyMode: MonthlyMode;
  monthlyDay: number;
  monthlyWeek: number;
  monthlyWeekday: WeekdayCode;
  yearlyMonth: number;
  yearlyDay: number;
  endsType: ScheduleEndsType;
  endsOn: string;
  endsAfter: number;
  advancedJson: string;
};

const DEFAULT_SCHEDULE_STATE: ScheduleBuilderState = {
  enabled: false,
  mode: "guided",
  frequency: "WEEKLY",
  interval: 1,
  startsOn: "",
  time: "",
  daysOfWeek: ["MO"],
  monthlyMode: "DAY_OF_MONTH",
  monthlyDay: 1,
  monthlyWeek: 1,
  monthlyWeekday: "MO",
  yearlyMonth: 1,
  yearlyDay: 1,
  endsType: "NEVER",
  endsOn: "",
  endsAfter: 10,
  advancedJson: "",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const WEEKDAY_LOOKUP = WEEKDAYS.reduce<Record<string, WeekdayCode>>((acc, day) => {
  acc[day.value] = day.value;
  acc[day.label.toLowerCase()] = day.value;
  return acc;
}, {});

const JS_WEEKDAY_CODES: WeekdayCode[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const parseWeekdayCodes = (value: unknown): WeekdayCode[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const result: WeekdayCode[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      const key = entry.trim();
      const normalized = WEEKDAY_LOOKUP[key.toUpperCase()] ?? WEEKDAY_LOOKUP[key.toLowerCase()];
      if (normalized && !result.includes(normalized)) {
        result.push(normalized);
      }
      continue;
    }
    if (typeof entry === "number" && Number.isInteger(entry)) {
      if (entry >= 0 && entry <= 6) {
        const mapped = JS_WEEKDAY_CODES[entry];
        if (mapped && !result.includes(mapped)) {
          result.push(mapped);
        }
      } else if (entry >= 1 && entry <= 7) {
        const mapped = WEEKDAYS[(entry - 1) % 7]?.value;
        if (mapped && !result.includes(mapped)) {
          result.push(mapped);
        }
      }
    }
  }
  return result;
};

export const parseJsonInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return JSON.parse(trimmed);
};

export const buildSchedulePattern = (state: ScheduleBuilderState) => {
  const recurrence: Record<string, unknown> = {
    frequency: state.frequency,
    interval: Math.max(1, Math.floor(state.interval || 1)),
  };

  if (state.frequency === "WEEKLY" && state.daysOfWeek.length > 0) {
    recurrence.daysOfWeek = state.daysOfWeek;
  }

  if (state.frequency === "MONTHLY") {
    if (state.monthlyMode === "DAY_OF_MONTH") {
      recurrence.monthly = { mode: "DAY_OF_MONTH", day: state.monthlyDay };
    } else {
      recurrence.monthly = {
        mode: "WEEKDAY_OF_MONTH",
        week: state.monthlyWeek,
        weekday: state.monthlyWeekday,
      };
    }
  }

  if (state.frequency === "YEARLY") {
    recurrence.yearly = {
      month: state.yearlyMonth,
      day: state.yearlyDay,
    };
  }

  const payload: Record<string, unknown> = {
    version: 1,
    recurrence,
  };

  if (state.startsOn) {
    payload.startsOn = state.startsOn;
  }

  if (state.time) {
    payload.time = state.time;
  }

  if (state.endsType !== "NEVER") {
    payload.ends =
      state.endsType === "ON_DATE"
        ? { type: "ON_DATE", date: state.endsOn }
        : { type: "AFTER", count: state.endsAfter };
  }

  return payload;
};

export const parseSchedulePattern = (value: unknown): Partial<ScheduleBuilderState> | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (Array.isArray(value.weekday)) {
    const days = parseWeekdayCodes(value.weekday);
    return {
      frequency: "WEEKLY",
      interval: 1,
      daysOfWeek: days.length > 0 ? days : ["MO"],
      time: typeof value.time === "string" ? value.time : "",
      startsOn: typeof value.startsOn === "string" ? value.startsOn : "",
    };
  }

  const recurrence = value.recurrence;
  if (!isRecord(recurrence)) {
    return null;
  }

  const frequency = recurrence.frequency;
  if (
    frequency !== "DAILY" &&
    frequency !== "WEEKLY" &&
    frequency !== "MONTHLY" &&
    frequency !== "YEARLY"
  ) {
    return null;
  }

  const next: Partial<ScheduleBuilderState> = {
    frequency,
    interval:
      typeof recurrence.interval === "number" && recurrence.interval > 0 ? recurrence.interval : 1,
    startsOn: typeof value.startsOn === "string" ? value.startsOn : "",
    time: typeof value.time === "string" ? value.time : "",
  };

  if (frequency === "WEEKLY") {
    const days = parseWeekdayCodes(recurrence.daysOfWeek);
    next.daysOfWeek = days.length > 0 ? days : ["MO"];
  }

  if (frequency === "MONTHLY" && isRecord(recurrence.monthly)) {
    const monthly = recurrence.monthly;
    if (monthly.mode === "DAY_OF_MONTH" && typeof monthly.day === "number") {
      next.monthlyMode = "DAY_OF_MONTH";
      next.monthlyDay = monthly.day;
    }
    if (
      monthly.mode === "WEEKDAY_OF_MONTH" &&
      typeof monthly.week === "number" &&
      typeof monthly.weekday === "string"
    ) {
      next.monthlyMode = "WEEKDAY_OF_MONTH";
      next.monthlyWeek = monthly.week;
      const weekday = parseWeekdayCodes([monthly.weekday])[0];
      if (weekday) {
        next.monthlyWeekday = weekday;
      }
    }
  }

  if (frequency === "YEARLY" && isRecord(recurrence.yearly)) {
    const yearly = recurrence.yearly;
    if (typeof yearly.month === "number") {
      next.yearlyMonth = yearly.month;
    }
    if (typeof yearly.day === "number") {
      next.yearlyDay = yearly.day;
    }
  }

  if (isRecord(value.ends) && typeof value.ends.type === "string") {
    if (value.ends.type === "ON_DATE") {
      next.endsType = "ON_DATE";
      next.endsOn = typeof value.ends.date === "string" ? value.ends.date : "";
    }
    if (value.ends.type === "AFTER") {
      next.endsType = "AFTER";
      next.endsAfter =
        typeof value.ends.count === "number" && value.ends.count > 0 ? value.ends.count : 1;
    }
  }

  return next;
};

export const resolveScheduleState = (pattern: unknown): ScheduleBuilderState => {
  if (!pattern) {
    return DEFAULT_SCHEDULE_STATE;
  }
  const parsed = parseSchedulePattern(pattern);
  if (parsed) {
    const guidedState: ScheduleBuilderState = {
      ...DEFAULT_SCHEDULE_STATE,
      enabled: true,
      mode: "guided",
      ...parsed,
    };
    return {
      ...guidedState,
      advancedJson: JSON.stringify(buildSchedulePattern(guidedState), null, 2),
    };
  }
  return {
    ...DEFAULT_SCHEDULE_STATE,
    enabled: true,
    mode: "advanced",
    advancedJson: JSON.stringify(pattern, null, 2),
  };
};

export const getFrequencyUnit = (frequency: ScheduleFrequency) => {
  switch (frequency) {
    case "DAILY":
      return "day";
    case "WEEKLY":
      return "week";
    case "MONTHLY":
      return "month";
    case "YEARLY":
      return "year";
    default:
      return "day";
  }
};

export const formatScheduleSummary = (state: ScheduleBuilderState) => {
  if (!state.enabled || state.mode !== "guided") {
    return "";
  }
  const frequencyLabel = getFrequencyUnit(state.frequency);
  const interval = Math.max(1, Math.floor(state.interval || 1));
  const parts: string[] = [];
  parts.push(interval === 1 ? `Every ${frequencyLabel}` : `Every ${interval} ${frequencyLabel}s`);

  if (state.frequency === "WEEKLY" && state.daysOfWeek.length > 0) {
    const labels = state.daysOfWeek
      .map((code) => WEEKDAYS.find((day) => day.value === code)?.label)
      .filter(Boolean)
      .join(", ");
    if (labels) {
      parts.push(`on ${labels}`);
    }
  }

  if (state.frequency === "MONTHLY") {
    if (state.monthlyMode === "DAY_OF_MONTH") {
      parts.push(`on day ${state.monthlyDay}`);
    } else {
      const ordinal = ORDINALS.find((item) => item.value === state.monthlyWeek)?.label ?? "";
      const weekday = WEEKDAYS.find((day) => day.value === state.monthlyWeekday)?.label ?? "";
      if (ordinal && weekday) {
        parts.push(`on the ${ordinal.toLowerCase()} ${weekday}`);
      }
    }
  }

  if (state.frequency === "YEARLY") {
    const monthLabel = MONTHS.find((month) => month.value === state.yearlyMonth)?.label ?? "";
    if (monthLabel) {
      parts.push(`on ${monthLabel} ${state.yearlyDay}`);
    }
  }

  if (state.time) {
    parts.push(`at ${state.time}`);
  }

  if (state.startsOn) {
    parts.push(`starts ${state.startsOn}`);
  }

  if (state.endsType === "ON_DATE" && state.endsOn) {
    parts.push(`ends on ${state.endsOn}`);
  } else if (state.endsType === "AFTER") {
    parts.push(`ends after ${state.endsAfter} occurrences`);
  } else {
    parts.push("never ends");
  }

  return parts.join(" · ");
};

export const getScheduleError = (state: ScheduleBuilderState) => {
  if (!state.enabled) {
    return "";
  }
  if (state.mode === "advanced") {
    if (!state.advancedJson.trim()) {
      return "Enter schedule JSON or switch to guided builder.";
    }
    try {
      JSON.parse(state.advancedJson);
      return "";
    } catch {
      return "Invalid JSON";
    }
  }
  if (!Number.isFinite(state.interval) || state.interval < 1) {
    return "Interval must be at least 1.";
  }
  if (state.frequency === "WEEKLY" && state.daysOfWeek.length === 0) {
    return "Select at least one weekday.";
  }
  if (state.frequency === "MONTHLY") {
    if (state.monthlyMode === "DAY_OF_MONTH") {
      if (state.monthlyDay < 1 || state.monthlyDay > 31) {
        return "Monthly day must be between 1 and 31.";
      }
    }
  }
  if (state.frequency === "YEARLY") {
    if (state.yearlyMonth < 1 || state.yearlyMonth > 12) {
      return "Month must be between 1 and 12.";
    }
    if (state.yearlyDay < 1 || state.yearlyDay > 31) {
      return "Day must be between 1 and 31.";
    }
  }
  if (state.endsType === "ON_DATE" && !state.endsOn) {
    return "Select an end date.";
  }
  if (state.endsType === "AFTER" && (!Number.isFinite(state.endsAfter) || state.endsAfter < 1)) {
    return "Occurrence count must be at least 1.";
  }
  return "";
};
