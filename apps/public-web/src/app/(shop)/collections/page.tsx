import { Suspense } from "react";
import { CollectionsScreen } from "@/modules/ecommerce";

export default function CollectionsPage() {
  return (
    <Suspense fallback={null}>
      <CollectionsScreen />
    </Suspense>
  );
}
