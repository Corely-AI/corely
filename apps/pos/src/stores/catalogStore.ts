import { create } from "zustand";
import type { ProductSnapshot } from "@corely/contracts";
import { useAuthStore } from "./authStore";
import { getPosLocalService } from "@/hooks/usePosLocalService";

interface CatalogState {
  products: ProductSnapshot[];
  lastSyncAt: Date | null;
  isLoading: boolean;
  isInitialized: boolean;
  syncError: string | null;

  initialize: () => Promise<void>;
  syncCatalog: (force?: boolean) => Promise<void>;
  searchProducts: (query: string) => Promise<ProductSnapshot[]>;
  getProductById: (productId: string) => ProductSnapshot | undefined;
  getProductBySku: (sku: string) => ProductSnapshot | undefined;
  getProductByBarcode: (barcode: string) => ProductSnapshot | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  lastSyncAt: null,
  isLoading: false,
  isInitialized: false,
  syncError: null,

  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    try {
      const localService = await getPosLocalService();
      const [products, lastSyncAt] = await Promise.all([
        localService.listCatalog(500),
        localService.getLastCatalogSyncAt(),
      ]);

      set({ products, lastSyncAt, isInitialized: true });

      if (useAuthStore.getState().isAuthenticated) {
        void get()
          .syncCatalog(false)
          .catch((error) => {
            console.error("Background catalog sync failed:", error);
          });
      }
    } catch (error) {
      console.error("Failed to initialize catalog:", error);
      set({ isInitialized: true });
    }
  },

  syncCatalog: async (force = false) => {
    const apiClient = useAuthStore.getState().apiClient;
    if (!apiClient) {
      throw new Error("API client not initialized");
    }

    // Skip if already syncing
    if (get().isLoading) {
      return;
    }

    set({ isLoading: true, syncError: null });
    try {
      const localService = await getPosLocalService();
      const previousSyncAt = force ? null : get().lastSyncAt;
      const limit = 250;
      let offset = 0;
      let hasMore = true;
      let firstPage = true;
      let totalFetched = 0;

      while (hasMore) {
        const data = await apiClient.getCatalogSnapshot({
          limit,
          offset,
          updatedSince: previousSyncAt ?? undefined,
        });
        if (data.products.length > 0) {
          await localService.replaceCatalogSnapshot(data.products, {
            resetBeforeUpsert: firstPage && (force || previousSyncAt === null),
          });
        } else if (firstPage && (force || previousSyncAt === null)) {
          await localService.replaceCatalogSnapshot([], { resetBeforeUpsert: true });
        }

        totalFetched += data.products.length;
        hasMore = data.hasMore;
        offset += limit;
        firstPage = false;
      }

      const syncedAt = new Date();
      await localService.updateLastCatalogSync(syncedAt);
      const refreshedProducts = await localService.listCatalog(500);

      set({
        products: refreshedProducts,
        lastSyncAt: syncedAt,
        isLoading: false,
        isInitialized: true,
      });

      console.warn(`Catalog sync completed (${totalFetched} updated rows)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to sync catalog:", error);
      set({ isLoading: false, syncError: errorMessage });
      throw error;
    }
  },

  searchProducts: async (query: string) => {
    const localService = await getPosLocalService();
    if (!query.trim()) {
      return localService.listCatalog(300);
    }
    return localService.searchCatalog(query);
  },

  getProductById: (productId: string) => {
    const { products } = get();
    return products.find((product) => product.productId === productId);
  },

  getProductBySku: (sku: string) => {
    const { products } = get();
    return products.find((product) => product.sku === sku);
  },

  getProductByBarcode: (barcode: string) => {
    const { products } = get();
    return products.find((product) => product.barcode === barcode);
  },
}));
