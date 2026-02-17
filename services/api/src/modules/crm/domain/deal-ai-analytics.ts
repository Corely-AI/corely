export type DealAiHealthStatus = "GOOD" | "AT_RISK" | "STALLED";

export type DealAiFactor = {
  label: string;
  reason: string;
  weight: number;
  impact: "positive" | "negative" | "neutral";
};

export type DealAiHistoricalSignals = {
  stageId: string;
  stageConversion: {
    won: number;
    closed: number;
  };
  stageMedianDays: number | null;
  stageRemainingP50Days: number | null;
  stageRemainingP80Days: number | null;
  stageSampleSize: number;
  wonSampleSize: number;
};

export type DealAiRuntimeSignals = {
  stageId: string;
  expectedCloseDate: Date | null;
  amountCents: number | null;
  hasLinkedContact: boolean;
  stageEnteredAt: Date;
  lastActivityAt: Date | null;
  activityCount: number;
  now: Date;
};

export type DealAiAnalyticsResult = {
  status: DealAiHealthStatus;
  explanation: string;
  winProbability: number;
  confidence: number;
  lowConfidence: boolean;
  forecastCloseDate: string | null;
  forecastRange: {
    p50CloseDate: string | null;
    p80CloseDate: string | null;
  } | null;
  topFactors: DealAiFactor[];
};

const FALLBACK_STAGE_PROBABILITY: Record<string, number> = {
  lead: 0.18,
  qualified: 0.35,
  proposal: 0.5,
  negotiation: 0.68,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const daysSince = (now: Date, past: Date): number => {
  const ms = now.getTime() - past.getTime();
  return ms <= 0 ? 0 : ms / (1000 * 60 * 60 * 24);
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const stageFallbackProbability = (stageId: string): number => {
  const normalized = stageId.trim().toLowerCase();
  return FALLBACK_STAGE_PROBABILITY[normalized] ?? 0.4;
};

export function computeDealAiAnalytics(
  historical: DealAiHistoricalSignals,
  runtime: DealAiRuntimeSignals
): DealAiAnalyticsResult {
  const timeInStageDays = daysSince(runtime.now, runtime.stageEnteredAt);
  const lastActivityDays = runtime.lastActivityAt
    ? daysSince(runtime.now, runtime.lastActivityAt)
    : null;

  const hasReliableStageRate = historical.stageConversion.closed >= 5;
  const stageRate = hasReliableStageRate
    ? historical.stageConversion.won / Math.max(1, historical.stageConversion.closed)
    : stageFallbackProbability(historical.stageId);

  const factors: DealAiFactor[] = [
    {
      label: "Stage conversion",
      reason: hasReliableStageRate
        ? `Historical conversion at this stage: ${Math.round(stageRate * 100)}%`
        : "Low historical volume; using stage heuristic baseline",
      weight: hasReliableStageRate ? 0.16 : 0.08,
      impact: "positive",
    },
  ];

  let probability = stageRate;

  if (historical.stageMedianDays !== null && historical.stageMedianDays > 0) {
    const ratio = timeInStageDays / historical.stageMedianDays;
    if (ratio > 1.8) {
      probability -= 0.2;
      factors.push({
        label: "Stage duration",
        reason: "Time in stage is far above historical median",
        weight: -0.2,
        impact: "negative",
      });
    } else if (ratio > 1.2) {
      probability -= 0.1;
      factors.push({
        label: "Stage duration",
        reason: "Time in stage is above historical median",
        weight: -0.1,
        impact: "negative",
      });
    } else if (ratio < 0.7) {
      probability += 0.07;
      factors.push({
        label: "Stage duration",
        reason: "Deal is progressing faster than median",
        weight: 0.07,
        impact: "positive",
      });
    }
  } else if (timeInStageDays > 21) {
    probability -= 0.08;
    factors.push({
      label: "Stage duration",
      reason: "No historical median; prolonged stage time increases risk",
      weight: -0.08,
      impact: "negative",
    });
  }

  if (lastActivityDays === null) {
    probability -= 0.18;
    factors.push({
      label: "Recent activity",
      reason: "No activity has been logged yet",
      weight: -0.18,
      impact: "negative",
    });
  } else if (lastActivityDays > 14) {
    probability -= 0.16;
    factors.push({
      label: "Recent activity",
      reason: "No interaction in more than 14 days",
      weight: -0.16,
      impact: "negative",
    });
  } else if (lastActivityDays > 7) {
    probability -= 0.08;
    factors.push({
      label: "Recent activity",
      reason: "No interaction in more than 7 days",
      weight: -0.08,
      impact: "negative",
    });
  } else if (lastActivityDays <= 2) {
    probability += 0.08;
    factors.push({
      label: "Recent activity",
      reason: "Very recent customer interaction",
      weight: 0.08,
      impact: "positive",
    });
  }

  if (runtime.activityCount < 2) {
    probability -= 0.07;
    factors.push({
      label: "Activity volume",
      reason: "Limited activity history on the deal",
      weight: -0.07,
      impact: "negative",
    });
  } else if (runtime.activityCount >= 6) {
    probability += 0.05;
    factors.push({
      label: "Activity volume",
      reason: "Strong engagement history",
      weight: 0.05,
      impact: "positive",
    });
  }

  if (runtime.expectedCloseDate) {
    probability += 0.05;
    factors.push({
      label: "Expected close date",
      reason: "A target close date is set",
      weight: 0.05,
      impact: "positive",
    });
  } else {
    probability -= 0.05;
    factors.push({
      label: "Expected close date",
      reason: "Expected close date is missing",
      weight: -0.05,
      impact: "negative",
    });
  }

  if (runtime.amountCents !== null) {
    probability += 0.03;
    factors.push({
      label: "Deal amount",
      reason: "Deal value is captured",
      weight: 0.03,
      impact: "positive",
    });
  }

  if (!runtime.hasLinkedContact) {
    probability -= 0.06;
    factors.push({
      label: "Linked contact",
      reason: "No linked contact is available",
      weight: -0.06,
      impact: "negative",
    });
  }

  probability = clamp(probability, 0.02, 0.98);

  const stalledByActivity = lastActivityDays !== null ? lastActivityDays > 14 : true;
  const stalledByStageTime =
    historical.stageMedianDays !== null
      ? timeInStageDays > historical.stageMedianDays * 1.8
      : timeInStageDays > 30;
  const atRiskByActivity = lastActivityDays !== null ? lastActivityDays > 7 : true;
  const atRiskByMissingData =
    runtime.expectedCloseDate === null || runtime.activityCount < 2 || !runtime.hasLinkedContact;

  const status: DealAiHealthStatus =
    stalledByActivity || stalledByStageTime
      ? "STALLED"
      : atRiskByActivity || atRiskByMissingData
        ? "AT_RISK"
        : "GOOD";

  const explanation =
    status === "STALLED"
      ? "Deal appears stalled due to prolonged inactivity or stage stagnation."
      : status === "AT_RISK"
        ? "Deal has risk signals that should be addressed soon."
        : "Deal momentum is healthy based on activity and stage progress.";

  const confidenceRaw =
    0.3 +
    Math.min(historical.stageConversion.closed, 40) / 100 +
    Math.min(historical.wonSampleSize, 25) / 100 +
    Math.min(runtime.activityCount, 8) / 40;
  const confidence = clamp(confidenceRaw, 0.25, 0.95);
  const lowConfidence =
    confidence < 0.5 || historical.stageConversion.closed < 5 || historical.wonSampleSize < 5;

  const p50Date =
    historical.stageRemainingP50Days !== null
      ? new Date(runtime.now.getTime() + historical.stageRemainingP50Days * 24 * 60 * 60 * 1000)
      : null;
  const p80Date =
    historical.stageRemainingP80Days !== null
      ? new Date(runtime.now.getTime() + historical.stageRemainingP80Days * 24 * 60 * 60 * 1000)
      : null;

  const forecastRange =
    p50Date || p80Date
      ? {
          p50CloseDate: p50Date ? toIsoDate(p50Date) : null,
          p80CloseDate: p80Date ? toIsoDate(p80Date) : null,
        }
      : null;

  const forecastCloseDate = p50Date ? toIsoDate(p50Date) : null;

  const topFactors = [...factors]
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 3);

  return {
    status,
    explanation,
    winProbability: probability,
    confidence,
    lowConfidence,
    forecastCloseDate,
    forecastRange,
    topFactors,
  };
}
