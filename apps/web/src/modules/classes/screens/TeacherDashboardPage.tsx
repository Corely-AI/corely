import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, AlertCircle, CheckCircle, Clock, Users, Filter, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@corely/ui";
import { formatRelativeTime } from "@/shared/lib/formatters";
import { CardSkeleton } from "@/shared/components/Skeleton";
import { teacherDashboardApi } from "@/lib/teacher-dashboard-api";
import { classesApi } from "@/lib/classes-api";
import { startOfDay, endOfDay, addDays } from "date-fns";

export default function TeacherDashboardPage() {
  const { t } = useTranslation();

  // Date state
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date; label: string }>({
    from: startOfDay(new Date()),
    to: endOfDay(addDays(new Date(), 7)),
    label: "upcoming_week",
  });

  // Class Group Filter
  const [selectedClassGroupId, setSelectedClassGroupId] = React.useState<string | undefined>(
    undefined
  );

  // Fetch Class Groups for Filter
  const { data: groupsData } = useQuery({
    queryKey: ["teacher-dashboard", "class-groups"],
    queryFn: () => classesApi.listClassGroups({ pageSize: 100, status: "ACTIVE" }),
  });
  const classGroups = groupsData?.items ?? [];

  const query = {
    dateFrom: dateRange.from.toISOString(),
    dateTo: dateRange.to.toISOString(),
    classGroupId: selectedClassGroupId,
  };

  const { data: summary, isLoading } = useQuery({
    queryKey: ["teacher-dashboard", "summary", query],
    queryFn: () => teacherDashboardApi.getSummary(query),
  });

  const handleRangeChange = (range: "today" | "week") => {
    const now = new Date();
    if (range === "today") {
      setDateRange({
        from: startOfDay(now),
        to: endOfDay(now),
        label: "today",
      });
    } else {
      setDateRange({
        from: startOfDay(now),
        to: endOfDay(addDays(now, 7)),
        label: "upcoming_week",
      });
    }
  };

  if (isLoading || !summary) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const { counts, upcomingSessions, needsAttention, attendanceMode } = summary;

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-foreground">
            {t("dashboard.teacher.welcome", "Teacher Dashboard")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("dashboard.teacher.subtitle", "Your classes and tasks for today")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Class Group Filter */}
          {classGroups.length > 0 && (
            <div className="relative">
              <select
                className="h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedClassGroupId || ""}
                onChange={(e) => setSelectedClassGroupId(e.target.value || undefined)}
              >
                <option value="">{t("dashboard.teacher.allClasses", "All Classes")}</option>
                {classGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex bg-muted p-1 rounded-lg">
            <Button
              variant={dateRange.label === "today" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleRangeChange("today")}
            >
              {t("common.today", "Today")}
            </Button>
            <Button
              variant={dateRange.label === "upcoming_week" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleRangeChange("week")}
            >
              {t("common.thisWeek", "This Week")}
            </Button>
          </div>

          <Button variant="outline" size="icon" className="h-9 w-9" asChild>
            <Link to="/settings/classes" title={t("classes.settings.title", "Classes Settings")}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">{t("classes.settings.title", "Classes Settings")}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sessions */}
        <Link
          to={`/sessions?dateFrom=${startOfDay(new Date()).toISOString()}&dateTo=${endOfDay(new Date()).toISOString()}`}
        >
          <Card variant="interactive" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.teacher.sessionsToday", "Sessions Today")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{counts.todaySessions}</div>
            </CardContent>
          </Card>
        </Link>

        {/* This Week's Sessions */}
        <Link to="/sessions">
          <Card variant="interactive" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.teacher.sessionsThisWeek", "Sessions This Week")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{counts.weekSessions}</div>
            </CardContent>
          </Card>
        </Link>

        {/* Missing Attendance */}
        {attendanceMode === "MANUAL" ? (
          <Link to="/sessions?status=DONE&missingAttendance=true">
            <Card variant="interactive" className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.teacher.missingAttendance", "Missing Attendance")}
                </CardTitle>
                <Users className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{counts.missingAttendance}</div>
                {counts.missingAttendance > 0 && (
                  <p className="text-xs text-warning mt-1 font-medium">
                    {t("dashboard.teacher.actionRequired", "Action required")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="h-full bg-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("classes.settings.attendance.title", "Attendance")}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium text-muted-foreground">Auto-Full</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("classes.settings.attendance.autoFull.label", "Auto-Full Attendance")} active
              </p>
            </CardContent>
          </Card>
        )}

        {/* Unfinished Past Sessions */}
        <Link to="/sessions?status=PLANNED&past=true">
          <Card variant="interactive" className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.teacher.unfinished", "Unfinished Sessions")}
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {counts.unfinishedPastSessions}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions List */}
        <Card variant="default" className="h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {t("dashboard.teacher.upcomingSessions", "Upcoming Sessions")}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sessions">{t("common.viewAll", "View All")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("dashboard.teacher.noUpcoming", "No upcoming sessions in this range")}
                </p>
              ) : (
                upcomingSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {session.classGroupName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {session.topic || t("common.noTopic", "No topic")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {formatRelativeTime(session.startsAt)}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {session.status}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Needs Attention List */}
        <Card variant="default" className="h-full border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {t("dashboard.teacher.needsAttention", "Needs Attention")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Missing Attendance Section */}
              {attendanceMode === "MANUAL" &&
                needsAttention.missingAttendanceSessions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                      {t("dashboard.teacher.missingAttendance", "Missing Attendance")}
                    </h4>
                    <div className="space-y-2">
                      {needsAttention.missingAttendanceSessions.map((session) => (
                        <Link
                          key={session.id}
                          to={`/sessions/${session.id}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-warning/5 hover:bg-warning/10 border border-warning/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-4 w-4 text-warning" />
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {session.classGroupName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatRelativeTime(session.startsAt)}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">
                            {t("actions.takeAttendance", "Take Attendance")}
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              {/* Unfinished Section */}
              {needsAttention.unfinishedPastSessions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider mt-4">
                    {t("dashboard.teacher.unfinishedSessions", "Unfinished Sessions")}
                  </h4>
                  <div className="space-y-2">
                    {needsAttention.unfinishedPastSessions.map((session) => (
                      <Link
                        key={session.id}
                        to={`/sessions/${session.id}`}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium text-foreground">
                              {session.classGroupName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatRelativeTime(session.startsAt)}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 text-xs">
                          {t("actions.markDone", "Mark Done")}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {needsAttention.missingAttendanceSessions.length === 0 &&
                needsAttention.unfinishedPastSessions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                      <CheckCircle className="h-6 w-6 text-success" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {t("dashboard.teacher.allCaughtUp", "All caught up!")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "dashboard.teacher.noActions",
                        "No pending actions require your attention."
                      )}
                    </p>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
