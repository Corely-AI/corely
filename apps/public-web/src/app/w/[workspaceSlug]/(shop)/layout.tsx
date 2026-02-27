import { StorefrontLayout, StorefrontProviders } from "@/modules/ecommerce";

export default async function WorkspaceShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;

  return (
    <StorefrontProviders>
      <StorefrontLayout workspaceSlug={workspaceSlug}>{children}</StorefrontLayout>
    </StorefrontProviders>
  );
}
