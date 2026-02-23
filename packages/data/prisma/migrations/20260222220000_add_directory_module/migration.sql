-- Create enums
CREATE TYPE "content"."DirectoryRestaurantStatus" AS ENUM ('ACTIVE', 'HIDDEN');
CREATE TYPE "content"."DirectoryLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- Create restaurants table
CREATE TABLE "content"."DirectoryRestaurant" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortDescription" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "priceRange" VARCHAR(16),
  "dishTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "neighborhoodSlug" TEXT,
  "addressLine" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Berlin',
  "lat" DECIMAL(10, 7),
  "lng" DECIMAL(10, 7),
  "openingHoursJson" JSONB,
  "status" "content"."DirectoryRestaurantStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "DirectoryRestaurant_pkey" PRIMARY KEY ("id")
);

-- Create leads table
CREATE TABLE "content"."DirectoryLead" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "content"."DirectoryLeadStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "DirectoryLead_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "content"."DirectoryLead"
  ADD CONSTRAINT "DirectoryLead_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "content"."DirectoryRestaurant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Restaurant indexes
CREATE UNIQUE INDEX "DirectoryRestaurant_tenantId_workspaceId_slug_key"
  ON "content"."DirectoryRestaurant"("tenantId", "workspaceId", "slug");

CREATE INDEX "DirectoryRestaurant_tenantId_workspaceId_status_neighborhoodSlug_idx"
  ON "content"."DirectoryRestaurant"("tenantId", "workspaceId", "status", "neighborhoodSlug");

CREATE INDEX "DirectoryRestaurant_tenantId_workspaceId_name_idx"
  ON "content"."DirectoryRestaurant"("tenantId", "workspaceId", "name");

CREATE INDEX "DirectoryRestaurant_tenantId_workspaceId_createdAt_idx"
  ON "content"."DirectoryRestaurant"("tenantId", "workspaceId", "createdAt");

-- Lead indexes
CREATE INDEX "DirectoryLead_tenantId_workspaceId_restaurantId_status_idx"
  ON "content"."DirectoryLead"("tenantId", "workspaceId", "restaurantId", "status");

CREATE INDEX "DirectoryLead_tenantId_workspaceId_createdAt_idx"
  ON "content"."DirectoryLead"("tenantId", "workspaceId", "createdAt");

-- Seed minimal Berlin restaurants under a dedicated public scope.
INSERT INTO "content"."DirectoryRestaurant" (
  "id",
  "tenantId",
  "workspaceId",
  "slug",
  "name",
  "shortDescription",
  "phone",
  "website",
  "priceRange",
  "dishTags",
  "neighborhoodSlug",
  "addressLine",
  "postalCode",
  "city",
  "lat",
  "lng",
  "openingHoursJson",
  "status",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'dir_restaurant_01',
    'directory-public-tenant',
    'directory-public-workspace',
    'pho-viet-mitte',
    'Pho Viet Mitte',
    'Casual pho spot in central Berlin.',
    '+49 30 5551 1001',
    'https://example.com/pho-viet-mitte',
    '$$',
    ARRAY['pho', 'bun-cha', 'summer-rolls'],
    'mitte',
    'Rosenthaler Str. 10',
    '10119',
    'Berlin',
    52.5243700,
    13.4021800,
    '{"mon":["11:30-22:00"],"tue":["11:30-22:00"],"wed":["11:30-22:00"],"thu":["11:30-22:00"],"fri":["11:30-22:30"],"sat":["12:00-22:30"],"sun":["12:00-21:30"]}'::jsonb,
    'ACTIVE',
    NOW(),
    NOW()
  ),
  (
    'dir_restaurant_02',
    'directory-public-tenant',
    'directory-public-workspace',
    'bun-bo-friedrichshain',
    'Bun Bo Friedrichshain',
    'Bun bowls and grilled meats near Boxhagener Platz.',
    '+49 30 5551 1002',
    'https://example.com/bun-bo-friedrichshain',
    '$$',
    ARRAY['bun-bo', 'grilled-pork', 'iced-coffee'],
    'friedrichshain',
    'Warschauer Str. 44',
    '10243',
    'Berlin',
    52.5073600,
    13.4508400,
    '{"mon":["12:00-22:00"],"tue":["12:00-22:00"],"wed":["12:00-22:00"],"thu":["12:00-22:00"],"fri":["12:00-23:00"],"sat":["12:00-23:00"],"sun":["12:00-21:00"]}'::jsonb,
    'ACTIVE',
    NOW(),
    NOW()
  ),
  (
    'dir_restaurant_03',
    'directory-public-tenant',
    'directory-public-workspace',
    'saigon-kitchen-neukolln',
    'Saigon Kitchen Neukoelln',
    'Family-run kitchen for com tam and banh mi.',
    '+49 30 5551 1003',
    'https://example.com/saigon-kitchen-neukolln',
    '$',
    ARRAY['banh-mi', 'com-tam', 'spring-rolls'],
    'neukolln',
    'Karl-Marx-Str. 150',
    '12043',
    'Berlin',
    52.4814700,
    13.4353700,
    '{"mon":["11:30-21:30"],"tue":["11:30-21:30"],"wed":["11:30-21:30"],"thu":["11:30-21:30"],"fri":["11:30-22:00"],"sat":["12:00-22:00"],"sun":["12:00-21:00"]}'::jsonb,
    'ACTIVE',
    NOW(),
    NOW()
  ),
  (
    'dir_restaurant_04',
    'directory-public-tenant',
    'directory-public-workspace',
    'hanoi-corner-prenzlauer-berg',
    'Hanoi Corner Prenzlauer Berg',
    'Northern-style soups and small plates.',
    '+49 30 5551 1004',
    'https://example.com/hanoi-corner-prenzlauer-berg',
    '$$$',
    ARRAY['bun-rieu', 'pho', 'nem-ran'],
    'prenzlauer-berg',
    'Kastanienallee 22',
    '10435',
    'Berlin',
    52.5398200,
    13.4055600,
    '{"mon":["12:00-22:00"],"tue":["12:00-22:00"],"wed":["12:00-22:00"],"thu":["12:00-22:00"],"fri":["12:00-22:30"],"sat":["12:00-22:30"],"sun":["12:00-21:30"]}'::jsonb,
    'ACTIVE',
    NOW(),
    NOW()
  ),
  (
    'dir_restaurant_05',
    'directory-public-tenant',
    'directory-public-workspace',
    'vegan-vietnam-kreuzberg',
    'Vegan Vietnam Kreuzberg',
    'Plant-based Vietnamese classics in Kreuzberg.',
    '+49 30 5551 1005',
    'https://example.com/vegan-vietnam-kreuzberg',
    '$$',
    ARRAY['vegan-pho', 'tofu', 'banh-xeo'],
    'kreuzberg',
    'Oranienstr. 80',
    '10969',
    'Berlin',
    52.5006400,
    13.4173000,
    '{"mon":["12:00-22:00"],"tue":["12:00-22:00"],"wed":["12:00-22:00"],"thu":["12:00-22:00"],"fri":["12:00-23:00"],"sat":["12:00-23:00"],"sun":["12:00-21:00"]}'::jsonb,
    'ACTIVE',
    NOW(),
    NOW()
  )
ON CONFLICT ("tenantId", "workspaceId", "slug") DO NOTHING;
