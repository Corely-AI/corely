import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Progress,
  Skeleton,
  cn,
} from "@corely/ui";
import type { BillingPlanCode, BillingProductKey } from "@corely/contracts";
import { CashManagementBillingFeatureKeys, CashManagementProductKey } from "@corely/contracts";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Globe2,
  Loader2,
  LockKeyhole,
  Receipt,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type LocaleKey = "en" | "de" | "vi";

type BillingCopy = {
  title: string;
  subtitle: string;
  currentPlan: string;
  planStatus: string;
  billingActions: string;
  usage: string;
  planCatalog: string;
  manageBilling: string;
  upgradePlan: string;
  currentPlanBadge: string;
  noLimit: string;
  billedMonthly: string;
  active: string;
  period: string;
  unavailable: string;
  loading: string;
  loadFailed: string;
  openPortalDescription: string;
  checkoutDescription: string;
  featureAccess: string;
  recommendedTitle: string;
  recommendedDescription: string;
  startTrial: string;
  trialTitle: string;
  noCardRequired: string;
  trialDescription: string;
  trialActive: (daysRemaining: number) => string;
  trialExpiring: (daysRemaining: number) => string;
  trialExpired: string;
  trialExpiredDescription: string;
  upgradeNow: string;
  afterTrialTitle: string;
  afterTrialDescription: string;
  trialStarted: string;
  trialStartFailed: string;
  usageLabels: {
    usedOf: (used: number, limit: string) => string;
    currentPeriod: string;
  };
  featureLabels: {
    maxLocations: string;
    maxEntriesPerMonth: string;
    maxReceiptsPerMonth: string;
    canExport: string;
    dailyClosing: string;
    aiAssistant: string;
    multilingualAiHelp: string;
    issueDetection: string;
    closingGuidance: string;
    teamAccess: string;
    consolidatedOverview: string;
  };
};

const billingCopy: Record<LocaleKey, BillingCopy> = {
  en: {
    title: "Billing and subscription",
    subtitle: "Current plan, cash-book usage, and the next upgrade path for this salon.",
    currentPlan: "Current plan",
    planStatus: "Plan status",
    billingActions: "Billing actions",
    usage: "Usage this period",
    planCatalog: "Available plans",
    manageBilling: "Manage billing",
    upgradePlan: "Upgrade plan",
    currentPlanBadge: "Current plan",
    noLimit: "Unlimited",
    billedMonthly: "Billed monthly",
    active: "Active",
    period: "Current period",
    unavailable: "Not available on this plan",
    loading: "Loading billing status...",
    loadFailed: "Unable to load billing right now.",
    openPortalDescription:
      "Open the hosted customer portal to update payment details or manage billing.",
    checkoutDescription:
      "Upgrade through the hosted Stripe checkout. Corely keeps the plan and usage logic.",
    featureAccess: "Feature access",
    recommendedTitle: "Need more headroom?",
    recommendedDescription:
      "Upgrade when your salon needs export, AI help, or multiple locations. Billing stays portable inside Corely.",
    startTrial: "Start 30-day trial",
    trialTitle: "Start your 30-day full access trial",
    noCardRequired: "No card required",
    trialDescription:
      "Your workspace gets full Multi-location access for 30 days, then falls back to Free unless you subscribe.",
    trialActive: (daysRemaining) =>
      `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left in your full-access trial.`,
    trialExpiring: (daysRemaining) =>
      `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left. Pick a plan now to avoid losing export, AI, and multi-location access.`,
    trialExpired: "Your full-access trial has ended",
    trialExpiredDescription:
      "Your workspace is now on Free. Historical data stays visible, but export, AI, and extra locations are locked until you subscribe.",
    upgradeNow: "Choose a plan",
    afterTrialTitle: "What changes after the trial",
    afterTrialDescription:
      "Corely keeps all historical data. After 30 days, your workspace moves to Free and new usage follows the Free monthly limits.",
    trialStarted: "Trial started",
    trialStartFailed: "Unable to start the trial right now.",
    usageLabels: {
      usedOf: (used, limit) => `${used} used of ${limit}`,
      currentPeriod: "Current period",
    },
    featureLabels: {
      maxLocations: "Locations",
      maxEntriesPerMonth: "Cash entries",
      maxReceiptsPerMonth: "Receipts",
      canExport: "Monthly export",
      dailyClosing: "Daily closing",
      aiAssistant: "AI assistant",
      multilingualAiHelp: "Multilingual AI help",
      issueDetection: "Issue detection",
      closingGuidance: "Closing guidance",
      teamAccess: "Team access",
      consolidatedOverview: "Consolidated overview",
    },
  },
  de: {
    title: "Abonnement und Abrechnung",
    subtitle: "Aktueller Tarif, Kassenbuch-Nutzung und naechster Upgrade-Schritt fuer den Salon.",
    currentPlan: "Aktueller Tarif",
    planStatus: "Tarifstatus",
    billingActions: "Abrechnungsaktionen",
    usage: "Nutzung in diesem Zeitraum",
    planCatalog: "Verfuegbare Tarife",
    manageBilling: "Abrechnung verwalten",
    upgradePlan: "Tarif upgraden",
    currentPlanBadge: "Aktueller Tarif",
    noLimit: "Unbegrenzt",
    billedMonthly: "Monatlich abgerechnet",
    active: "Aktiv",
    period: "Aktueller Zeitraum",
    unavailable: "In diesem Tarif nicht verfuegbar",
    loading: "Lade Abrechnungsstatus...",
    loadFailed: "Abrechnung konnte gerade nicht geladen werden.",
    openPortalDescription:
      "Oeffne das gehostete Kundenportal, um Zahlungsdaten oder das Abo zu verwalten.",
    checkoutDescription:
      "Upgrade ueber das gehostete Stripe-Checkout. Corely behaelt Tarif- und Nutzungslogik intern.",
    featureAccess: "Funktionszugriff",
    recommendedTitle: "Mehr Spielraum noetig?",
    recommendedDescription:
      "Upgrade, wenn dein Salon Export, KI-Hilfe oder mehrere Standorte braucht.",
    startTrial: "30-Tage-Test starten",
    trialTitle: "Starte deine 30-taegige Vollzugriffs-Testphase",
    noCardRequired: "Keine Karte erforderlich",
    trialDescription:
      "Dein Workspace erhaelt 30 Tage lang vollen Multi-Location-Zugriff und faellt danach ohne Abo auf Free zurueck.",
    trialActive: (daysRemaining) =>
      `Noch ${daysRemaining} Tag${daysRemaining === 1 ? "" : "e"} voller Zugriff in der Testphase.`,
    trialExpiring: (daysRemaining) =>
      `Noch ${daysRemaining} Tag${daysRemaining === 1 ? "" : "e"}. Waehle jetzt einen Tarif, damit Export, KI und mehrere Standorte aktiv bleiben.`,
    trialExpired: "Deine Vollzugriffs-Testphase ist beendet",
    trialExpiredDescription:
      "Dein Workspace laeuft jetzt im Free-Tarif. Historische Daten bleiben sichtbar, aber Export, KI und weitere Standorte sind gesperrt, bis du abonnierst.",
    upgradeNow: "Tarif waehlen",
    afterTrialTitle: "Was sich nach der Testphase aendert",
    afterTrialDescription:
      "Corely behaelt alle historischen Daten. Nach 30 Tagen wechselt dein Workspace zu Free und neue Nutzung folgt den Free-Monatslimits.",
    trialStarted: "Testphase gestartet",
    trialStartFailed: "Die Testphase konnte gerade nicht gestartet werden.",
    usageLabels: {
      usedOf: (used, limit) => `${used} von ${limit} genutzt`,
      currentPeriod: "Aktueller Zeitraum",
    },
    featureLabels: {
      maxLocations: "Standorte",
      maxEntriesPerMonth: "Kasseneintraege",
      maxReceiptsPerMonth: "Belege",
      canExport: "Monatsexport",
      dailyClosing: "Tagesabschluss",
      aiAssistant: "KI-Assistent",
      multilingualAiHelp: "Mehrsprachige KI-Hilfe",
      issueDetection: "Problemerkennung",
      closingGuidance: "Abschluss-Hilfe",
      teamAccess: "Teamzugriff",
      consolidatedOverview: "Konsolidierte Uebersicht",
    },
  },
  vi: {
    title: "Goi va thanh toan",
    subtitle: "Goi hien tai, muc su dung so quy, va huong nang cap tiep theo cho tiem.",
    currentPlan: "Goi hien tai",
    planStatus: "Trang thai goi",
    billingActions: "Tac vu thanh toan",
    usage: "Su dung trong ky nay",
    planCatalog: "Cac goi hien co",
    manageBilling: "Quan ly thanh toan",
    upgradePlan: "Nang cap goi",
    currentPlanBadge: "Goi hien tai",
    noLimit: "Khong gioi han",
    billedMonthly: "Tinh phi hang thang",
    active: "Dang hoat dong",
    period: "Ky hien tai",
    unavailable: "Khong co trong goi nay",
    loading: "Dang tai thong tin thanh toan...",
    loadFailed: "Khong the tai thong tin thanh toan luc nay.",
    openPortalDescription: "Mo cong thanh toan de cap nhat the hoac quan ly dang ky.",
    checkoutDescription:
      "Nang cap qua Stripe Checkout duoc luu tru. Corely van giu catalog goi va logic su dung.",
    featureAccess: "Quyen truy cap tinh nang",
    recommendedTitle: "Can them gioi han?",
    recommendedDescription: "Nang cap khi tiem can xuat du lieu, tro ly AI, hoac nhieu dia diem.",
    startTrial: "Bat dau dung thu 30 ngay",
    trialTitle: "Bat dau 30 ngay dung thu day du",
    noCardRequired: "Khong can the",
    trialDescription:
      "Workspace duoc mo day du tinh nang Multi-location trong 30 ngay, sau do se tro ve goi Free neu chua dang ky.",
    trialActive: (daysRemaining) => `Con ${daysRemaining} ngay trong dung thu day du tinh nang.`,
    trialExpiring: (daysRemaining) =>
      `Con ${daysRemaining} ngay. Hay chon goi ngay bay gio de giu xuat du lieu, AI, va nhieu dia diem.`,
    trialExpired: "Dung thu day du da ket thuc",
    trialExpiredDescription:
      "Workspace hien da tro ve goi Free. Du lieu cu van duoc giu, nhung xuat du lieu, AI va dia diem bo sung da bi khoa cho toi khi dang ky.",
    upgradeNow: "Chon goi",
    afterTrialTitle: "Sau dung thu se thay doi gi",
    afterTrialDescription:
      "Corely van giu toan bo du lieu cu. Sau 30 ngay, workspace chuyen ve Free va muc su dung moi theo gioi han thang cua Free.",
    trialStarted: "Da bat dau dung thu",
    trialStartFailed: "Khong the bat dau dung thu luc nay.",
    usageLabels: {
      usedOf: (used, limit) => `Da dung ${used} / ${limit}`,
      currentPeriod: "Ky hien tai",
    },
    featureLabels: {
      maxLocations: "Dia diem",
      maxEntriesPerMonth: "But to tien mat",
      maxReceiptsPerMonth: "Hoa don",
      canExport: "Xuat thang",
      dailyClosing: "Dong so hang ngay",
      aiAssistant: "Tro ly AI",
      multilingualAiHelp: "AI da ngon ngu",
      issueDetection: "Phat hien van de",
      closingGuidance: "Huong dan dong ngay",
      teamAccess: "Truy cap nhom",
      consolidatedOverview: "Tong quan hop nhat",
    },
  },
};

const billingProductKey: BillingProductKey = CashManagementProductKey;

const planOrder: BillingPlanCode[] = [
  "free",
  "starter-monthly",
  "pro-monthly",
  "multi-location-monthly",
];

const featureIconMap = {
  [CashManagementBillingFeatureKeys.maxLocations]: Store,
  [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: CreditCard,
  [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: Receipt,
  [CashManagementBillingFeatureKeys.canExport]: CheckCircle2,
  [CashManagementBillingFeatureKeys.dailyClosing]: CheckCircle2,
  [CashManagementBillingFeatureKeys.aiAssistant]: Sparkles,
  [CashManagementBillingFeatureKeys.multilingualAiHelp]: Globe2,
  [CashManagementBillingFeatureKeys.issueDetection]: AlertTriangle,
  [CashManagementBillingFeatureKeys.closingGuidance]: LockKeyhole,
  [CashManagementBillingFeatureKeys.teamAccess]: Users,
  [CashManagementBillingFeatureKeys.consolidatedOverview]: Store,
} as const;

const featureOrder = [
  {
    key: CashManagementBillingFeatureKeys.maxLocations,
    labelKey: "maxLocations",
  },
  {
    key: CashManagementBillingFeatureKeys.maxEntriesPerMonth,
    labelKey: "maxEntriesPerMonth",
  },
  {
    key: CashManagementBillingFeatureKeys.maxReceiptsPerMonth,
    labelKey: "maxReceiptsPerMonth",
  },
  {
    key: CashManagementBillingFeatureKeys.canExport,
    labelKey: "canExport",
  },
  {
    key: CashManagementBillingFeatureKeys.dailyClosing,
    labelKey: "dailyClosing",
  },
  {
    key: CashManagementBillingFeatureKeys.aiAssistant,
    labelKey: "aiAssistant",
  },
  {
    key: CashManagementBillingFeatureKeys.multilingualAiHelp,
    labelKey: "multilingualAiHelp",
  },
  {
    key: CashManagementBillingFeatureKeys.issueDetection,
    labelKey: "issueDetection",
  },
  {
    key: CashManagementBillingFeatureKeys.closingGuidance,
    labelKey: "closingGuidance",
  },
  {
    key: CashManagementBillingFeatureKeys.teamAccess,
    labelKey: "teamAccess",
  },
  {
    key: CashManagementBillingFeatureKeys.consolidatedOverview,
    labelKey: "consolidatedOverview",
  },
] as const;

const formatPeriod = (start: string | null, end: string | null): string => {
  if (!start || !end) {
    return " - ";
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
};

const isPaidPlan = (planCode: BillingPlanCode): planCode is Exclude<BillingPlanCode, "free"> =>
  planCode !== "free";

const formatPrice = (priceCents: number, currency: string): string =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(priceCents / 100);

const featureValueToText = (
  value: boolean | number | string | null | undefined,
  noLimitLabel: string
): string => {
  if (typeof value === "boolean") {
    return value ? "Included" : "Not included";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return noLimitLabel;
  }

  return String(value);
};

export function BillingScreen() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("de")
    ? "de"
    : (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("vi")
      ? "vi"
      : "en";
  const copy = billingCopy[locale];

  const overviewQuery = useQuery({
    queryKey: ["billing", "overview", billingProductKey],
    queryFn: () => billingApi.getOverview(billingProductKey),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planCode: Exclude<BillingPlanCode, "free">) =>
      billingApi.createCheckoutSession({
        productKey: billingProductKey,
        planCode,
        successPath: "/billing?checkout=success",
        cancelPath: "/billing?checkout=cancelled",
      }),
    onSuccess: (result) => {
      window.location.assign(result.checkoutUrl);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.createPortalSession({
        productKey: billingProductKey,
        returnPath: "/billing",
      }),
    onSuccess: (result) => {
      window.location.assign(result.portalUrl);
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: () =>
      billingApi.startTrial({
        productKey: billingProductKey,
        source: "billing-page",
      }),
    onSuccess: async () => {
      toast.success(copy.trialStarted);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing", "overview", billingProductKey] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "current", billingProductKey] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : copy.trialStartFailed);
    },
  });

  const billing = overviewQuery.data?.billing;

  const orderedPlans = useMemo(
    () =>
      [...(billing?.plans ?? [])].sort(
        (left, right) => planOrder.indexOf(left.code) - planOrder.indexOf(right.code)
      ),
    [billing?.plans]
  );

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-[32rem] max-w-full" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (overviewQuery.isError || !billing) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{copy.loadFailed}</AlertTitle>
          <AlertDescription>
            {(overviewQuery.error as Error | undefined)?.message ?? copy.loadFailed}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentPlan = orderedPlans.find((plan) => plan.code === billing.subscription.planCode);
  const trial = billing.trial;
  const upgradeContext = billing.upgradeContext;
  const featureEntries = featureOrder.map((feature) => ({
    key: feature.key,
    labelKey: feature.labelKey,
    value: billing.entitlements.featureValues[feature.key],
  }));

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(235,207,160,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(130,160,196,0.16),transparent_28%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {copy.currentPlan}
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <div className="text-muted-foreground">{copy.period}</div>
              <div className="mt-1 font-medium">
                {formatPeriod(
                  billing.subscription.currentPeriodStart,
                  billing.subscription.currentPeriodEnd
                )}
              </div>
            </div>
          </div>
        </section>

        {trial.status === "active" ? (
          <Alert
            className={cn(
              "border-emerald-500/35 bg-emerald-500/8",
              trial.isExpiringSoon && "border-amber-500/35 bg-amber-500/10"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <AlertTitle>
              {trial.isExpiringSoon
                ? copy.trialExpiring(trial.daysRemaining)
                : copy.trialActive(trial.daysRemaining)}
            </AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{copy.afterTrialDescription}</span>
              <Button size="sm" asChild>
                <a href="#plan-catalog">{copy.upgradeNow}</a>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {trial.status === "expired" ? (
          <Alert className="border-amber-500/35 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{copy.trialExpired}</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{copy.trialExpiredDescription}</span>
              <Button size="sm" asChild>
                <a href="#plan-catalog">{copy.upgradeNow}</a>
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardDescription>{copy.currentPlan}</CardDescription>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-2xl">
                  {currentPlan?.name ?? billing.subscription.planCode}
                </CardTitle>
                <Badge className="rounded-full px-3 py-1">
                  {billing.subscription.status === "active"
                    ? copy.active
                    : billing.subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">{copy.planStatus}</div>
                  <div className="mt-2 text-lg font-semibold capitalize">
                    {billing.subscription.status.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                  <div className="text-sm text-muted-foreground">{copy.currentPlan}</div>
                  <div className="mt-2 text-lg font-semibold">
                    {currentPlan
                      ? `${formatPrice(currentPlan.priceCents, currentPlan.currency)} / ${copy.billedMonthly}`
                      : copy.unavailable}
                  </div>
                </div>
              </div>

              {currentPlan ? (
                <div className="rounded-2xl border border-border/60 p-4">
                  <div className="text-sm font-medium">{currentPlan.summary}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currentPlan.highlights.map((highlight) => (
                      <Badge key={highlight} variant="secondary" className="rounded-full">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="text-sm font-medium">{copy.billingActions}</div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => portalMutation.mutate()}
                    disabled={!billing.management.canManageBilling || portalMutation.isPending}
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {copy.manageBilling}
                  </Button>
                  {billing.management.canUpgrade ? (
                    <Button
                      variant="outline"
                      onClick={() => checkoutMutation.mutate("pro-monthly")}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      {copy.upgradePlan}
                    </Button>
                  ) : null}
                  {billing.management.canStartTrial ? (
                    <Button
                      variant="outline"
                      onClick={() => startTrialMutation.mutate()}
                      disabled={startTrialMutation.isPending}
                    >
                      {startTrialMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {copy.startTrial}
                    </Button>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {billing.management.canManageBilling
                    ? copy.openPortalDescription
                    : copy.checkoutDescription}
                </p>
              </div>

              {billing.management.canStartTrial ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{copy.trialTitle}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {copy.trialDescription}
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {copy.noCardRequired}
                    </Badge>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardDescription>{copy.usage}</CardDescription>
              <CardTitle className="text-2xl">{copy.usage}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {billing.usage.map((metric) => (
                <div key={metric.key} className="rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{metric.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {copy.usageLabels.usedOf(
                          metric.used,
                          metric.limit === null ? copy.noLimit : String(metric.limit)
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {metric.remaining === null ? copy.noLimit : `${metric.remaining} left`}
                    </Badge>
                  </div>
                  <Progress
                    className="mt-4 h-2"
                    value={metric.percentUsed === null ? 0 : Math.round(metric.percentUsed * 100)}
                  />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {copy.usageLabels.currentPeriod}:{" "}
                    {formatPeriod(metric.periodStart, metric.periodEnd)}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-amber-600" />
                  <div>
                    <div className="font-medium">
                      {upgradeContext.isOverEntitlement ? copy.trialExpired : copy.recommendedTitle}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {upgradeContext.isOverEntitlement
                        ? (upgradeContext.overEntitlementReasons[0]?.message ??
                          copy.trialExpiredDescription)
                        : copy.recommendedDescription}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardDescription>{copy.featureAccess}</CardDescription>
              <CardTitle className="text-2xl">{copy.featureAccess}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {featureEntries.map((feature) => {
                const Icon = featureIconMap[feature.key] ?? CheckCircle2;
                const isEnabled = typeof feature.value === "boolean" ? feature.value : true;

                return (
                  <div
                    key={feature.key}
                    className={cn(
                      "rounded-2xl border p-4",
                      isEnabled
                        ? "border-emerald-500/25 bg-emerald-500/8"
                        : "border-border/60 bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-full p-2",
                          isEnabled
                            ? "bg-emerald-500/12 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {copy.featureLabels[feature.labelKey]}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {featureValueToText(feature.value, copy.noLimit)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card id="plan-catalog" className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardDescription>{copy.planCatalog}</CardDescription>
              <CardTitle className="text-2xl">{copy.planCatalog}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {orderedPlans.map((plan) => {
                const isCurrent = plan.code === billing.subscription.planCode;
                const canUpgrade = !isCurrent && plan.code !== "free";
                const paidPlanCode = isPaidPlan(plan.code) ? plan.code : null;

                return (
                  <div
                    key={plan.code}
                    className={cn(
                      "rounded-2xl border p-5",
                      isCurrent
                        ? "border-emerald-500/30 bg-emerald-500/8"
                        : "border-border/60 bg-muted/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{plan.name}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{plan.summary}</div>
                      </div>
                      {isCurrent ? (
                        <Badge className="rounded-full">{copy.currentPlanBadge}</Badge>
                      ) : null}
                    </div>
                    <div className="mt-4 text-2xl font-semibold">
                      {plan.priceCents === 0
                        ? "€0"
                        : `${formatPrice(plan.priceCents, plan.currency)} / mo`}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      {plan.highlights.map((highlight) => (
                        <div key={highlight} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>{highlight}</span>
                        </div>
                      ))}
                    </div>
                    {canUpgrade && paidPlanCode ? (
                      <Button
                        className="mt-5 w-full"
                        variant={plan.code === "pro-monthly" ? "default" : "outline"}
                        onClick={() => checkoutMutation.mutate(paidPlanCode)}
                        disabled={checkoutMutation.isPending}
                      >
                        {copy.upgradePlan}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={startTrialMutation.isPending} onOpenChange={() => undefined}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.trialTitle}</DialogTitle>
            <DialogDescription>{copy.trialDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {copy.loading}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
