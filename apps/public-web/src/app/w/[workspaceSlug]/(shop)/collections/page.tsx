import { CollectionsScreen } from "@/modules/ecommerce";

export default async function WorkspaceCollectionsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  return <CollectionsScreen workspaceSlug={workspaceSlug} />;
}
