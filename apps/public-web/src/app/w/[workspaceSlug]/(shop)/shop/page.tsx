import { EcommerceHomeScreen } from "@/modules/ecommerce";

export default async function WorkspaceShopHomePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <EcommerceHomeScreen workspaceSlug={workspaceSlug} />;
}
