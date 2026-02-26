import { CollectionDetailScreen } from "@/modules/ecommerce";

export default async function WorkspaceCollectionDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; categoryIdOrSlug: string }>;
}) {
  const { workspaceSlug, categoryIdOrSlug } = await params;
  return (
    <CollectionDetailScreen workspaceSlug={workspaceSlug} categoryIdOrSlug={categoryIdOrSlug} />
  );
}
