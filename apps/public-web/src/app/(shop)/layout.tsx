import { StorefrontLayout, StorefrontProviders } from "@/modules/ecommerce";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <StorefrontProviders>
      <StorefrontLayout>{children}</StorefrontLayout>
    </StorefrontProviders>
  );
}
