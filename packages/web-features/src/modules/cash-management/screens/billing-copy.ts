type LocaleKey = "en" | "de" | "vi";

export type BillingCopy = {
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

export const billingCopy: Record<LocaleKey, BillingCopy> = {
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
