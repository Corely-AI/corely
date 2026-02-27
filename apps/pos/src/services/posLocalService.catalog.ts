import type * as SQLite from "expo-sqlite";
import type { ProductSnapshot } from "@corely/contracts";
import { runInTransaction, writeSyncState } from "@/lib/pos-db";
import { toCatalogProduct } from "@/services/posLocalService.mappers";
import type { CatalogProductRow } from "@/services/posLocalService.types";

export async function replaceCatalogSnapshot(
  db: SQLite.SQLiteDatabase,
  products: ProductSnapshot[],
  options?: { resetBeforeUpsert?: boolean }
): Promise<void> {
  await runInTransaction(db, async () => {
    if (options?.resetBeforeUpsert) {
      await db.runAsync(`DELETE FROM catalog_products`);
    }

    for (const product of products) {
      await db.runAsync(
        `INSERT INTO catalog_products (
          product_id,
          sku,
          name,
          barcode,
          price_cents,
          taxable,
          status,
          estimated_qty,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(product_id) DO UPDATE SET
          sku = excluded.sku,
          name = excluded.name,
          barcode = excluded.barcode,
          price_cents = excluded.price_cents,
          taxable = excluded.taxable,
          status = excluded.status,
          estimated_qty = excluded.estimated_qty,
          updated_at = excluded.updated_at`,
        [
          product.productId,
          product.sku,
          product.name,
          product.barcode,
          product.priceCents,
          product.taxable ? 1 : 0,
          product.status,
          product.estimatedQty,
          new Date().toISOString(),
        ]
      );
    }
  });
}

export async function searchCatalog(
  db: SQLite.SQLiteDatabase,
  query: string
): Promise<ProductSnapshot[]> {
  const normalized = `%${query.toLowerCase()}%`;
  const rows = await db.getAllAsync<CatalogProductRow>(
    `SELECT *
     FROM catalog_products
     WHERE LOWER(name) LIKE ?
        OR LOWER(sku) LIKE ?
        OR LOWER(COALESCE(barcode, '')) LIKE ?
     ORDER BY name ASC
     LIMIT 120`,
    [normalized, normalized, normalized]
  );

  return rows.map(toCatalogProduct);
}

export async function listCatalog(
  db: SQLite.SQLiteDatabase,
  limit = 200
): Promise<ProductSnapshot[]> {
  const rows = await db.getAllAsync<CatalogProductRow>(
    `SELECT *
     FROM catalog_products
     ORDER BY is_favorite DESC, name ASC
     LIMIT ?`,
    [limit]
  );

  return rows.map(toCatalogProduct);
}

export async function getProductByBarcode(
  db: SQLite.SQLiteDatabase,
  barcode: string
): Promise<ProductSnapshot | null> {
  const row = await db.getFirstAsync<CatalogProductRow>(
    `SELECT *
     FROM catalog_products
     WHERE barcode = ?`,
    [barcode]
  );

  return row ? toCatalogProduct(row) : null;
}

export async function updateLastCatalogSync(db: SQLite.SQLiteDatabase, at: Date): Promise<void> {
  await writeSyncState(db, "catalog:last_sync_at", at.toISOString());
}

export async function getLastCatalogSyncAt(db: SQLite.SQLiteDatabase): Promise<Date | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM sync_state WHERE key = 'catalog:last_sync_at'`,
    []
  );

  if (!row?.value) {
    return null;
  }

  return new Date(row.value);
}
