import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, Clock, UserX, DollarSign, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@corely/ui";
import { formatRelativeTime } from "@/shared/lib/formatters";
import type {
  TeacherDashboardSession,
  TeacherDashboardStudent,
  TeacherDashboardInvoice,
} from "@corely/contracts/classes";

interface NeedsAttentionPanelProps {
  needsAttention: {
    missingAttendanceSessions: TeacherDashboardSession[];
    unfinishedPastSessions: TeacherDashboardSession[];
    studentsMissingPayer: TeacherDashboardStudent[];
    unpaidInvoices: TeacherDashboardInvoice[];
  };
  attendanceMode: string;
}

export function NeedsAttentionPanel({ needsAttention, attendanceMode }: NeedsAttentionPanelProps) {
  const { t } = useTranslation();

  const hasNoAlerts =
    needsAttention.missingAttendanceSessions.length === 0 &&
    needsAttention.unfinishedPastSessions.length === 0 &&
    needsAttention.studentsMissingPayer.length === 0 &&
    needsAttention.unpaidInvoices.length === 0;

  return (
    <Card variant="default" className="h-full border-warning/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {t("dashboard.teacher.needsAttention", "Needs Attention")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Missing Attendance Section */}
          {attendanceMode === "MANUAL" && needsAttention.missingAttendanceSessions.length > 0 && (
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

          {/* Students Missing Payer Section */}
          {needsAttention.studentsMissingPayer.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider mt-4">
                {t("dashboard.teacher.studentsMissingPayer", "Students Missing Payer")}
              </h4>
              <div className="space-y-2">
                {needsAttention.studentsMissingPayer.map((student) => (
                  <Link
                    key={student.id}
                    to={`/classes/${student.classGroupId}/enrollments`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-warning/5 hover:bg-warning/10 border border-warning/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <UserX className="h-4 w-4 text-warning" />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {student.classGroupName}
                        </div>
                        <div className="text-xs text-muted-foreground">{student.studentName}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      {t("actions.assignPayer", "Assign Payer")}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Unpaid Invoices Section */}
          {needsAttention.unpaidInvoices.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider mt-4">
                {t("dashboard.teacher.unpaidInvoices", "Unpaid Invoices")}
              </h4>
              <div className="space-y-2">
                {needsAttention.unpaidInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-destructive/5 hover:bg-destructive/10 border border-destructive/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-destructive" />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {invoice.number || t("common.draft", "Draft")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.customerName} • {(invoice.amountDueCents / 100).toFixed(2)}{" "}
                          {invoice.currency}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      {t("actions.viewInvoice", "View")}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {hasNoAlerts && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {t("dashboard.teacher.allCaughtUp", "All caught up!")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("dashboard.teacher.noActions", "No pending actions require your attention.")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
