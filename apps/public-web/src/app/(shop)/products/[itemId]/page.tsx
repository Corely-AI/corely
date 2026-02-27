import { ProductDetailScreen } from "@/modules/ecommerce";

export default async function ProductPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return <ProductDetailScreen itemId={itemId} />;
}
