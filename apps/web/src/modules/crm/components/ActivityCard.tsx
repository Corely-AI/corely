import type { FC } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@corely/ui";
import type { ActivityDto } from "@corely/contracts";
import { ActivityTypeIcon } from "./ActivityTypeIcon";
import { Badge } from "@corely/ui";
import { useTranslation } from "react-i18next";

interface ActivityCardProps {
  activity: ActivityDto;
  onClick?: () => void;
}

export const ActivityCard: FC<ActivityCardProps> = ({ activity, onClick }) => {
  const { t, i18n } = useTranslation();
  const statusColor =
    activity.status === "COMPLETED"
      ? "bg-green-100 text-green-800"
      : activity.status === "CANCELED"
        ? "bg-gray-100 text-gray-800"
        : "bg-blue-100 text-blue-800";

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <ActivityTypeIcon type={activity.type} className="w-5 h-5 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-base">{activity.subject}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className={statusColor}>
                {t(`crm.activity.statuses.${activity.status.toLowerCase()}`)}
              </Badge>
              {activity.dueAt && (
                <span>
                  {t("crm.activity.due", {
                    date: new Date(activity.dueAt).toLocaleDateString(i18n.language),
                  })}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {activity.body && (
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3 mb-2">{activity.body}</p>
          
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
             {activity.outcome && (
                 <span className="bg-slate-100 px-2 py-1 rounded-md font-medium text-slate-700">
                     Outcome: {activity.outcome}
                 </span>
             )}
             {activity.durationSeconds && (
                 <span className="flex items-center gap-1">
                     ⏱ {Math.round(activity.durationSeconds / 60)} min
                 </span>
             )}
             {activity.location && (
                 <span className="flex items-center gap-1">
                     📍 {activity.location}
                 </span>
             )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
