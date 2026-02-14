import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth";
import { useTranslation } from "react-i18next";
import { portalApiRequest } from "../lib/portal-api-client";
import { Card, CardContent, Button, Badge, Skeleton } from "@corely/ui";
import {
  BookOpen,
  FileText,
  Download,
  LogOut,
  User as UserIcon,
  Calendar,
  ExternalLink,
} from "lucide-react";

type PortalStudent = {
  id: string;
  displayName?: string;
  name?: string;
};

type PortalProfile = {
  students?: PortalStudent[];
};

type PortalMaterial = {
  id: string;
  title?: string;
  createdAt: string;
  linkedTo?: string;
  studentId?: string;
};

type PortalInvoice = {
  id: string;
  number: string | null;
  status: string;
  invoiceDate: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  createdAt: string;
  currency: string;
  totals: {
    totalCents: number;
    dueCents: number;
  };
};

const INVOICE_STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-700/40 text-slate-200 border-slate-600",
  ISSUED: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  SENT: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  PAID: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  CANCELED: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

const formatMoney = (cents: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
};

const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString();
};

export const PortalDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, accessToken, logout } = useAuthStore();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [materials, setMaterials] = useState<PortalMaterial[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const loadStudentData = useCallback(
    async (studentId: string) => {
      const [materialsResult, invoicesResult] = await Promise.allSettled([
        portalApiRequest<{ items: PortalMaterial[] }>({
          url: `/portal/students/${studentId}/materials`,
          accessToken,
        }),
        portalApiRequest<{ items: PortalInvoice[] }>({
          url: `/portal/students/${studentId}/invoices`,
          accessToken,
        }),
      ]);

      if (materialsResult.status === "fulfilled") {
        setMaterials(materialsResult.value?.items ?? []);
      } else {
        setMaterials([]);
      }

      if (invoicesResult.status === "fulfilled") {
        setInvoices(invoicesResult.value?.items ?? []);
      } else {
        setInvoices([]);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const me = await portalApiRequest<PortalProfile>({
          url: "/portal/me",
          accessToken,
        });
        setProfile(me);

        if (me.students?.length) {
          const studentId = me.students[0].id;
          setSelectedStudentId(studentId);
          await loadStudentData(studentId);
        } else {
          setMaterials([]);
          setInvoices([]);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      void fetchData();
    }
  }, [accessToken, loadStudentData]);

  const handleDownload = async (docId: string, studentId: string) => {
    try {
      const res = await portalApiRequest<{ url: string }>({
        url: `/portal/materials/${docId}/download-url?studentId=${studentId}`,
        accessToken,
      });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      alert(
        t("portal.dashboard.materials.download_failed", {
          defaultValue: "Failed to get download URL",
        })
      );
    }
  };

  const handleInvoiceDownload = async (invoiceId: string, studentId: string) => {
    try {
      const res = await portalApiRequest<{ url: string }>({
        url: `/portal/invoices/${invoiceId}/download-url?studentId=${studentId}`,
        accessToken,
      });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      alert(
        t("portal.dashboard.invoices.download_failed", {
          defaultValue: "Failed to get invoice download link",
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* Header */}
      <nav className="border-b border-white/5 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <BookOpen className="w-6 h-6 text-slate-900" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block">
              Kerniflow{" "}
              <span className="text-teal-400 font-medium text-sm ml-1 px-2 py-0.5 rounded-full bg-teal-400/10 border border-teal-400/20 uppercase tracking-widest">
                {t("portal.title")}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 mr-2 px-2 py-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => {
                  void i18n.changeLanguage("en");
                  localStorage.setItem("Corely Portal-language", "en");
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${i18n.language === "en" ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                EN
              </button>
              <button
                onClick={() => {
                  void i18n.changeLanguage("vi");
                  localStorage.setItem("Corely Portal-language", "vi");
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${i18n.language === "vi" ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                VI
              </button>
              <button
                onClick={() => {
                  void i18n.changeLanguage("de");
                  localStorage.setItem("Corely Portal-language", "de");
                }}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${i18n.language === "de" ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                DE
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <UserIcon className="w-4 h-4 text-teal-400" />
              <span className="text-sm font-semibold hidden xs:inline-block">
                {user?.displayName}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="rounded-2xl hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: Profile & Students */}
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl">
              <div className="h-32 bg-gradient-to-br from-teal-500/20 via-emerald-500/20 to-slate-900 border-b border-white/5"></div>
              <CardContent className="-mt-16 space-y-6 pb-8">
                <div className="flex flex-col items-center text-center px-4">
                  <div className="w-28 h-28 rounded-3xl bg-slate-800 border-4 border-slate-950 flex items-center justify-center text-4xl shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-transparent"></div>
                    👋
                  </div>
                  <div className="mt-4">
                    <h2 className="text-2xl font-black tracking-tight">{user?.displayName}</h2>
                    <p className="text-slate-400 text-sm font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-6 px-4 border-t border-white/5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {user?.role === "GUARDIAN"
                      ? t("portal.dashboard.students.select")
                      : t("portal.dashboard.students.linked")}
                  </h3>
                  <div className="space-y-2">
                    {loading ? (
                      <Skeleton className="h-14 w-full rounded-2xl bg-white/5" />
                    ) : profile?.students?.length ? (
                      profile.students.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            void loadStudentData(s.id);
                          }}
                          className={`group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 w-full text-left ${
                            selectedStudentId === s.id
                              ? "bg-teal-500/10 border-teal-500/30"
                              : "bg-white/5 border-white/5 hover:border-teal-500/30 hover:bg-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                              <UserIcon className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold">{s.displayName ?? s.name}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-black transition-all ${
                              selectedStudentId === s.id
                                ? "bg-teal-400 text-slate-900 border-teal-400"
                                : "border-teal-500/30 text-teal-400 group-hover:bg-teal-400 group-hover:text-slate-900"
                            }`}
                          >
                            {selectedStudentId === s.id
                              ? t("portal.dashboard.students.viewing")
                              : t("portal.dashboard.students.student")}
                          </Badge>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">
                        {t("portal.dashboard.students.none")}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-white/10 shadow-2xl p-8 space-y-5 text-center backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Calendar className="w-32 h-32 -mr-8 -mt-8" />
              </div>
              <div className="inline-flex p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 mb-2">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="relative">
                <h3 className="text-xl font-black">{t("portal.dashboard.sessions.title")}</h3>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed font-medium">
                  {t("portal.dashboard.sessions.subtitle")}
                </p>
              </div>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-100 rounded-2xl py-6 font-bold tracking-tight shadow-xl">
                {t("portal.dashboard.sessions.open")}
              </Button>
            </Card>
          </div>

          {/* Main: Materials & Invoices */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-6">
              <div className="flex items-end justify-between px-2">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black flex items-center gap-4 tracking-tighter">
                    {t("portal.dashboard.materials.title")}
                  </h2>
                  <p className="text-slate-400 font-medium">
                    {t("portal.dashboard.materials.subtitle")}
                  </p>
                </div>
                <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 px-4 py-1.5 rounded-full font-black text-xs">
                  {t("portal.dashboard.materials.items", { count: materials.length })}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-48 w-full rounded-3xl bg-white/5 border border-white/5"
                      />
                    ))
                ) : materials.length ? (
                  materials.map((m) => (
                    <Card
                      key={m.id}
                      className="bg-slate-900/50 border-white/10 hover:border-teal-500/50 transition-all duration-500 group overflow-hidden shadow-2xl hover:shadow-teal-500/10 backdrop-blur-xl rounded-[2rem]"
                    >
                      <CardContent className="p-0">
                        <div className="p-7 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="p-4 rounded-2xl bg-white/5 group-hover:bg-teal-500/20 group-hover:scale-110 transition-all duration-500 ring-1 ring-white/10">
                              <FileText className="w-7 h-7 text-slate-400 group-hover:text-teal-400" />
                            </div>
                            <Badge
                              variant="secondary"
                              className="bg-white/5 text-slate-400 group-hover:bg-teal-400/10 group-hover:text-teal-400 border border-white/5 transition-all text-[10px] font-black"
                            >
                              {m.linkedTo?.replace("_", " ") || "UNKNOWN"}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xl font-black text-slate-100 group-hover:text-teal-400 transition-colors truncate tracking-tight">
                              {m.title || "Untitled"}
                            </h4>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                {t("portal.dashboard.materials.added")} {formatDate(m.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/5 p-4 sm:p-5 bg-white/5 flex items-center justify-between">
                          <div className="text-[10px] font-black text-slate-500 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20">
                            <div
                              className={`w-2 h-2 rounded-full ${m.studentId ? "bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"}`}
                            ></div>
                            {m.studentId
                              ? t("portal.dashboard.materials.personal")
                              : t("portal.dashboard.materials.class_group")}
                          </div>
                          <Button
                            size="sm"
                            className="h-10 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl font-black px-5 shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
                            onClick={() =>
                              selectedStudentId && handleDownload(m.id, selectedStudentId)
                            }
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {t("portal.dashboard.materials.getFile")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-24 text-center space-y-6 rounded-[3rem] border-2 border-dashed border-white/10 bg-white/5">
                    <div className="inline-flex p-6 rounded-[2rem] bg-white/5 text-slate-700">
                      <BookOpen className="w-16 h-16" />
                    </div>
                    <div className="max-w-xs mx-auto space-y-2">
                      <h3 className="text-2xl font-black tracking-tight">
                        {t("portal.dashboard.materials.empty.title")}
                      </h3>
                      <p className="text-slate-500 font-medium">
                        {t("portal.dashboard.materials.empty.subtitle")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-end justify-between px-2">
                <div className="space-y-1">
                  <h2 className="text-4xl font-black flex items-center gap-4 tracking-tighter">
                    {t("portal.dashboard.invoices.title")}
                  </h2>
                  <p className="text-slate-400 font-medium">
                    {t("portal.dashboard.invoices.subtitle")}
                  </p>
                </div>
                <Badge className="bg-sky-500/10 text-sky-300 border-sky-500/20 px-4 py-1.5 rounded-full font-black text-xs">
                  {t("portal.dashboard.invoices.items", { count: invoices.length })}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  Array(2)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton
                        key={i}
                        className="h-48 w-full rounded-3xl bg-white/5 border border-white/5"
                      />
                    ))
                ) : invoices.length ? (
                  invoices.map((invoice) => (
                    <Card
                      key={invoice.id}
                      className="bg-slate-900/50 border-white/10 hover:border-sky-500/50 transition-all duration-500 group overflow-hidden shadow-2xl hover:shadow-sky-500/10 backdrop-blur-xl rounded-[2rem]"
                    >
                      <CardContent className="p-0">
                        <div className="p-7 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="p-4 rounded-2xl bg-white/5 group-hover:bg-sky-500/20 group-hover:scale-110 transition-all duration-500 ring-1 ring-white/10">
                              <FileText className="w-7 h-7 text-slate-400 group-hover:text-sky-300" />
                            </div>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-black border ${INVOICE_STATUS_STYLES[invoice.status] ?? "bg-white/5 text-slate-300 border-white/20"}`}
                            >
                              {invoice.status}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-xl font-black text-slate-100 group-hover:text-sky-300 transition-colors truncate tracking-tight">
                              {invoice.number ||
                                `${t("portal.dashboard.invoices.invoice")} ${invoice.id.slice(0, 8)}`}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                              <span>
                                {t("portal.dashboard.invoices.issued")}:{" "}
                                {formatDate(invoice.issuedAt ?? invoice.invoiceDate)}
                              </span>
                              <span>
                                {t("portal.dashboard.invoices.due")}: {formatDate(invoice.dueDate)}
                              </span>
                            </div>
                            <div className="text-sm font-black text-slate-100">
                              {t("portal.dashboard.invoices.amount_due")}:{" "}
                              {formatMoney(invoice.totals.dueCents, invoice.currency)}
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-white/5 p-4 sm:p-5 bg-white/5 flex items-center justify-end">
                          <Button
                            size="sm"
                            className="h-10 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-2xl font-black px-5 shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
                            onClick={() =>
                              selectedStudentId &&
                              handleInvoiceDownload(invoice.id, selectedStudentId)
                            }
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            {t("portal.dashboard.invoices.download")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center space-y-4 rounded-[2rem] border border-dashed border-white/10 bg-white/5">
                    <h3 className="text-xl font-black tracking-tight">
                      {t("portal.dashboard.invoices.empty.title")}
                    </h3>
                    <p className="text-slate-500 font-medium max-w-md mx-auto">
                      {t("portal.dashboard.invoices.empty.subtitle")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
