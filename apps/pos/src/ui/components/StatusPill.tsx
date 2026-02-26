import { Badge } from "@/ui/components/Badge";

export function StatusPill(props: {
  label: string;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  return <Badge {...props} />;
}
