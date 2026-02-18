import type { FC } from "react";
import { FileText, CheckSquare, Phone, Calendar, Mail, Sparkles } from "lucide-react";
import type { ActivityType } from "@corely/contracts";

interface ActivityTypeIconProps {
  type: ActivityType;
  className?: string;
}

const iconMap: Record<ActivityType, FC<{ className?: string }>> = {
  NOTE: FileText,
  TASK: CheckSquare,
  CALL: Phone,
  MEETING: Calendar,
  COMMUNICATION: Mail,
  SYSTEM_EVENT: Sparkles,
};

export const ActivityTypeIcon: FC<ActivityTypeIconProps> = ({ type, className }) => {
  const Icon = iconMap[type];
  return <Icon className={className} />;
};
