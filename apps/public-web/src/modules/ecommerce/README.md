# Ecommerce Module (Public Web)

Sample Shopify-like storefront for `@corely/public-web`.

## Routes

- `/shop`: storefront home (hero + featured collections/products)
- `/collections`: collection listing with search, sort, and pagination
- `/collections/:categoryIdOrSlug`: collection detail listing
- `/products/:itemId`: product detail with variant and quantity selection
- `/checkout`: checkout start stub

Workspace variants are also wired under `/w/:workspaceSlug/...`.

## Catalog Mapping

The module reads catalog data through HTTP only:

- Collections -> `CatalogCategory`
- Products -> `CatalogItem`
- Variants -> `CatalogVariant`
- Prices -> `CatalogPrice` + selected `CatalogPriceList`

Route handlers under `src/app/api/ecommerce/catalog/*` proxy to backend `/catalog/*` endpoints and validate payloads with `@corely/contracts`.

## Runtime Configuration

Set server-side env values for proxy calls:

- `PUBLIC_WEB_STOREFRONT_ACCESS_TOKEN`: bearer token with catalog read permissions
- `PUBLIC_WEB_STOREFRONT_WORKSPACE_ID`: workspace id used for catalog scope

For manual overrides you can also pass `workspaceId` query param to the internal proxy routes.

## Demo Flow

1. Open `/shop`
2. Browse `/collections` or a specific collection
3. Open `/products/:itemId`
4. Select variant + quantity, then add to cart
5. Open cart drawer and click checkout
6. Confirm summary on `/checkout`
