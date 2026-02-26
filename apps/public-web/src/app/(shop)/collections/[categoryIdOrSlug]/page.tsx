import { CollectionDetailScreen } from "@/modules/ecommerce";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ categoryIdOrSlug: string }>;
}) {
  const { categoryIdOrSlug } = await params;
  return <CollectionDetailScreen categoryIdOrSlug={categoryIdOrSlug} />;
}
