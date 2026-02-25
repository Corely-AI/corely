import type { PropsWithChildren } from "react";
import { Card } from "@/ui/components/Card";

export function PosCard(props: PropsWithChildren<{ padded?: boolean }>) {
  return <Card {...props} />;
}
