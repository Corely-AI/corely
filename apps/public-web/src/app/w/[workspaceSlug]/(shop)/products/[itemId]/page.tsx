import { ProductDetailScreen } from "@/modules/ecommerce";

export default async function WorkspaceProductPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; itemId: string }>;
}) {
  const { workspaceSlug, itemId } = await params;
  return <ProductDetailScreen workspaceSlug={workspaceSlug} itemId={itemId} />;
}
