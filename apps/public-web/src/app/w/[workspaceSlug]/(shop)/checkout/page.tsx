import { CheckoutScreen } from "@/modules/ecommerce";

export default async function WorkspaceCheckoutPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <CheckoutScreen workspaceSlug={workspaceSlug} />;
}
