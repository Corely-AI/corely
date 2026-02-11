import React from "react";
import { Route } from "react-router-dom";
import {
  QuotesPage as SalesQuotesPage,
  NewQuotePage,
  QuoteDetailPage,
  OrdersPage as SalesOrdersPage,
  NewOrderPage,
  OrderDetailPage,
  SalesSettingsPage,
  SalesCopilotPage,
} from "../../modules/sales";
import {
  PurchaseOrdersPage,
  PurchaseOrderDetailPage,
  NewPurchaseOrderPage,
  VendorBillsPage,
  VendorBillDetailPage,
  NewVendorBillPage,
  RecordBillPaymentPage,
  PurchasingSettingsPage,
  PurchasingCopilotPage,
} from "../../modules/purchasing";
import {
  ProductsPage,
  ProductDetailPage,
  WarehousesPage,
  StockOverviewPage,
  DocumentsPage,
  DocumentDetailPage,
  ReorderDashboardPage,
  InventoryCopilotPage,
  LotsPage,
  LotDetailPage,
  ExpiryDashboardPage,
} from "../../modules/inventory";
import { ShipmentsPage, ShipmentDetailPage } from "../../modules/import";
import { InvoicesPage, NewInvoicePage, InvoiceDetailPage } from "../../modules/invoices";
import { RequireCapability } from "../../shared/workspaces/RequireCapability";

export const capabilityRoutes = (
  <>
    <Route
      path="/sales/quotes"
      element={
        <RequireCapability capability="sales.quotes">
          <SalesQuotesPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/quotes/new"
      element={
        <RequireCapability capability="sales.quotes">
          <NewQuotePage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/quotes/:quoteId"
      element={
        <RequireCapability capability="sales.quotes">
          <QuoteDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/quotes/:quoteId/edit"
      element={
        <RequireCapability capability="sales.quotes">
          <QuoteDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/orders"
      element={
        <RequireCapability capability="sales.quotes">
          <SalesOrdersPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/orders/new"
      element={
        <RequireCapability capability="sales.quotes">
          <NewOrderPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/orders/:orderId"
      element={
        <RequireCapability capability="sales.quotes">
          <OrderDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/orders/:orderId/edit"
      element={
        <RequireCapability capability="sales.quotes">
          <OrderDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/invoices"
      element={
        <RequireCapability capability="sales.quotes">
          <InvoicesPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/invoices/new"
      element={
        <RequireCapability capability="sales.quotes">
          <NewInvoicePage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/invoices/:invoiceId"
      element={
        <RequireCapability capability="sales.quotes">
          <InvoiceDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/invoices/:invoiceId/edit"
      element={
        <RequireCapability capability="sales.quotes">
          <InvoiceDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/settings"
      element={
        <RequireCapability capability="sales.quotes">
          <SalesSettingsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/sales/copilot"
      element={
        <RequireCapability capability="sales.quotes">
          <SalesCopilotPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/purchase-orders"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <PurchaseOrdersPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/purchase-orders/new"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <NewPurchaseOrderPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/purchase-orders/:id"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <PurchaseOrderDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/purchase-orders/:id/edit"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <PurchaseOrderDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/vendor-bills"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <VendorBillsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/vendor-bills/new"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <NewVendorBillPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/vendor-bills/:id"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <VendorBillDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/vendor-bills/:id/edit"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <VendorBillDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/vendor-bills/:id/pay"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <RecordBillPaymentPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/settings"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <PurchasingSettingsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/purchasing/copilot"
      element={
        <RequireCapability capability="purchasing.purchaseOrders">
          <PurchasingCopilotPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/products"
      element={
        <RequireCapability capability="inventory.basic">
          <ProductsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/products/:id"
      element={
        <RequireCapability capability="inventory.basic">
          <ProductDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/products/:id/edit"
      element={
        <RequireCapability capability="inventory.basic">
          <ProductDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/warehouses"
      element={
        <RequireCapability capability="inventory.basic">
          <WarehousesPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/stock"
      element={
        <RequireCapability capability="inventory.basic">
          <StockOverviewPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/documents"
      element={
        <RequireCapability capability="inventory.basic">
          <DocumentsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/documents/:id"
      element={
        <RequireCapability capability="inventory.basic">
          <DocumentDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/documents/:id/edit"
      element={
        <RequireCapability capability="inventory.basic">
          <DocumentDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/reorder"
      element={
        <RequireCapability capability="inventory.basic">
          <ReorderDashboardPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/copilot"
      element={
        <RequireCapability capability="inventory.basic">
          <InventoryCopilotPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/lots"
      element={
        <RequireCapability capability="inventory.basic">
          <LotsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/lots/:id"
      element={
        <RequireCapability capability="inventory.basic">
          <LotDetailPage />
        </RequireCapability>
      }
    />
    <Route
      path="/inventory/expiry"
      element={
        <RequireCapability capability="inventory.basic">
          <ExpiryDashboardPage />
        </RequireCapability>
      }
    />
    <Route
      path="/import/shipments"
      element={
        <RequireCapability capability="import.basic">
          <ShipmentsPage />
        </RequireCapability>
      }
    />
    <Route
      path="/import/shipments/:id"
      element={
        <RequireCapability capability="import.basic">
          <ShipmentDetailPage />
        </RequireCapability>
      }
    />
  </>
);
