import { create } from 'zustand';
import type { CatalogProduct } from '@kerniflow/contracts';
import { useAuthStore } from './authStore';

interface CatalogState {
  products: CatalogProduct[];
  lastSyncAt: Date | null;
  isLoading: boolean;

  syncCatalog: () => Promise<void>;
  searchProducts: (query: string) => Promise<CatalogProduct[]>;
  getProductById: (productId: string) => CatalogProduct | undefined;
  getProductBySku: (sku: string) => CatalogProduct | undefined;
  getProductByBarcode: (barcode: string) => CatalogProduct | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  lastSyncAt: null,
  isLoading: false,

  syncCatalog: async () => {
    const apiClient = useAuthStore.getState().apiClient;
    if (!apiClient) throw new Error('API client not initialized');

    set({ isLoading: true });
    try {
      const data = await apiClient.getCatalogSnapshot({
        lastSyncAt: get().lastSyncAt ?? undefined,
      });

      set({
        products: data.products,
        lastSyncAt: new Date(),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to sync catalog:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  searchProducts: async (query: string) => {
    const { products } = get();
    const lowerQuery = query.toLowerCase();

    // Search locally first
    const results = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku?.toLowerCase().includes(lowerQuery) ||
        p.barcode?.toLowerCase().includes(lowerQuery)
    );

    return results;
  },

  getProductById: (productId: string) => {
    const { products } = get();
    return products.find((p) => p.productId === productId);
  },

  getProductBySku: (sku: string) => {
    const { products } = get();
    return products.find((p) => p.sku === sku);
  },

  getProductByBarcode: (barcode: string) => {
    const { products } = get();
    return products.find((p) => p.barcode === barcode);
  },
}));
