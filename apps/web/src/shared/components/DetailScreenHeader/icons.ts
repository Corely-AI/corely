import {
  CreditCard,
  Download,
  FileCheck,
  Copy,
  Mail,
  Bell,
  History,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";

export const ICON_MAP: Record<string, React.ElementType> = {
  FileCheck,
  CreditCard,
  Download,
  Copy,
  Mail,
  Bell,
  History,
  FileSpreadsheet,
  XCircle,
};

export function getIcon(iconName?: string): React.ElementType | null {
  if (!iconName) {
    return null;
  }
  return ICON_MAP[iconName] || null;
}
