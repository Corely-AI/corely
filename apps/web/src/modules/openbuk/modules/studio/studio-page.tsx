import {
  StaffSelfService,
  createStaffJourneyClient,
} from "@corely/web-features/modules/people/self-service";
import {
  DailyWork,
  createTasksClient,
  RecurringChecklists,
  createChecklistsClient,
} from "@corely/web-features/modules/tasks";
import { getTaskCreationGuidance } from "../../../tasks/task-creation-guidance";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import type {
  OperationalExperienceId,
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
import { StudioScheduleLoading } from "./studio-schedule-loading";
import { getOperationalLinks, getStudioSection } from "./operational-navigation";
import { useOperationalPackage } from "./use-operational-package";

const navigationLabels = {
  schedule: "schedule",
  team: "team",
  "daily-work": "dailyWork",
  decisions: "decisions",
  knowledge: "knowledge",
} as const satisfies Record<OperationalExperienceId, string>;

function observeConnection(change: () => void) {
  window.addEventListener("online", change);
  window.addEventListener("offline", change);
  return () => {
    window.removeEventListener("online", change);
    window.removeEventListener("offline", change);
  };
}
export default function StudioPage({
  embedded = false,
  onWorkspaceSaved,
}: {
  embedded?: boolean;
  onWorkspaceSaved?: (workspace: WorkspaceDto) => void;
}) {
  const { t, locale } = useLanguage();
  const prefix = embedded ? "/openbuk" : "";
  const navigate = useNavigate();
  const location = useLocation();
  const section = getStudioSection(location.pathname, prefix);
  const templatesRoute = location.pathname.replace(/\/+$/, "").endsWith("/tasks/templates");
  const bookingRoute = section === "schedule" || section === "settings";
  const online = useSyncExternalStore(observeConnection, () => navigator.onLine);
  const [workspaces, setWorkspaces] = useState<WorkspaceDto[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const { state: packageState, retry: retryPackage } = useOperationalPackage(workspace?.id);
  const canOpenSettings = packageState?.status === "ready" && packageState.isWorkspaceAdmin;
  const links = getOperationalLinks(
    packageState?.status === "ready" ? packageState.configuration : null,
    prefix
  );
  const sectionLink = links.find((link) => link.id === section);
  const canOpenSection = Boolean(sectionLink);
  const [workspaceAttempt, setWorkspaceAttempt] = useState(0);
  const [scheduleAttempt, setScheduleAttempt] = useState(0);
  const staffClient = useMemo(
    () => createStaffJourneyClient(api, workspace?.id ?? ""),
    [workspace?.id]
  );
  const checklistsClient = useMemo(
    () => createChecklistsClient(api, workspace?.id ?? ""),
    [workspace?.id]
  );
  const tasksClient = useMemo(() => createTasksClient(api, workspace?.id ?? ""), [workspace?.id]);
  const [studio, setStudio] = useState<OpenBukStudio | null>(null);
  const [draft, setDraft] = useState<OpenBukSetupDraft | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [failed, setFailed] = useState(false);
  const [scheduleFailed, setScheduleFailed] = useState(false);
  const [day, setDay] = useState("");
  const [appointments, setAppointments] = useState<OpenBukAppointment[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setFailed(false);
      try {
        await auth.loadStoredTokens();
        if (!active) {
          return;
        }
        if (!auth.getAccessToken()) {
          setNeedsLogin(true);
          return;
        }
        const result = await api.request<ListWorkspacesOutput>(
          "/workspaces",
          {},
          { workspaceScope: "none", signal: controller.signal }
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
        if (!chosen || !bookingRoute) {
          setStudio(null);
          setDraft(null);
          setCanManage(false);
        }
        if (chosen) {
          await storage.setActiveWorkspaceId(chosen.id);
          if (!active) {
            return;
          }
          if (!bookingRoute) {
            return;
          }
          const request = { headers: { "X-Workspace-Id": chosen.id } };
          const options = { workspaceScope: "none", signal: controller.signal } as const;
          const data = await api.request<OpenBukStudioResponse>(
            "/openbuk/studio",
            request,
            options
          );
          const setup = data.canManage
            ? await api.request<OpenBukSetupDraftResponse>("/openbuk/setup", request, options)
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
      controller.abort();
    };
  }, [bookingRoute, workspaceAttempt]);
  useEffect(() => {
    if (
      !workspace?.id ||
      !studio ||
      !day ||
      !canManage ||
      !canOpenSection ||
      section !== "schedule"
    ) {
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setScheduleFailed(false);
    setAppointments([]);
    api
      .request<{ appointments: OpenBukAppointment[] }>(
        `/openbuk/bookings?day=${day}`,
        { headers: { "X-Workspace-Id": workspace.id } },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((r) => {
        if (!controller.signal.aborted) {
          setAppointments(r.appointments);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setScheduleFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setBusy(false);
        }
      });
    return () => controller.abort();
  }, [studio, day, canManage, canOpenSection, section, workspace?.id, scheduleAttempt]);
  const setup =
    !studio ||
    !workspace?.publicEnabled ||
    !workspace?.publicModules?.booking ||
    section === "settings";
  const setupEntry = bookingRoute && canManage && canOpenSettings && setup;
  const knownSectionUnavailable =
    section === "unknown" || (workspace && !canOpenSection && !setupEntry);

  if (needsLogin) {
    return <Navigate to={prefix + "/login"} replace />;
  }

  return (
    <div className="studio-layout">
      <aside className="sidebar">
        <Logo home={embedded ? "/openbuk" : "/"} />
        <p className="eyebrow">{studio?.studioName ?? t("studio")}</p>
        <a href="#studio-main" className="studio-skip-link">
          {t("skipToStudioContent")}
        </a>
        <nav aria-label={t("studioNavigation")}>
          {links.map(({ id, href }) => (
            <Link key={id} to={href} aria-current={section === id ? "page" : undefined}>
              {t(navigationLabels[id])}
            </Link>
          ))}
          {canOpenSettings && (
            <Link
              to={prefix + "/app/settings"}
              aria-current={section === "settings" ? "page" : undefined}
            >
              {t("settings")}
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <LanguageSwitch />
          <button
            className="text-button"
            onClick={() => {
              void auth.signout().then(() => navigate(`${prefix}/login`));
            }}
          >
            {t("logout")}
          </button>
        </div>
      </aside>
      <main id="studio-main" className="studio-main" tabIndex={-1}>
        {!online && (
          <p className="error" role="status">
            {t("studioOffline")}
          </p>
        )}
        {loading || (workspace && (!packageState || packageState.status === "loading")) ? (
          bookingRoute ? (
            <StudioScheduleLoading fullView />
          ) : (
            <Loading />
          )
        ) : failed || packageState?.status === "error" ? (
          <>
            <ErrorMessage />
            <button
              className="button"
              onClick={() => {
                if (failed) {
                  setWorkspaceAttempt((count) => count + 1);
                } else {
                  retryPackage();
                }
              }}
            >
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
        ) : workspace && bookingRoute && !canManage && packageState?.status === "ready" ? (
          <section>
            <h1>{t("staffJoined")}</h1>
            <p>{t("staffAccess")}</p>
          </section>
        ) : packageState?.status === "denied" ||
          knownSectionUnavailable ||
          (!workspace && !bookingRoute) ? (
          <section>
            <h1>{t("studioSectionUnavailable")}</h1>
            <p>{t(workspace ? "studioAccessUnavailable" : "studioChooseFirst")}</p>
            {!workspace && <Link to={prefix + "/app"}>{t("schedule")}</Link>}
          </section>
        ) : workspace && sectionLink?.ownerRoute ? (
          <Navigate
            to={{
              pathname: sectionLink.ownerRoute,
              search: new URLSearchParams({ workspaceId: workspace.id, lang: locale }).toString(),
            }}
            replace
          />
        ) : workspace && section === "team" ? (
          <StaffSelfService
            key={workspace.id}
            client={staffClient}
            locale={locale}
            tasksHref={prefix + "/app/tasks"}
          />
        ) : workspace && section === "daily-work" ? (
          templatesRoute ? (
            <RecurringChecklists
              key={workspace.id}
              client={checklistsClient}
              tasksClient={tasksClient}
              locale={locale}
              backHref={prefix + "/app/tasks"}
            />
          ) : (
            <DailyWork
              key={workspace.id}
              client={tasksClient}
              creationGuidance={getTaskCreationGuidance(workspace.id)}
              locale={locale}
              templatesHref={prefix + "/app/tasks/templates"}
            />
          )
        ) : setup ? (
          <>
            <SetupForm
              draft={draft}
              onDraftSaved={setDraft}
              workspace={workspace}
              studio={studio}
              onWorkspace={async (next) => {
                if (onWorkspaceSaved) {
                  onWorkspaceSaved(next);
                } else {
                  await storage.setActiveWorkspaceId(next.id);
                }
                setWorkspace(next);
                setCanManage(true);
              }}
              onSaved={(s) => {
                setDraft(null);
                setStudio(s);
                setDay(localDay(s.timezone));
                retryPackage();
                navigate(`${prefix}/app`);
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
                {!busy && !scheduleFailed && <span className="count">{appointments.length}</span>}
                <span className="muted">{studio.timezone}</span>
              </div>
              {busy ? (
                <StudioScheduleLoading />
              ) : scheduleFailed ? (
                <>
                  <ErrorMessage />
                  <button
                    className="button secondary"
                    onClick={() => setScheduleAttempt((count) => count + 1)}
                  >
                    {t("retry")}
                  </button>
                </>
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
