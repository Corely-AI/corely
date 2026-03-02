import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DEFAULT_PIPELINE_STAGES } from "@corely/contracts";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@corely/ui";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  Filter,
  Mail,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { formatDate, formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";

const DAY_MS = 24 * 60 * 60 * 1000;
const AT_RISK_IDLE_DAYS = 10;

const DATE_RANGE_OPTIONS = ["today", "7d", "30d", "quarter"] as const;
type DateRangeKey = (typeof DATE_RANGE_OPTIONS)[number];

type WorkTab = "today" | "overdue" | "upcoming";

interface KpiMetric {
  id: string;
  label: string;
  value: string;
  delta: number | null;
}

interface Recommendation {
  id: string;
  title: string;
  why: string;
  actionLabel: string;
  actionHref: string;
}

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isInRange = (value: Date | null, start: Date, end: Date): boolean => {
  if (!value) {
    return false;
  }
  return value.getTime() >= start.getTime() && value.getTime() < end.getTime();
};

const getRangeBounds = (range: DateRangeKey, now: Date): { start: Date; end: Date } => {
  const end = new Date(now);
  switch (range) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case "7d": {
      return { start: new Date(now.getTime() - 7 * DAY_MS), end };
    }
    case "30d": {
      return { start: new Date(now.getTime() - 30 * DAY_MS), end };
    }
    case "quarter": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1);
      return { start, end };
    }
    default:
      return { start: new Date(now.getTime() - 30 * DAY_MS), end };
  }
};

const pctDelta = (current: number, previous: number): number | null => {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / Math.abs(previous)) * 100;
};

const countDelta = (current: number, previous: number): number | null => {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
};

const dashboardCardClass =
  "border-border/70 bg-card/95 shadow-sm shadow-foreground/5 dark:border-border/35 dark:bg-card/80 dark:shadow-black/20";

const dashboardInsetClass =
  "rounded-xl border border-border/70 bg-background/75 p-3 dark:border-border/35 dark:bg-background/45";

const dashboardInsetInteractiveClass = cn(
  dashboardInsetClass,
  "transition-colors hover:bg-background/90 dark:hover:bg-background/60"
);

const dashboardEmptyClass =
  "rounded-xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground dark:border-border/35 dark:bg-background/35";

export default function CrmDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = i18n.language === "vi" ? "vi-VN" : i18n.language === "de" ? "de-DE" : "en-DE";

  const [searchTerm, setSearchTerm] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRangeKey>("30d");
  const [ownerFilter, setOwnerFilter] = React.useState("ALL");
  const [pipelineFilter, setPipelineFilter] = React.useState("DEFAULT");
  const [stageFilter, setStageFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [tagFilter, setTagFilter] = React.useState("ALL");
  const [workTab, setWorkTab] = React.useState<WorkTab>("today");
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = React.useState<Set<string>>(
    new Set()
  );
  const [locallyCompletedActivityIds, setLocallyCompletedActivityIds] = React.useState<Set<string>>(
    new Set()
  );

  React.useEffect(() => {
    document.title = t("crm.dashboard.pageTitle");
  }, [t]);

  const dealsQuery = useQuery({
    queryKey: ["crm", "dashboard", "deals"],
    queryFn: () => crmApi.listDeals({ pageSize: 100 }),
  });

  const leadsQuery = useQuery({
    queryKey: ["crm", "dashboard", "leads"],
    queryFn: () => crmApi.listLeads(),
  });

  const activitiesQuery = useQuery({
    queryKey: ["crm", "dashboard", "activities"],
    queryFn: () => crmApi.listActivities({ pageSize: 100 }),
  });

  const sequencesQuery = useQuery({
    queryKey: ["crm", "dashboard", "sequences"],
    queryFn: () => crmApi.listSequences(),
  });

  const isInitialLoading =
    dealsQuery.isLoading &&
    leadsQuery.isLoading &&
    activitiesQuery.isLoading &&
    sequencesQuery.isLoading;

  const allFailed =
    dealsQuery.isError && leadsQuery.isError && activitiesQuery.isError && sequencesQuery.isError;

  const deals = dealsQuery.data?.deals ?? [];
  const leads = leadsQuery.data ?? [];
  const activities = activitiesQuery.data?.activities ?? [];
  const sequences = sequencesQuery.data ?? [];

  const ownerOptions = React.useMemo(() => {
    const ownerIds = new Set<string>();
    for (const deal of deals) {
      if (deal.ownerUserId) {
        ownerIds.add(deal.ownerUserId);
      }
    }
    for (const lead of leads) {
      if (lead.ownerUserId) {
        ownerIds.add(lead.ownerUserId);
      }
    }
    return Array.from(ownerIds);
  }, [deals, leads]);

  const tagOptions = React.useMemo(() => {
    const tags = new Set<string>();
    for (const deal of deals) {
      for (const tag of deal.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [deals]);

  const now = React.useMemo(() => new Date(), []);
  const range = React.useMemo(() => getRangeBounds(dateRange, now), [dateRange, now]);
  const previousRange = React.useMemo(() => {
    const periodMs = range.end.getTime() - range.start.getTime();
    const end = new Date(range.start);
    const start = new Date(range.start.getTime() - periodMs);
    return { start, end };
  }, [range]);

  const dealById = React.useMemo(() => {
    const map = new Map<string, (typeof deals)[number]>();
    for (const deal of deals) {
      map.set(deal.id, deal);
    }
    return map;
  }, [deals]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredDeals = React.useMemo(() => {
    return deals.filter((deal) => {
      const tags = deal.tags.map((tag) => tag.toLowerCase());
      const matchesSearch =
        normalizedSearch.length === 0 ||
        deal.title.toLowerCase().includes(normalizedSearch) ||
        tags.some((tag) => tag.includes(normalizedSearch));

      const matchesOwner = ownerFilter === "ALL" || deal.ownerUserId === ownerFilter;
      const matchesStage = stageFilter === "ALL" || deal.stageId === stageFilter;
      const matchesStatus = statusFilter === "ALL" || deal.status === statusFilter;
      const matchesTag = tagFilter === "ALL" || deal.tags.includes(tagFilter);
      const matchesRange = isInRange(parseDate(deal.updatedAt), range.start, range.end);

      return (
        matchesSearch &&
        matchesOwner &&
        matchesStage &&
        matchesStatus &&
        matchesTag &&
        matchesRange &&
        pipelineFilter === "DEFAULT"
      );
    });
  }, [
    deals,
    normalizedSearch,
    ownerFilter,
    stageFilter,
    statusFilter,
    tagFilter,
    range.start,
    range.end,
    pipelineFilter,
  ]);

  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      const name = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim().toLowerCase();
      const company = (lead.companyName ?? "").toLowerCase();
      const email = (lead.email ?? "").toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0 ||
        name.includes(normalizedSearch) ||
        company.includes(normalizedSearch) ||
        email.includes(normalizedSearch);
      const matchesOwner = ownerFilter === "ALL" || lead.ownerUserId === ownerFilter;
      const matchesRange = isInRange(parseDate(lead.createdAt), range.start, range.end);
      return matchesSearch && matchesOwner && matchesRange;
    });
  }, [leads, normalizedSearch, ownerFilter, range.start, range.end]);

  const openActivities = React.useMemo(() => {
    return activities.filter(
      (activity) => activity.status === "OPEN" && !locallyCompletedActivityIds.has(activity.id)
    );
  }, [activities, locallyCompletedActivityIds]);

  const activitiesWithDueDate = React.useMemo(() => {
    return openActivities
      .map((activity) => {
        const dueDate = parseDate(activity.dueAt ?? activity.activityDate ?? activity.createdAt);
        return { activity, dueDate };
      })
      .filter((item): item is { activity: (typeof openActivities)[number]; dueDate: Date } =>
        Boolean(item.dueDate)
      );
  }, [openActivities]);

  const startOfToday = React.useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const endOfToday = React.useMemo(() => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() + 1);
    return date;
  }, [startOfToday]);

  const todayWork = React.useMemo(() => {
    return activitiesWithDueDate
      .filter(({ dueDate }) => dueDate >= startOfToday && dueDate < endOfToday)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [activitiesWithDueDate, startOfToday, endOfToday]);

  const overdueWork = React.useMemo(() => {
    return activitiesWithDueDate
      .filter(({ dueDate }) => dueDate < now)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [activitiesWithDueDate, now]);

  const upcomingWork = React.useMemo(() => {
    return activitiesWithDueDate
      .filter(({ dueDate }) => dueDate >= endOfToday)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [activitiesWithDueDate, endOfToday]);

  const latestActivityByDeal = React.useMemo(() => {
    const map = new Map<string, Date>();
    for (const activity of activities) {
      if (!activity.dealId) {
        continue;
      }
      const stamp = parseDate(activity.activityDate ?? activity.updatedAt ?? activity.createdAt);
      if (!stamp) {
        continue;
      }
      const current = map.get(activity.dealId);
      if (!current || current.getTime() < stamp.getTime()) {
        map.set(activity.dealId, stamp);
      }
    }
    return map;
  }, [activities]);

  const stageNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const stage of DEFAULT_PIPELINE_STAGES) {
      map.set(stage.id, stage.name);
    }
    return map;
  }, []);

  const pipelineByStage = React.useMemo(() => {
    const stageBuckets = DEFAULT_PIPELINE_STAGES.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      count: 0,
      valueCents: 0,
    }));

    for (const deal of filteredDeals) {
      const bucket = stageBuckets.find((item) => item.stageId === deal.stageId);
      if (!bucket) {
        continue;
      }
      bucket.count += 1;
      bucket.valueCents += deal.amountCents ?? 0;
    }

    return stageBuckets;
  }, [filteredDeals]);

  const atRiskDeals = React.useMemo(() => {
    return filteredDeals
      .filter((deal) => deal.status === "OPEN")
      .map((deal) => {
        const reasons: string[] = [];
        const expectedCloseDate = parseDate(deal.expectedCloseDate);
        if (expectedCloseDate && expectedCloseDate < now) {
          reasons.push("close_date_passed");
        }

        const lastActivity = latestActivityByDeal.get(deal.id);
        if (!lastActivity || now.getTime() - lastActivity.getTime() > AT_RISK_IDLE_DAYS * DAY_MS) {
          reasons.push("no_recent_activity");
        }

        const updatedAt = parseDate(deal.updatedAt);
        if (updatedAt && now.getTime() - updatedAt.getTime() > 14 * DAY_MS) {
          reasons.push("stalled");
        }

        return {
          deal,
          lastActivity,
          reasons,
        };
      })
      .filter((item) => item.reasons.length > 0)
      .sort((a, b) => b.reasons.length - a.reasons.length)
      .slice(0, 5);
  }, [filteredDeals, latestActivityByDeal, now]);

  const dealsClosingSoon = React.useMemo(() => {
    const in30Days = new Date(now.getTime() + 30 * DAY_MS);
    return filteredDeals
      .filter((deal) => {
        if (deal.status !== "OPEN") {
          return false;
        }
        const closeDate = parseDate(deal.expectedCloseDate);
        if (!closeDate) {
          return false;
        }
        return closeDate >= now && closeDate <= in30Days;
      })
      .sort((a, b) => {
        const aDate = parseDate(a.expectedCloseDate);
        const bDate = parseDate(b.expectedCloseDate);
        return (aDate?.getTime() ?? 0) - (bDate?.getTime() ?? 0);
      })
      .slice(0, 6);
  }, [filteredDeals, now]);

  const newUnworkedLeads = React.useMemo(() => {
    return filteredLeads
      .filter((lead) => lead.status === "NEW" && !lead.lastRepliedAt)
      .sort((a, b) => {
        const aTime = parseDate(a.createdAt)?.getTime() ?? 0;
        const bTime = parseDate(b.createdAt)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [filteredLeads]);

  const recentActivityFeed = React.useMemo(() => {
    return activities
      .slice()
      .sort((a, b) => {
        const aTime = parseDate(a.createdAt)?.getTime() ?? 0;
        const bTime = parseDate(b.createdAt)?.getTime() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 8);
  }, [activities]);

  const sequenceCommunications7d = React.useMemo(() => {
    const from = new Date(now.getTime() - 7 * DAY_MS);
    const inboundReplies = activities.filter((activity) => {
      const createdAt = parseDate(activity.createdAt);
      if (!createdAt || createdAt < from) {
        return false;
      }
      return activity.type === "COMMUNICATION" && activity.direction === "INBOUND";
    }).length;

    const outboundMessages = activities.filter((activity) => {
      const createdAt = parseDate(activity.createdAt);
      if (!createdAt || createdAt < from) {
        return false;
      }
      return activity.type === "COMMUNICATION" && activity.direction === "OUTBOUND";
    }).length;

    return {
      inboundReplies,
      outboundMessages,
      replyRate: outboundMessages === 0 ? 0 : Math.round((inboundReplies / outboundMessages) * 100),
    };
  }, [activities, now]);

  const kpis = React.useMemo<KpiMetric[]>(() => {
    const in30Days = new Date(now.getTime() + 30 * DAY_MS);
    const prevWindowStart = new Date(now.getTime() - 7 * DAY_MS);
    const prevWindowEnd = new Date(now);
    const prior7WindowStart = new Date(now.getTime() - 14 * DAY_MS);

    const openDeals = filteredDeals.filter((deal) => deal.status === "OPEN");
    const openPipelineValue = openDeals.reduce((sum, deal) => sum + (deal.amountCents ?? 0), 0);
    const weightedForecast = openDeals.reduce(
      (sum, deal) => sum + Math.round((deal.amountCents ?? 0) * ((deal.probability ?? 0) / 100)),
      0
    );

    const dealsClosing30d = filteredDeals.filter((deal) => {
      const closeDate = parseDate(deal.expectedCloseDate);
      return (
        deal.status === "OPEN" && Boolean(closeDate && closeDate >= now && closeDate <= in30Days)
      );
    }).length;

    const newLeads7d = filteredLeads.filter((lead) => {
      const createdAt = parseDate(lead.createdAt);
      return Boolean(createdAt && createdAt >= prevWindowStart && createdAt <= prevWindowEnd);
    }).length;

    const previousLeads7d = leads.filter((lead) => {
      const createdAt = parseDate(lead.createdAt);
      return Boolean(createdAt && createdAt >= prior7WindowStart && createdAt < prevWindowStart);
    }).length;

    const overdueActivities = overdueWork.length;

    const previousOverdueActivities = activities.filter((activity) => {
      if (activity.status !== "OPEN") {
        return false;
      }
      const dueAt = parseDate(activity.dueAt ?? activity.activityDate ?? activity.createdAt);
      return Boolean(dueAt && dueAt >= prior7WindowStart && dueAt < prevWindowStart);
    }).length;

    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    const previousQuarterStart = new Date(now.getFullYear(), quarterStartMonth - 3, 1);

    const closedInQuarter = deals.filter((deal) => {
      if (deal.status === "OPEN") {
        return false;
      }
      const closedAt = parseDate(deal.wonAt ?? deal.lostAt ?? deal.updatedAt);
      return Boolean(closedAt && closedAt >= quarterStart && closedAt <= now);
    });
    const wonInQuarter = closedInQuarter.filter((deal) => deal.status === "WON").length;
    const winRateQuarter =
      closedInQuarter.length === 0 ? 0 : Math.round((wonInQuarter / closedInQuarter.length) * 100);

    const closedInPreviousQuarter = deals.filter((deal) => {
      if (deal.status === "OPEN") {
        return false;
      }
      const closedAt = parseDate(deal.wonAt ?? deal.lostAt ?? deal.updatedAt);
      return Boolean(closedAt && closedAt >= previousQuarterStart && closedAt < quarterStart);
    });
    const wonInPreviousQuarter = closedInPreviousQuarter.filter(
      (deal) => deal.status === "WON"
    ).length;
    const previousWinRateQuarter =
      closedInPreviousQuarter.length === 0
        ? 0
        : Math.round((wonInPreviousQuarter / closedInPreviousQuarter.length) * 100);

    const currOpenForRange = deals
      .filter((deal) => deal.status === "OPEN")
      .filter((deal) => isInRange(parseDate(deal.updatedAt), range.start, range.end))
      .reduce((sum, deal) => sum + (deal.amountCents ?? 0), 0);

    const prevOpenForRange = deals
      .filter((deal) => deal.status === "OPEN")
      .filter((deal) =>
        isInRange(parseDate(deal.updatedAt), previousRange.start, previousRange.end)
      )
      .reduce((sum, deal) => sum + (deal.amountCents ?? 0), 0);

    const currWeightedForRange = deals
      .filter((deal) => deal.status === "OPEN")
      .filter((deal) => isInRange(parseDate(deal.updatedAt), range.start, range.end))
      .reduce(
        (sum, deal) => sum + Math.round((deal.amountCents ?? 0) * ((deal.probability ?? 0) / 100)),
        0
      );

    const prevWeightedForRange = deals
      .filter((deal) => deal.status === "OPEN")
      .filter((deal) =>
        isInRange(parseDate(deal.updatedAt), previousRange.start, previousRange.end)
      )
      .reduce(
        (sum, deal) => sum + Math.round((deal.amountCents ?? 0) * ((deal.probability ?? 0) / 100)),
        0
      );

    return [
      {
        id: "open-pipeline",
        label: "Open pipeline",
        value: formatMoney(openPipelineValue, locale),
        delta: pctDelta(currOpenForRange, prevOpenForRange),
      },
      {
        id: "weighted-forecast",
        label: "Weighted forecast",
        value: formatMoney(weightedForecast, locale),
        delta: pctDelta(currWeightedForRange, prevWeightedForRange),
      },
      {
        id: "deals-closing-30d",
        label: "Deals closing (30d)",
        value: dealsClosing30d.toString(),
        delta: countDelta(dealsClosing30d, 0),
      },
      {
        id: "new-leads-7d",
        label: "New leads (7d)",
        value: newLeads7d.toString(),
        delta: countDelta(newLeads7d, previousLeads7d),
      },
      {
        id: "overdue-activities",
        label: "Overdue activities",
        value: overdueActivities.toString(),
        delta: countDelta(overdueActivities, previousOverdueActivities),
      },
      {
        id: "sequence-replies",
        label: "Sequence replies (7d)",
        value: sequenceCommunications7d.inboundReplies.toString(),
        delta: countDelta(sequenceCommunications7d.inboundReplies, 0),
      },
      {
        id: "win-rate-quarter",
        label: "Win rate (quarter)",
        value: `${winRateQuarter}%`,
        delta: winRateQuarter - previousWinRateQuarter,
      },
    ];
  }, [
    now,
    filteredDeals,
    filteredLeads,
    leads,
    activities,
    overdueWork.length,
    sequenceCommunications7d.inboundReplies,
    locale,
    deals,
    range.start,
    range.end,
    previousRange.start,
    previousRange.end,
  ]);

  const aiRecommendations = React.useMemo<Recommendation[]>(() => {
    const recommendations: Recommendation[] = [];

    if (overdueWork.length > 0) {
      recommendations.push({
        id: "rec-overdue",
        title: `Complete ${Math.min(overdueWork.length, 3)} overdue follow-ups`,
        why: "Overdue tasks reduce reply rates and increase risk of deals slipping this week.",
        actionLabel: "Create task",
        actionHref: "/crm/activities/new?type=TASK",
      });
    }

    if (atRiskDeals.length > 0) {
      const target = atRiskDeals[0];
      recommendations.push({
        id: "rec-at-risk",
        title: `Move ${target.deal.title} to the right stage`,
        why: "This deal is marked at risk because it is stalled, has no recent activity, or has a passed close date.",
        actionLabel: "Move deal stage",
        actionHref: `/crm/deals/${target.deal.id}`,
      });
    }

    if (newUnworkedLeads.length > 0) {
      const lead = newUnworkedLeads[0];
      recommendations.push({
        id: "rec-lead-follow-up",
        title: "Draft a first-touch email for a new lead",
        why: "New leads contacted within the first day have a meaningfully higher conversion rate.",
        actionLabel: "Draft email",
        actionHref: lead.convertedDealId ? `/crm/deals/${lead.convertedDealId}` : "/assistant",
      });
    }

    return recommendations.filter((item) => !dismissedRecommendationIds.has(item.id)).slice(0, 3);
  }, [overdueWork.length, atRiskDeals, newUnworkedLeads, dismissedRecommendationIds]);

  const hasAnyCrmData =
    deals.length > 0 || leads.length > 0 || activities.length > 0 || sequences.length > 0;

  const isEmailHealthWarning =
    sequenceCommunications7d.outboundMessages > 0 && sequenceCommunications7d.replyRate < 10;

  const handleCompleteActivity = (activityId: string) => {
    setLocallyCompletedActivityIds((prev) => {
      const next = new Set(prev);
      next.add(activityId);
      return next;
    });
  };

  const currentWorkItems =
    workTab === "today" ? todayWork : workTab === "overdue" ? overdueWork : upcomingWork;

  const retryAll = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard", "deals"] }),
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard", "leads"] }),
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard", "activities"] }),
      queryClient.invalidateQueries({ queryKey: ["crm", "dashboard", "sequences"] }),
    ]);
  };

  if (isInitialLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6" data-testid="crm-dashboard-loading">
        <div className="h-8 w-52 rounded bg-muted/70 animate-pulse dark:bg-muted/40" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="h-24 rounded-xl border border-border/50 bg-muted/40 animate-pulse dark:border-border/30 dark:bg-muted/25"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8 h-64 rounded-xl border border-border/50 bg-muted/40 animate-pulse dark:border-border/30 dark:bg-muted/25" />
          <div className="xl:col-span-4 h-64 rounded-xl border border-border/50 bg-muted/40 animate-pulse dark:border-border/30 dark:bg-muted/25" />
        </div>
      </div>
    );
  }

  if (allFailed) {
    return (
      <div className="p-6 lg:p-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>CRM dashboard unavailable</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>We couldn&apos;t load deals, leads, activities, or sequence health.</p>
            <Button variant="outline" size="sm" onClick={retryAll}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-dashboard-page">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-accent/10 via-transparent to-transparent dark:from-accent/20" />
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <span>{t("crm.dashboard.breadcrumb.crm")}</span>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{t("crm.dashboard.breadcrumb.dashboard")}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-h1 text-foreground">{t("crm.dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("crm.dashboard.subtitle")}</p>
          </div>
          <Button asChild variant="accent-outline">
            <Link to="/assistant">
              <Bot className="h-4 w-4" />
              Open Assistant
            </Link>
          </Button>
        </div>
      </div>

      <Card className={dashboardCardClass}>
        <CardContent className="p-4 lg:p-5 space-y-4">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search deals, leads, contacts"
                className="pl-9"
                aria-label="Global CRM search"
              />
            </div>

            <div className="lg:col-span-2">
              <Select
                value={dateRange}
                onValueChange={(value) => setDateRange(value as DateRangeKey)}
              >
                <SelectTrigger>
                  <CalendarDays className="h-4 w-4" />
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">7d</SelectItem>
                  <SelectItem value="30d">30d</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 gap-3">
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Owner: All</SelectItem>
                  {ownerOptions.map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {owner}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Stage: All</SelectItem>
                  {DEFAULT_PIPELINE_STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="accent">
                    <Plus className="h-4 w-4" />+ New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate("/crm/deals/new")}>
                    Deal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/crm/leads/new")}>
                    Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/crm/activities/new")}>
                    Activity
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/crm/sequences")}>
                    Enroll in Sequence
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">Pipeline: Default</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Status: All</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="WON">Won</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tags: All</SelectItem>
                {tagOptions.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.id} className={dashboardCardClass}>
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-xl font-semibold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">
                {kpi.delta === null
                  ? "No baseline"
                  : `${kpi.delta > 0 ? "+" : ""}${Math.round(kpi.delta)}% vs previous period`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasAnyCrmData ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className={cn("xl:col-span-8", dashboardCardClass)}>
            <CardHeader>
              <CardTitle>Get your CRM workspace live</CardTitle>
              <CardDescription>
                Complete setup to unlock AI briefing, risk alerts, and sequence recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={cn("flex items-center justify-between", dashboardInsetClass)}>
                <p className="text-sm">1. Import contacts or add your first leads</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/crm/leads/new">Add lead</Link>
                </Button>
              </div>
              <div className={cn("flex items-center justify-between", dashboardInsetClass)}>
                <p className="text-sm">2. Create pipeline stages</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/crm/deals">Open pipeline</Link>
                </Button>
              </div>
              <div className={cn("flex items-center justify-between", dashboardInsetClass)}>
                <p className="text-sm">3. Add your first deal</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/crm/deals/new">Create deal</Link>
                </Button>
              </div>
              <div className={cn("flex items-center justify-between", dashboardInsetClass)}>
                <p className="text-sm">4. Connect your email inbox</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/crm/settings/email">Connect email</Link>
                </Button>
              </div>
              <div className={cn("flex items-center justify-between", dashboardInsetClass)}>
                <p className="text-sm">5. Create your first sequence</p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/crm/sequences/new">Create sequence</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={cn("xl:col-span-4", dashboardCardClass)}>
            <CardHeader>
              <CardTitle>AI Daily Brief</CardTitle>
              <CardDescription>
                Once your CRM has activity, AI will summarize movement, overdue follow-ups, and next
                best actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={dashboardEmptyClass}>
                Add leads, log activities, and update deals to generate recommendations.
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-12">
          <Card className={cn("xl:col-span-8", dashboardCardClass, "relative overflow-hidden")}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-accent/8 to-transparent dark:from-accent/15" />
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Daily Brief
                </CardTitle>
                <CardDescription>
                  Deal movement, new leads, overdue follow-ups, and sequence steps due.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/assistant">Open Assistant</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className={dashboardInsetClass}>
                  <p className="text-xs text-muted-foreground">Deal movement</p>
                  <p className="text-lg font-semibold">{filteredDeals.length}</p>
                </div>
                <div className={dashboardInsetClass}>
                  <p className="text-xs text-muted-foreground">New leads</p>
                  <p className="text-lg font-semibold">{newUnworkedLeads.length}</p>
                </div>
                <div className={dashboardInsetClass}>
                  <p className="text-xs text-muted-foreground">Overdue follow-ups</p>
                  <p className="text-lg font-semibold">{overdueWork.length}</p>
                </div>
                <div className={dashboardInsetClass}>
                  <p className="text-xs text-muted-foreground">Sequence steps due</p>
                  <p className="text-lg font-semibold">{upcomingWork.length}</p>
                </div>
              </div>

              {aiRecommendations.length === 0 ? (
                <div className={dashboardEmptyClass}>
                  No recommendations right now. Keep logging activity and AI will surface next
                  steps.
                </div>
              ) : (
                <div className="space-y-3">
                  {aiRecommendations.map((recommendation) => (
                    <div key={recommendation.id} className={cn(dashboardInsetClass, "space-y-2")}>
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{recommendation.title}</p>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setDismissedRecommendationIds((prev) => {
                              const next = new Set(prev);
                              next.add(recommendation.id);
                              return next;
                            })
                          }
                          aria-label="Dismiss recommendation"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <details className="text-sm text-muted-foreground">
                        <summary className="cursor-pointer list-none inline-flex items-center gap-1 hover:text-foreground">
                          Explain why
                        </summary>
                        <p className="pt-2">{recommendation.why}</p>
                      </details>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={recommendation.actionHref}>{recommendation.actionLabel}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn("xl:col-span-4", dashboardCardClass)}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Today / Overdue</CardTitle>
                <CardDescription>Follow-ups and tasks across deals and contacts.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/activities">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activitiesQuery.isError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn&apos;t load activities</AlertTitle>
                  <AlertDescription>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void activitiesQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <Tabs value={workTab} onValueChange={(value) => setWorkTab(value as WorkTab)}>
                  <TabsList className="grid w-full grid-cols-3 bg-muted/70 dark:bg-muted/35">
                    <TabsTrigger value="today">Today</TabsTrigger>
                    <TabsTrigger value="overdue">Overdue</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  </TabsList>

                  <div className="pt-3 space-y-3">
                    {currentWorkItems.length === 0 ? (
                      <div className={dashboardEmptyClass}>No items in this queue.</div>
                    ) : (
                      currentWorkItems.slice(0, 6).map(({ activity, dueDate }) => {
                        const relatedDeal = activity.dealId ? dealById.get(activity.dealId) : null;
                        const priorityVariant = dueDate < now ? "warning" : "muted";
                        return (
                          <div key={activity.id} className={cn(dashboardInsetClass, "space-y-2")}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{activity.type}</Badge>
                                <Badge variant={priorityVariant}>
                                  {dueDate < now ? "High" : "Medium"}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(dueDate.toISOString(), locale)}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{activity.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {relatedDeal
                                ? relatedDeal.title
                                : activity.partyId
                                  ? `Contact ${activity.partyId}`
                                  : "Unlinked"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteActivity(activity.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Complete
                              </Button>
                              <Button size="sm" variant="ghost" asChild>
                                <Link to="/crm/activities/new">Snooze</Link>
                              </Button>
                              <Button size="sm" variant="ghost" asChild>
                                <Link
                                  to={
                                    activity.dealId
                                      ? `/crm/deals/${activity.dealId}`
                                      : "/crm/activities"
                                  }
                                >
                                  Open
                                </Link>
                              </Button>
                              <Button size="sm" variant="ghost" asChild>
                                <Link
                                  to={`/crm/activities/new${activity.dealId ? `?dealId=${activity.dealId}` : ""}`}
                                >
                                  Quick note
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card className={cn("xl:col-span-7", dashboardCardClass)}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Pipeline Snapshot</CardTitle>
                <CardDescription>Stage coverage and at-risk deals.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/crm/deals">Open pipeline</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/crm/deals/new">Create deal</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {dealsQuery.isError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn&apos;t load pipeline data</AlertTitle>
                  <AlertDescription>
                    <Button variant="outline" size="sm" onClick={() => void dealsQuery.refetch()}>
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pipelineByStage.map((stage) => (
                      <div key={stage.stageId} className={dashboardInsetClass}>
                        <p className="text-xs text-muted-foreground">{stage.stageName}</p>
                        <p className="text-base font-semibold">{stage.count} deals</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(stage.valueCents, locale)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">At risk deals</p>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/crm/activities/new">Bulk create follow-ups</Link>
                      </Button>
                    </div>
                    {atRiskDeals.length === 0 ? (
                      <div className={cn(dashboardEmptyClass, "p-3")}>
                        No at-risk deals for the selected filters.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {atRiskDeals.map(({ deal, reasons, lastActivity }) => (
                          <div
                            key={deal.id}
                            className={cn(
                              dashboardInsetInteractiveClass,
                              "flex items-center justify-between gap-3"
                            )}
                          >
                            <div>
                              <p className="text-sm font-medium">{deal.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {reasons.includes("no_recent_activity") && "No recent activity"}
                                {reasons.includes("close_date_passed") && " • Close date passed"}
                                {reasons.includes("stalled") && " • Stalled"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Last touch:{" "}
                                {lastActivity
                                  ? formatDate(lastActivity.toISOString(), locale)
                                  : "Never"}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/crm/deals/${deal.id}`}>
                                Open
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className={cn("xl:col-span-5", dashboardCardClass)}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Deals Closing Soon</CardTitle>
                <CardDescription>Open deals with close dates in the next 30 days.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/deals">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {dealsQuery.isError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn&apos;t load deals</AlertTitle>
                </Alert>
              ) : dealsClosingSoon.length === 0 ? (
                <div className={dashboardEmptyClass}>No deals closing in the next 30 days.</div>
              ) : (
                <div className="space-y-2">
                  {dealsClosingSoon.map((deal) => (
                    <div
                      key={deal.id}
                      className={cn(
                        dashboardInsetInteractiveClass,
                        "flex items-center justify-between gap-3"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(deal.amountCents ?? 0, locale)} ·{" "}
                          {stageNameById.get(deal.stageId) ?? deal.stageId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Close{" "}
                          {deal.expectedCloseDate
                            ? formatDate(deal.expectedCloseDate, locale)
                            : "Not set"}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/crm/deals/${deal.id}`}>Open</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn("xl:col-span-4", dashboardCardClass)}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>New &amp; Unworked Leads</CardTitle>
                <CardDescription>Fresh leads with no reply yet.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/leads">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {leadsQuery.isError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn&apos;t load leads</AlertTitle>
                  <AlertDescription>
                    <Button variant="outline" size="sm" onClick={() => void leadsQuery.refetch()}>
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : newUnworkedLeads.length === 0 ? (
                <div className={dashboardEmptyClass}>No unworked leads in this date range.</div>
              ) : (
                <div className="space-y-2">
                  {newUnworkedLeads.map((lead) => (
                    <div key={lead.id} className={cn(dashboardInsetInteractiveClass, "space-y-1")}>
                      <p className="text-sm font-medium">
                        {`${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() ||
                          lead.companyName ||
                          "Unnamed lead"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.email ?? lead.phone ?? "No contact info"}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="muted">{lead.source}</Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/crm/leads/${lead.id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={cn("xl:col-span-4", dashboardCardClass)}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Sequences Health</CardTitle>
                <CardDescription>Replies, throughput, and due sequence actions.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/sequences">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sequencesQuery.isError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn&apos;t load sequences</AlertTitle>
                  <AlertDescription>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void sequencesQuery.refetch()}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={dashboardInsetClass}>
                      <p className="text-xs text-muted-foreground">Active sequences</p>
                      <p className="text-lg font-semibold">{sequences.length}</p>
                    </div>
                    <div className={dashboardInsetClass}>
                      <p className="text-xs text-muted-foreground">Replies (7d)</p>
                      <p className="text-lg font-semibold">
                        {sequenceCommunications7d.inboundReplies}
                      </p>
                    </div>
                    <div className={dashboardInsetClass}>
                      <p className="text-xs text-muted-foreground">Reply rate</p>
                      <p className="text-lg font-semibold">{sequenceCommunications7d.replyRate}%</p>
                    </div>
                  </div>

                  {isEmailHealthWarning ? (
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertTitle>Email warnings detected</AlertTitle>
                      <AlertDescription className="flex items-center justify-between gap-2">
                        <span>Reply rate is below 10% this week.</span>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/crm/settings/email">Review settings</Link>
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className={cn(dashboardEmptyClass, "p-3")}>
                      Sequence delivery health looks stable.
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className={cn("xl:col-span-4", dashboardCardClass)}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Recent Activity Feed</CardTitle>
                <CardDescription>Latest CRM updates and interactions.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/crm/activities">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activitiesQuery.isError ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Couldn&apos;t load activity feed</AlertTitle>
                </Alert>
              ) : recentActivityFeed.length === 0 ? (
                <div className={dashboardEmptyClass}>No activity yet.</div>
              ) : (
                <div className="space-y-2">
                  {recentActivityFeed.map((activity) => (
                    <div key={activity.id} className={dashboardInsetInteractiveClass}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{activity.type}</Badge>
                          <span className="text-xs text-muted-foreground">{activity.status}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(activity.createdAt, locale)}
                        </span>
                      </div>
                      <p className="text-sm font-medium mt-1">{activity.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.dealId
                          ? `Deal ${activity.dealId}`
                          : activity.partyId
                            ? `Contact ${activity.partyId}`
                            : "General"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CircleDashed className="h-3.5 w-3.5" />
        <span>
          Filters applied: {filteredDeals.length} deals, {filteredLeads.length} leads.
        </span>
        <Clock3 className="h-3.5 w-3.5 ml-2" />
        <span>Last refresh: {formatDateTime(new Date().toISOString(), locale)}</span>
      </div>
    </div>
  );
}
