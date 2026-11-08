import {
  DailyWork,
  createTasksClient,
  RecurringChecklists,
  createChecklistsClient,
} from "@corely/web-features/modules/tasks";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type {
  ListWorkspacesOutput,
  WorkspaceDto,
  OpenBukStudio,
  OpenBukSetupDraft,
  OpenBukSetupDraftResponse,
  OpenBukStudioResponse,
  OpenBukAppointment,
} from "@corely/contracts";
import { api, auth, storage } from "../../shared/api";
import { bookingLink } from "../../shared/brand";
import { LanguageSwitch, useLanguage } from "../../shared/i18n";
import { Logo, Field, Loading, ErrorMessage, localDay, time } from "../../shared/ui";
import { StaffInvitations } from "./staff-invitations";
import { SetupForm } from "./setup-form";
export default function StudioPage() {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const templatesRoute = location.pathname.endsWith("/tasks/templates");
  const tasksRoute = location.pathname.endsWith("/tasks") || templatesRoute;
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const checklistsClient = useMemo(
    () => createChecklistsClient(api, workspace?.id ?? ""),
    [workspace?.id]
  );
  const tasksClient = useMemo(() => createTasksClient(api, workspace?.id ?? ""), [workspace?.id]);
  const [studio, setStudio] = useState<OpenBukStudio | null>(null);
  const [draft, setDraft] = useState<OpenBukSetupDraft | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState("");
  const [appointments, setAppointments] = useState<OpenBukAppointment[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setFailed(false);
      await auth.loadStoredTokens();
      if (!auth.getAccessToken()) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const result = await api.request<ListWorkspacesOutput>(
          "/workspaces",
          {},
          { workspaceScope: "none" }
        );
        const selected = await storage.getActiveWorkspaceId();
        const chosen =
          result.workspaces.find((w) => w.id === selected) ??
          (result.workspaces.length === 1 ? result.workspaces[0] : null);
        if (!active) {
          return;
        }
        setWorkspaces(result.workspaces);
        setWorkspace(chosen);
        if (chosen) {
          await storage.setActiveWorkspaceId(chosen.id);
          if (!active) {
            return;
          }
          if (tasksRoute) {
            // Daily Work depends on workspace authority and Tasks/People, not Booking setup.
            setStudio(null);
            setDraft(null);
            setCanManage(false);
            return;
          }
          const data = await api.request<OpenBukStudioResponse>("/openbuk/studio");
          const setup = data.canManage
            ? await api.request<OpenBukSetupDraftResponse>("/openbuk/setup")
            : null;
          if (active) {
            setDraft(setup?.draft ?? null);
            setCanManage(data.canManage);
            setStudio(data.studio);
            setDay(localDay(data.studio?.timezone ?? "UTC"));
          }
        }
      } catch {
        if (active) {
          setFailed(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [navigate, tasksRoute]);
  useEffect(() => {
    if (!studio || !day || !canManage || tasksRoute) {
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setFailed(false);
    setAppointments([]);
    api
      .request<{ appointments: OpenBukAppointment[] }>(
        `/openbuk/bookings?day=${day}`,
        {},
        { signal: controller.signal }
      )
      .then((r) => {
        if (!controller.signal.aborted) {
          setAppointments(r.appointments);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBusy(false);
        }
      });
    return () => controller.abort();
  }, [studio, day, canManage, tasksRoute]);
  const setup =
    !studio ||
    !workspace?.publicEnabled ||
    !workspace?.publicModules?.booking ||
    location.pathname.endsWith("/settings");
  return (
    <div className="studio-layout">
      <aside className="sidebar">
        <Logo />
        <p className="eyebrow">{studio?.studioName ?? t("studio")}</p>
        <nav>
          {(
            [
              ["/app", "today", "◷"],
              ["/app/calendar", "calendar", "▦"],
              ["/app/tasks", "dailyWork", "✓"],
              ["/app/settings", "settings", "⚙"],
            ] as const
          ).map(([href, key, icon]) => (
            <Link
              className={
                location.pathname === href || (href === "/app/tasks" && tasksRoute) ? "active" : ""
              }
              key={href}
              to={href}
            >
              <span aria-hidden="true">{icon}</span>
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <LanguageSwitch />
          <button
            className="text-button"
            onClick={() => {
              void auth.clearTokens().then(() => navigate("/login"));
            }}
          >
            {t("logout")}
          </button>
        </div>
      </aside>
      <main className="studio-main">
        {loading ? (
          <Loading />
        ) : failed && !studio ? (
          <>
            <ErrorMessage />
            <button className="button" onClick={() => window.location.reload()}>
              {t("retry")}
            </button>
          </>
        ) : !workspace && workspaces.length > 0 ? (
          <section>
            <h1>{t("chooseStudio")}</h1>
            {workspaces.map((w) => (
              <button
                className="workspace-option"
                key={w.id}
                onClick={() => {
                  void storage.setActiveWorkspaceId(w.id).then(() => window.location.reload());
                }}
              >
                {w.name} ↗
              </button>
            ))}
          </section>
        ) : workspace && tasksRoute ? (
          templatesRoute ? (
            <RecurringChecklists
              key={workspace.id}
              client={checklistsClient}
              tasksClient={tasksClient}
              locale={locale}
              backHref="/app/tasks"
            />
          ) : (
            <DailyWork
              key={workspace.id}
              client={tasksClient}
              locale={locale}
              templatesHref="/app/tasks/templates"
            />
          )
        ) : workspace && !canManage ? (
          <section>
            <h1>{t("staffJoined")}</h1>
            <p>{t("staffAccess")}</p>
          </section>
        ) : setup ? (
          <>
            <SetupForm
              draft={draft}
              onDraftSaved={setDraft}
              workspace={workspace}
              studio={studio}
              onWorkspace={(next) => {
                setWorkspace(next);
                setCanManage(true);
              }}
              onSaved={(s) => {
                setDraft(null);
                setStudio(s);
                setDay(localDay(s.timezone));
                navigate("/app");
              }}
            />
            {workspace ? <StaffInvitations workspaceId={workspace.id} /> : null}
          </>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <p className="eyebrow">{studio.studioName}</p>
                <h1>{t(location.pathname.endsWith("/calendar") ? "calendar" : "today")}</h1>
                <p className="muted">{t("scheduleIntro")}</p>
              </div>
              <Field label={t("date")}>
                <input
                  type="date"
                  value={day}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDay(e.target.value);
                    }
                  }}
                />
              </Field>
            </div>
            <div className="live-card">
              <div>
                <span className="status-dot" />
                <strong>{t("live")}</strong>
                <p>{bookingLink(studio.slug)}</p>
              </div>
              <div className="actions">
                <button
                  className="button secondary small"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(bookingLink(studio.slug))
                      .then(() => setCopied(true));
                  }}
                >
                  {t(copied ? "copied" : "copy")}
                </button>
                <a
                  className="button small"
                  href={bookingLink(studio.slug)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("openBooking")} ↗
                </a>
              </div>
            </div>
            <section className="schedule">
              <div className="schedule-header">
                <h2>{t("booked")}</h2>
                <span className="count">{appointments.length}</span>
                <span className="muted">{studio.timezone}</span>
              </div>
              {busy ? (
                <Loading />
              ) : failed ? (
                <ErrorMessage />
              ) : appointments.length === 0 ? (
                <div className="empty">
                  <span aria-hidden="true">✳</span>
                  <h2>{t("empty")}</h2>
                  <p className="muted">{t("emptyBody")}</p>
                </div>
              ) : (
                <div className="appointments">
                  {appointments.map((a) => (
                    <article key={a.id} className="appointment">
                      <div className="appointment-time">
                        <strong>{time(a.startAt, a.timezone, locale)}</strong>
                        <small>{time(a.endAt, a.timezone, locale)}</small>
                      </div>
                      <div className="appointment-person">
                        <h3>{a.customerName}</h3>
                        <p>
                          {a.serviceName} · {a.staffName}
                        </p>
                      </div>
                      <span className="badge">
                        {t(
                          a.status === "CANCELLED"
                            ? "cancelled"
                            : a.status === "NO_SHOW"
                              ? "noShow"
                              : a.status === "COMPLETED"
                                ? "completed"
                                : "confirmed"
                        )}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
