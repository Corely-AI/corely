-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "accounting";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "billing";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "commerce";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "content";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ext";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "platform";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "workflow";

-- CreateEnum
CREATE TYPE "platform"."PackInstallStatus" AS ENUM ('PENDING', 'RUNNING', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "platform"."MenuScope" AS ENUM ('WEB', 'POS');

-- CreateEnum
CREATE TYPE "identity"."PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "platform"."CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'MONEY');

-- CreateEnum
CREATE TYPE "platform"."WorkspaceMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "platform"."WorkspaceMembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "platform"."WorkspaceInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "platform"."WorkspaceOnboardingStatus" AS ENUM ('NEW', 'PROFILE', 'TAX', 'BANK', 'DONE');

-- CreateEnum
CREATE TYPE "crm"."PartyRoleType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'CONTACT');

-- CreateEnum
CREATE TYPE "crm"."ContactPointType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "crm"."AddressType" AS ENUM ('BILLING');

-- CreateEnum
CREATE TYPE "crm"."DealStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "crm"."ActivityType" AS ENUM ('NOTE', 'TASK', 'CALL', 'MEETING', 'EMAIL_DRAFT');

-- CreateEnum
CREATE TYPE "crm"."ActivityStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "accounting"."AccountType" AS ENUM ('Asset', 'Liability', 'Equity', 'Income', 'Expense');

-- CreateEnum
CREATE TYPE "accounting"."EntryStatus" AS ENUM ('Draft', 'Posted', 'Reversed');

-- CreateEnum
CREATE TYPE "accounting"."LineDirection" AS ENUM ('Debit', 'Credit');

-- CreateEnum
CREATE TYPE "accounting"."PeriodStatus" AS ENUM ('Open', 'Closed');

-- CreateEnum
CREATE TYPE "accounting"."SourceType" AS ENUM ('Manual', 'Invoice', 'Payment', 'Expense', 'VendorBill', 'BillPayment', 'Migration', 'Adjustment', 'CashEntry');

-- CreateEnum
CREATE TYPE "accounting"."AiContextType" AS ENUM ('AccountingCopilotChat', 'SuggestAccounts', 'GenerateJournalDraft', 'ExplainJournalEntry', 'ExplainReport', 'AnomalyScan', 'CloseChecklist');

-- CreateEnum
CREATE TYPE "accounting"."ConfidenceLevel" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "accounting"."AcceptedAction" AS ENUM ('none', 'savedDraft', 'appliedSuggestion', 'dismissed');

-- CreateEnum
CREATE TYPE "billing"."InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "billing"."DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'DELAYED');

-- CreateEnum
CREATE TYPE "billing"."PdfStatus" AS ENUM ('NONE', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "billing"."PaymentMethodType" AS ENUM ('BANK_TRANSFER', 'PAYPAL', 'CASH', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "billing"."VatAccountingMethod" AS ENUM ('IST', 'SOLL');

-- CreateEnum
CREATE TYPE "billing"."TaxRegime" AS ENUM ('SMALL_BUSINESS', 'STANDARD_VAT', 'VAT_EXEMPT');

-- CreateEnum
CREATE TYPE "billing"."VatFilingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "billing"."TaxCodeKind" AS ENUM ('STANDARD', 'REDUCED', 'REVERSE_CHARGE', 'EXEMPT', 'ZERO');

-- CreateEnum
CREATE TYPE "billing"."TaxSourceType" AS ENUM ('INVOICE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "billing"."TaxRoundingMode" AS ENUM ('PER_LINE', 'PER_DOCUMENT');

-- CreateEnum
CREATE TYPE "billing"."VatPeriodStatus" AS ENUM ('OPEN', 'OVERDUE', 'SUBMITTED', 'PAID', 'NIL', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "billing"."TaxReportStatus" AS ENUM ('UPCOMING', 'OPEN', 'SUBMITTED', 'OVERDUE', 'PAID', 'NIL', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "billing"."TaxReportType" AS ENUM ('VAT_ADVANCE', 'VAT_ANNUAL', 'INCOME_TAX', 'EU_SALES_LIST', 'INTRASTAT', 'PAYROLL_TAX', 'PROFIT_LOSS', 'BALANCE_SHEET', 'TRADE_TAX', 'FIXED_ASSETS');

-- CreateEnum
CREATE TYPE "billing"."TaxReportGroup" AS ENUM ('ADVANCE_VAT', 'ANNUAL_REPORT', 'COMPLIANCE', 'PAYROLL', 'FINANCIAL_STATEMENT');

-- CreateEnum
CREATE TYPE "billing"."ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "platform"."FormStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "platform"."FormFieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'EMAIL');

-- CreateEnum
CREATE TYPE "platform"."FormSubmissionSource" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "commerce"."SalesQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "commerce"."SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FULFILLED', 'INVOICED', 'CANCELED');

-- CreateEnum
CREATE TYPE "commerce"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "commerce"."VendorBillStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "commerce"."BillPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "platform"."DocumentType" AS ENUM ('UPLOAD', 'RECEIPT', 'CONTRACT', 'INVOICE_PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "platform"."DocumentStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "platform"."FileKind" AS ENUM ('ORIGINAL', 'DERIVED', 'GENERATED');

-- CreateEnum
CREATE TYPE "platform"."StorageProvider" AS ENUM ('gcs', 's3', 'azure');

-- CreateEnum
CREATE TYPE "platform"."DocumentLinkEntityType" AS ENUM ('INVOICE', 'EXPENSE', 'AGENT_RUN', 'MESSAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "commerce"."ProductType" AS ENUM ('STOCKABLE', 'CONSUMABLE', 'SERVICE');

-- CreateEnum
CREATE TYPE "commerce"."LocationType" AS ENUM ('INTERNAL', 'RECEIVING', 'SHIPPING', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "commerce"."InventoryDocumentType" AS ENUM ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "commerce"."InventoryDocumentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'POSTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "commerce"."StockMoveReason" AS ENUM ('RECEIPT', 'SHIPMENT', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "commerce"."ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "commerce"."NegativeStockPolicy" AS ENUM ('DISALLOW', 'ALLOW');

-- CreateEnum
CREATE TYPE "commerce"."ReservationPolicy" AS ENUM ('FULL_ONLY');

-- CreateEnum
CREATE TYPE "crm"."CheckInStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "crm"."CheckInByType" AS ENUM ('SELF_SERVICE', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "crm"."LoyaltyAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "crm"."LoyaltyEntryType" AS ENUM ('EARN', 'REDEEM', 'ADJUST', 'EXPIRE');

-- CreateEnum
CREATE TYPE "crm"."LoyaltyReasonCode" AS ENUM ('VISIT_CHECKIN', 'MANUAL_ADJUSTMENT', 'REWARD_REDEMPTION', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "content"."CmsPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "content"."CmsCommentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM', 'DELETED');

-- CreateEnum
CREATE TYPE "content"."RentalStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "content"."AvailabilityStatus" AS ENUM ('AVAILABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "content"."PortfolioShowcaseType" AS ENUM ('individual', 'company', 'hybrid');

-- CreateEnum
CREATE TYPE "content"."PortfolioProjectType" AS ENUM ('open_source', 'side_hustle', 'startup', 'agency', 'other');

-- CreateEnum
CREATE TYPE "content"."PortfolioClientType" AS ENUM ('cto', 'freelancer', 'partner', 'employer', 'other');

-- CreateEnum
CREATE TYPE "content"."PortfolioContentStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "identity"."PrivacyRequestType" AS ENUM ('EXPORT', 'ERASE');

-- CreateEnum
CREATE TYPE "identity"."PrivacyRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "workflow"."WorkflowDefinitionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "workflow"."WorkflowDefinitionType" AS ENUM ('GENERAL', 'APPROVAL');

-- CreateEnum
CREATE TYPE "workflow"."WorkflowInstanceStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "workflow"."TaskType" AS ENUM ('HUMAN', 'TIMER', 'HTTP', 'EMAIL', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "workflow"."TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "workflow"."OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "ext"."ExtKv" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExtKv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ext"."ExtEntityAttr" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "attrKey" TEXT NOT NULL,
    "attrValue" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ExtEntityAttr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ext"."ExtEntityLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "fromEntityType" TEXT NOT NULL,
    "fromEntityId" TEXT NOT NULL,
    "toEntityType" TEXT NOT NULL,
    "toEntityId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtEntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."AppCatalog" (
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "depsJson" TEXT NOT NULL,
    "permissionsJson" TEXT NOT NULL,
    "capabilitiesJson" TEXT NOT NULL,
    "menuJson" TEXT NOT NULL,
    "settingsSchemaJson" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AppCatalog_pkey" PRIMARY KEY ("appId")
);

-- CreateTable
CREATE TABLE "platform"."TenantAppInstall" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "installed_version" TEXT NOT NULL,
    "config_json" TEXT,
    "enabled_at" TIMESTAMPTZ(6),
    "enabled_by_user_id" TEXT,
    "disabled_at" TIMESTAMPTZ(6),
    "disabled_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantAppInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."TemplateCatalog" (
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "requires_apps_json" TEXT NOT NULL,
    "params_schema_json" TEXT NOT NULL,
    "upgrade_policy_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TemplateCatalog_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "platform"."TenantTemplateInstall" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "params_json" TEXT NOT NULL,
    "applied_by_user_id" TEXT,
    "applied_at" TIMESTAMPTZ(6) NOT NULL,
    "result_summary_json" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantTemplateInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."PackCatalog" (
    "pack_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "definition_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PackCatalog_pkey" PRIMARY KEY ("pack_id")
);

-- CreateTable
CREATE TABLE "platform"."TenantPackInstall" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "platform"."PackInstallStatus" NOT NULL DEFAULT 'PENDING',
    "params_json" TEXT,
    "log_json" TEXT NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "installed_by_user_id" TEXT,
    "error_json" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantPackInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."TenantMenuOverride" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" "platform"."MenuScope" NOT NULL,
    "overrides_json" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantMenuOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."SeededRecordMeta" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "source_template_id" TEXT NOT NULL,
    "source_template_version" TEXT NOT NULL,
    "is_customized" BOOLEAN NOT NULL DEFAULT false,
    "customized_at" TIMESTAMPTZ(6),
    "customized_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SeededRecordMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemKey" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "identity"."RolePermissionGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" "identity"."PermissionEffect" NOT NULL DEFAULT 'ALLOW',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "RolePermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "platform"."CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL,
    "defaultValue" JSONB,
    "options" JSONB,
    "validation" JSONB,
    "isIndexed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."CustomFieldIndex" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueDate" TIMESTAMP(3),
    "valueBool" BOOLEAN,
    "valueJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."EntityLayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."LegalEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "taxId" TEXT,
    "vatId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "address" JSONB,
    "bankAccount" JSONB,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Workspace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "publicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicModules" JSONB,
    "onboardingStatus" "platform"."WorkspaceOnboardingStatus" NOT NULL DEFAULT 'NEW',
    "onboardingCompletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "invoiceSettings" JSONB,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."WorkspaceDomain" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "platform"."WorkspaceMembershipRole" NOT NULL,
    "status" "platform"."WorkspaceMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "platform"."WorkspaceMembershipRole" NOT NULL,
    "status" "platform"."WorkspaceInviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."Party" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "vatId" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMPTZ(6),
    "archivedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."PartyRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "crm"."PartyRoleType" NOT NULL,

    CONSTRAINT "PartyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ContactPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "crm"."ContactPointType" NOT NULL,
    "value" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ContactPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "crm"."AddressType" NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."Deal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "expectedCloseDate" DATE,
    "probability" INTEGER,
    "status" "crm"."DealStatus" NOT NULL DEFAULT 'OPEN',
    "ownerUserId" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wonAt" TIMESTAMPTZ(6),
    "lostAt" TIMESTAMPTZ(6),
    "lostReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."Activity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "crm"."ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "channelKey" TEXT,
    "messageDirection" TEXT,
    "messageTo" TEXT,
    "openUrl" TEXT,
    "partyId" TEXT,
    "dealId" TEXT,
    "dueAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "status" "crm"."ActivityStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."DealStageTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "transitionedByUserId" TEXT,
    "transitionedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealStageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."PipelineConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stagesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."AccountingSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "fiscalYearStartMonthDay" TEXT NOT NULL,
    "periodLockingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "entryNumberPrefix" TEXT NOT NULL DEFAULT 'JE',
    "nextEntryNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AccountingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."AccountingPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "accounting"."PeriodStatus" NOT NULL DEFAULT 'Open',
    "closedAt" TIMESTAMPTZ(6),
    "closedBy" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."LedgerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "accounting"."AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "systemAccountKey" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryNumber" TEXT,
    "status" "accounting"."EntryStatus" NOT NULL DEFAULT 'Draft',
    "postingDate" DATE NOT NULL,
    "memo" TEXT NOT NULL,
    "sourceType" "accounting"."SourceType",
    "sourceId" TEXT,
    "sourceRef" TEXT,
    "reversesEntryId" TEXT,
    "reversedByEntryId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedBy" TEXT,
    "postedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."JournalLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "direction" "accounting"."LineDirection" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "lineMemo" TEXT,
    "reference" TEXT,
    "tags" TEXT,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."AiInteraction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "contextType" "accounting"."AiContextType" NOT NULL,
    "inputSummary" TEXT NOT NULL,
    "outputSummary" TEXT NOT NULL,
    "confidence" "accounting"."ConfidenceLevel",
    "confidenceScore" DOUBLE PRECISION,
    "referencedData" TEXT,
    "acceptedAction" "accounting"."AcceptedAction" NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "billToName" TEXT,
    "billToEmail" TEXT,
    "billToVatId" TEXT,
    "billToAddressLine1" TEXT,
    "billToAddressLine2" TEXT,
    "billToCity" TEXT,
    "billToPostalCode" TEXT,
    "billToCountry" TEXT,
    "number" TEXT,
    "status" "billing"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "legalEntityId" TEXT,
    "paymentMethodId" TEXT,
    "issuerSnapshot" JSONB,
    "taxSnapshot" JSONB,
    "paymentSnapshot" JSONB,
    "paymentDetails" JSONB,
    "invoiceDate" DATE,
    "dueDate" DATE,
    "issuedAt" TIMESTAMPTZ(6),
    "sentAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "pdfStorageKey" TEXT,
    "pdfGeneratedAt" TIMESTAMPTZ(6),
    "pdfSourceVersion" TEXT,
    "pdfStatus" "billing"."PdfStatus" NOT NULL DEFAULT 'NONE',
    "pdfFailureReason" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."InvoiceEmailDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "status" "billing"."DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerMessageId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InvoiceEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."BankAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "bic" TEXT,
    "bankName" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "country" CHAR(2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."PaymentMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "type" "billing"."PaymentMethodType" NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefaultForInvoicing" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountId" TEXT,
    "instructions" TEXT,
    "payUrl" TEXT,
    "referenceTemplate" TEXT NOT NULL DEFAULT 'INV-{invoiceNumber}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "regime" "billing"."TaxRegime" NOT NULL,
    "vatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "vatId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "filingFrequency" "billing"."VatFilingFrequency" NOT NULL,
    "taxYearStartMonth" INTEGER,
    "vatAccountingMethod" "billing"."VatAccountingMethod" NOT NULL DEFAULT 'IST',
    "localTaxOfficeName" TEXT,
    "vatExemptionParagraph" TEXT,
    "euB2BSales" BOOLEAN NOT NULL DEFAULT false,
    "hasEmployees" BOOLEAN NOT NULL DEFAULT false,
    "usesTaxAdvisor" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "billing"."TaxCodeKind" NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taxCodeId" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" "billing"."TaxSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "regime" "billing"."TaxRegime" NOT NULL,
    "roundingMode" "billing"."TaxRoundingMode" NOT NULL,
    "currency" TEXT NOT NULL,
    "calculatedAt" TIMESTAMPTZ(6) NOT NULL,
    "subtotalAmountCents" INTEGER NOT NULL,
    "taxTotalAmountCents" INTEGER NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "breakdownJson" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."VatPeriodSummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "currency" TEXT NOT NULL,
    "totalsByKindJson" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL,
    "status" "billing"."VatPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VatPeriodSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxConsultant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxConsultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "billing"."TaxReportType" NOT NULL,
    "group" "billing"."TaxReportGroup" NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "dueDate" TIMESTAMPTZ(6) NOT NULL,
    "status" "billing"."TaxReportStatus" NOT NULL,
    "amountEstimatedCents" INTEGER,
    "amountFinalCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "submittedAt" TIMESTAMPTZ(6),
    "submissionReference" TEXT,
    "submissionNotes" TEXT,
    "archivedReason" TEXT,
    "pdfStorageKey" TEXT,
    "pdfGeneratedAt" TIMESTAMPTZ(6),
    "meta" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxReportLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "section" TEXT,
    "label" TEXT,
    "netAmountCents" INTEGER NOT NULL,
    "taxAmountCents" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."cash_registers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "currentBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."cash_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "businessDate" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "cash_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."cash_day_closes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expectedBalanceCents" INTEGER NOT NULL,
    "countedBalanceCents" INTEGER NOT NULL,
    "differenceCents" INTEGER NOT NULL,
    "notes" TEXT,
    "closedAt" TIMESTAMPTZ(6),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cash_day_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "billing"."ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "expenseDate" DATE NOT NULL,
    "merchantName" TEXT,
    "supplierPartyId" TEXT,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "category" TEXT,
    "totalAmountCents" INTEGER NOT NULL,
    "taxAmountCents" INTEGER,
    "archivedAt" TIMESTAMPTZ(6),
    "archivedByUserId" TEXT,
    "createdByUserId" TEXT,
    "custom" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."ExpenseLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION,
    "category" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."FormDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "platform"."FormStatus" NOT NULL DEFAULT 'DRAFT',
    "publicId" TEXT,
    "publicTokenHash" TEXT,
    "publishedAt" TIMESTAMPTZ(6),
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FormDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."FormField" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "platform"."FormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "helpText" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."FormSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "source" "platform"."FormSubmissionSource" NOT NULL DEFAULT 'PUBLIC',
    "payloadJson" JSONB NOT NULL,
    "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."SalesSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultPaymentTerms" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'Q-',
    "quoteNextNumber" INTEGER NOT NULL DEFAULT 1,
    "orderNumberPrefix" TEXT NOT NULL DEFAULT 'SO-',
    "orderNextNumber" INTEGER NOT NULL DEFAULT 1,
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'INV-',
    "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1,
    "defaultRevenueAccountId" TEXT,
    "defaultAccountsReceivableAccountId" TEXT,
    "defaultBankAccountId" TEXT,
    "autoPostOnIssue" BOOLEAN NOT NULL DEFAULT true,
    "autoPostOnPayment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SalesSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poNumber" TEXT,
    "status" "commerce"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "supplierPartyId" TEXT NOT NULL,
    "supplierContactPartyId" TEXT,
    "orderDate" DATE,
    "expectedDeliveryDate" DATE,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "approvedAt" TIMESTAMPTZ(6),
    "sentAt" TIMESTAMPTZ(6),
    "receivedAt" TIMESTAMPTZ(6),
    "closedAt" TIMESTAMPTZ(6),
    "canceledAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "taxCode" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."VendorBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billNumber" TEXT,
    "internalBillRef" TEXT,
    "status" "commerce"."VendorBillStatus" NOT NULL DEFAULT 'DRAFT',
    "supplierPartyId" TEXT NOT NULL,
    "supplierContactPartyId" TEXT,
    "billDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paidCents" INTEGER NOT NULL,
    "dueCents" INTEGER NOT NULL,
    "approvedAt" TIMESTAMPTZ(6),
    "postedAt" TIMESTAMPTZ(6),
    "voidedAt" TIMESTAMPTZ(6),
    "purchaseOrderId" TEXT,
    "postedJournalEntryId" TEXT,
    "possibleDuplicateOfBillId" TEXT,
    "duplicateScore" DOUBLE PRECISION,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."VendorBillLine" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "category" TEXT,
    "glAccountId" TEXT,
    "taxCode" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "VendorBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."BillPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "method" "commerce"."BillPaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,
    "journalEntryId" TEXT,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."PurchasingSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultPaymentTerms" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "poNumberingPrefix" TEXT NOT NULL DEFAULT 'PO-',
    "poNextNumber" INTEGER NOT NULL DEFAULT 1,
    "billInternalRefPrefix" TEXT DEFAULT 'BILL-',
    "billNextNumber" INTEGER DEFAULT 1,
    "defaultAccountsPayableAccountId" TEXT,
    "defaultExpenseAccountId" TEXT,
    "defaultBankAccountId" TEXT,
    "autoPostOnBillPost" BOOLEAN NOT NULL DEFAULT true,
    "autoPostOnPaymentRecord" BOOLEAN NOT NULL DEFAULT true,
    "billDuplicateDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalRequiredForBills" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchasingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."PurchasingAccountMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierPartyId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchasingAccountMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "platform"."DocumentType" NOT NULL,
    "status" "platform"."DocumentStatus" NOT NULL,
    "title" TEXT,
    "errorMessage" TEXT,
    "metadataJson" JSONB,
    "archivedAt" TIMESTAMPTZ(6),
    "archivedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."File" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kind" "platform"."FileKind" NOT NULL,
    "storageProvider" "platform"."StorageProvider" NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."DocumentLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "entityType" "platform"."DocumentLinkEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."InventoryProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productType" "commerce"."ProductType" NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "barcode" TEXT,
    "defaultSalesPriceCents" INTEGER,
    "defaultPurchaseCostCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."InventoryWarehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."InventoryLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationType" "commerce"."LocationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."InventoryDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" "commerce"."InventoryDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "status" "commerce"."InventoryDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "reference" TEXT,
    "scheduledDate" DATE,
    "postingDate" DATE,
    "notes" TEXT,
    "partyId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "confirmedAt" TIMESTAMPTZ(6),
    "postedAt" TIMESTAMPTZ(6),
    "canceledAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."InventoryDocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "notes" TEXT,
    "reservedQuantity" INTEGER,

    CONSTRAINT "InventoryDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."StockMove" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "locationId" TEXT NOT NULL,
    "documentType" "commerce"."InventoryDocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "reasonCode" "commerce"."StockMoveReason" NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."StockReservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reservedQty" INTEGER NOT NULL,
    "status" "commerce"."ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ(6),
    "fulfilledAt" TIMESTAMPTZ(6),

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."ReorderPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "reorderPoint" INTEGER,
    "preferredSupplierPartyId" TEXT,
    "leadTimeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ReorderPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."InventorySettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receiptPrefix" TEXT NOT NULL DEFAULT 'RCPT-',
    "receiptNextNumber" INTEGER NOT NULL DEFAULT 1,
    "deliveryPrefix" TEXT NOT NULL DEFAULT 'DLV-',
    "deliveryNextNumber" INTEGER NOT NULL DEFAULT 1,
    "transferPrefix" TEXT NOT NULL DEFAULT 'TRF-',
    "transferNextNumber" INTEGER NOT NULL DEFAULT 1,
    "adjustmentPrefix" TEXT NOT NULL DEFAULT 'ADJ-',
    "adjustmentNextNumber" INTEGER NOT NULL DEFAULT 1,
    "negativeStockPolicy" "commerce"."NegativeStockPolicy" NOT NULL DEFAULT 'DISALLOW',
    "reservationPolicy" "commerce"."ReservationPolicy" NOT NULL DEFAULT 'FULL_ONLY',
    "defaultWarehouseId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventorySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."registers" (
    "id" UUID NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "default_warehouse_id" UUID,
    "default_bank_account_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."shift_sessions" (
    "id" UUID NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "register_id" UUID NOT NULL,
    "opened_by_employee_party_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ NOT NULL,
    "starting_cash_cents" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMPTZ,
    "closed_by_employee_party_id" UUID,
    "closing_cash_cents" INTEGER,
    "total_sales_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cash_received_cents" INTEGER NOT NULL DEFAULT 0,
    "variance_cents" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shift_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."pos_sale_idempotency" (
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "pos_sale_id" UUID NOT NULL,
    "server_invoice_id" UUID NOT NULL,
    "server_payment_id" UUID,
    "receipt_number" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sale_idempotency_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateTable
CREATE TABLE "crm"."CheckInEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "kioskDeviceId" TEXT,
    "checkedInAt" TIMESTAMPTZ(6) NOT NULL,
    "checkedInByType" "crm"."CheckInByType" NOT NULL,
    "checkedInByEmployeePartyId" TEXT,
    "status" "crm"."CheckInStatus" NOT NULL DEFAULT 'ACTIVE',
    "visitReason" TEXT,
    "assignedEmployeePartyId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posSaleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CheckInEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."LoyaltyAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "status" "crm"."LoyaltyAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."LoyaltyLedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "entryType" "crm"."LoyaltyEntryType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "reasonCode" "crm"."LoyaltyReasonCode" NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByEmployeePartyId" TEXT,

    CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."EngagementSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checkInModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "checkInDuplicateWindowMinutes" INTEGER NOT NULL DEFAULT 10,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerVisit" INTEGER NOT NULL DEFAULT 1,
    "rewardRulesJson" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kioskBrandingJson" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EngagementSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."CmsPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "content"."CmsPostStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImageFileId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(6),
    "authorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CmsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."CmsComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "parentId" TEXT,
    "bodyText" TEXT NOT NULL,
    "status" "content"."CmsCommentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CmsComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."CmsReader" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CmsReader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."RentalProperty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "content"."RentalStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "descriptionHtml" TEXT,
    "maxGuests" INTEGER,
    "coverImageFileId" TEXT,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."RentalCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."RentalPropertyCategory" (
    "propertyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "RentalPropertyCategory_pkey" PRIMARY KEY ("propertyId","categoryId")
);

-- CreateTable
CREATE TABLE "content"."RentalPropertyImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalPropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."RentalAvailabilityRange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "content"."AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalAvailabilityRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."PortfolioShowcase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "content"."PortfolioShowcaseType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryDomain" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioShowcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."PortfolioProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "introLine" TEXT,
    "headline" TEXT,
    "subheadline" TEXT,
    "aboutShort" TEXT,
    "aboutLong" TEXT,
    "focusBullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaTitle" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "techStacks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialLinks" JSONB,
    "homeSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."PortfolioProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "content"."PortfolioProjectType" NOT NULL,
    "status" "content"."PortfolioContentStatus" NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "coverImageUrl" TEXT,
    "links" JSONB,
    "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metrics" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."PortfolioClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clientType" "content"."PortfolioClientType" NOT NULL,
    "locationText" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "logoImageUrl" TEXT,
    "summary" TEXT,
    "testimonialQuote" TEXT,
    "testimonialAuthor" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."PortfolioProjectClient" (
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "PortfolioProjectClient_pkey" PRIMARY KEY ("projectId","clientId")
);

-- CreateTable
CREATE TABLE "content"."PortfolioService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startingFromPrice" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "status" "content"."PortfolioContentStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."PortfolioTeamMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrl" TEXT,
    "socialLinks" JSONB,
    "status" "content"."PortfolioContentStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."AgentRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traceId" TEXT,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Message" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "partsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traceId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."ToolExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorJson" TEXT,
    "traceId" TEXT,

    CONSTRAINT "ToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."PrivacyRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "identity"."PrivacyRequestType" NOT NULL,
    "status" "identity"."PrivacyRequestStatus" NOT NULL,
    "resultDocumentId" TEXT,
    "resultReportDocumentId" TEXT,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "workflow"."WorkflowDefinitionType" NOT NULL DEFAULT 'GENERAL',
    "status" "workflow"."WorkflowDefinitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "spec" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."WorkflowInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "businessKey" TEXT,
    "status" "workflow"."WorkflowInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "currentState" TEXT,
    "context" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "workflow"."TaskType" NOT NULL,
    "status" "workflow"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "assigneeUserId" TEXT,
    "assigneeRoleId" TEXT,
    "assigneePermissionKey" TEXT,
    "idempotencyKey" TEXT,
    "input" TEXT,
    "output" TEXT,
    "error" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."WorkflowEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" "workflow"."OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."DomainEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow"."IdempotencyKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actionKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "requestHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "responseJson" TEXT,
    "responseStatus" INTEGER,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtKv_tenantId_moduleId_idx" ON "ext"."ExtKv"("tenantId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtKv_tenantId_moduleId_scope_key_key" ON "ext"."ExtKv"("tenantId", "moduleId", "scope", "key");

-- CreateIndex
CREATE INDEX "ExtEntityAttr_tenantId_entityType_entityId_idx" ON "ext"."ExtEntityAttr"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ExtEntityAttr_tenantId_moduleId_idx" ON "ext"."ExtEntityAttr"("tenantId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtEntityAttr_tenantId_moduleId_entityType_entityId_attrKey_key" ON "ext"."ExtEntityAttr"("tenantId", "moduleId", "entityType", "entityId", "attrKey");

-- CreateIndex
CREATE INDEX "ExtEntityLink_tenantId_fromEntityType_fromEntityId_idx" ON "ext"."ExtEntityLink"("tenantId", "fromEntityType", "fromEntityId");

-- CreateIndex
CREATE INDEX "ExtEntityLink_tenantId_toEntityType_toEntityId_idx" ON "ext"."ExtEntityLink"("tenantId", "toEntityType", "toEntityId");

-- CreateIndex
CREATE INDEX "ExtEntityLink_tenantId_moduleId_linkType_idx" ON "ext"."ExtEntityLink"("tenantId", "moduleId", "linkType");

-- CreateIndex
CREATE UNIQUE INDEX "ExtEntityLink_tenantId_moduleId_fromEntityType_fromEntityId_key" ON "ext"."ExtEntityLink"("tenantId", "moduleId", "fromEntityType", "fromEntityId", "toEntityType", "toEntityId", "linkType");

-- CreateIndex
CREATE INDEX "AppCatalog_tier_idx" ON "platform"."AppCatalog"("tier");

-- CreateIndex
CREATE INDEX "AppCatalog_updatedAt_idx" ON "platform"."AppCatalog"("updatedAt");

-- CreateIndex
CREATE INDEX "TenantAppInstall_tenant_id_enabled_idx" ON "platform"."TenantAppInstall"("tenant_id", "enabled");

-- CreateIndex
CREATE INDEX "TenantAppInstall_tenant_id_created_at_idx" ON "platform"."TenantAppInstall"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAppInstall_tenant_id_app_id_key" ON "platform"."TenantAppInstall"("tenant_id", "app_id");

-- CreateIndex
CREATE INDEX "TemplateCatalog_category_idx" ON "platform"."TemplateCatalog"("category");

-- CreateIndex
CREATE INDEX "TemplateCatalog_updated_at_idx" ON "platform"."TemplateCatalog"("updated_at");

-- CreateIndex
CREATE INDEX "TenantTemplateInstall_tenant_id_created_at_idx" ON "platform"."TenantTemplateInstall"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TenantTemplateInstall_tenant_id_template_id_key" ON "platform"."TenantTemplateInstall"("tenant_id", "template_id");

-- CreateIndex
CREATE INDEX "PackCatalog_updated_at_idx" ON "platform"."PackCatalog"("updated_at");

-- CreateIndex
CREATE INDEX "TenantPackInstall_tenant_id_status_idx" ON "platform"."TenantPackInstall"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "TenantPackInstall_tenant_id_created_at_idx" ON "platform"."TenantPackInstall"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPackInstall_tenant_id_pack_id_version_key" ON "platform"."TenantPackInstall"("tenant_id", "pack_id", "version");

-- CreateIndex
CREATE INDEX "TenantMenuOverride_tenant_id_idx" ON "platform"."TenantMenuOverride"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMenuOverride_tenant_id_scope_key" ON "platform"."TenantMenuOverride"("tenant_id", "scope");

-- CreateIndex
CREATE INDEX "SeededRecordMeta_tenant_id_source_template_id_idx" ON "platform"."SeededRecordMeta"("tenant_id", "source_template_id");

-- CreateIndex
CREATE INDEX "SeededRecordMeta_tenant_id_target_table_is_customized_idx" ON "platform"."SeededRecordMeta"("tenant_id", "target_table", "is_customized");

-- CreateIndex
CREATE UNIQUE INDEX "SeededRecordMeta_tenant_id_target_table_target_id_key" ON "platform"."SeededRecordMeta"("tenant_id", "target_table", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "identity"."Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "identity"."Tenant"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "identity"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "identity"."User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "identity"."User"("createdAt");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "identity"."Membership"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "identity"."Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_roleId_idx" ON "identity"."Membership"("roleId");

-- CreateIndex
CREATE INDEX "Membership_tenantId_createdAt_idx" ON "identity"."Membership"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "identity"."Membership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "identity"."Role"("tenantId");

-- CreateIndex
CREATE INDEX "Role_tenantId_systemKey_idx" ON "identity"."Role"("tenantId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_systemKey_key" ON "identity"."Role"("tenantId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "identity"."Role"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "identity"."Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_key_idx" ON "identity"."Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "identity"."RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "identity"."RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "identity"."RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "RolePermissionGrant_tenantId_roleId_idx" ON "identity"."RolePermissionGrant"("tenantId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermissionGrant_permissionKey_idx" ON "identity"."RolePermissionGrant"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermissionGrant_tenantId_roleId_permissionKey_key" ON "identity"."RolePermissionGrant"("tenantId", "roleId", "permissionKey");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "identity"."RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tenantId_idx" ON "identity"."RefreshToken"("tenantId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "identity"."RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "identity"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "identity"."ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "identity"."ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_tenantId_name_key" ON "identity"."ApiKey"("tenantId", "name");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_tenantId_entityType_idx" ON "platform"."CustomFieldDefinition"("tenantId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_tenantId_entityType_key_key" ON "platform"."CustomFieldDefinition"("tenantId", "entityType", "key");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_fieldId_idx" ON "platform"."CustomFieldIndex"("tenantId", "entityType", "fieldId");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_fieldKey_idx" ON "platform"."CustomFieldIndex"("tenantId", "entityType", "fieldKey");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueText_idx" ON "platform"."CustomFieldIndex"("tenantId", "entityType", "valueText");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueNumber_idx" ON "platform"."CustomFieldIndex"("tenantId", "entityType", "valueNumber");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueDate_idx" ON "platform"."CustomFieldIndex"("tenantId", "entityType", "valueDate");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueBool_idx" ON "platform"."CustomFieldIndex"("tenantId", "entityType", "valueBool");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldIndex_tenantId_entityType_entityId_fieldId_key" ON "platform"."CustomFieldIndex"("tenantId", "entityType", "entityId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLayout_tenantId_entityType_key" ON "platform"."EntityLayout"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "LegalEntity_tenantId_idx" ON "platform"."LegalEntity"("tenantId");

-- CreateIndex
CREATE INDEX "LegalEntity_tenantId_kind_idx" ON "platform"."LegalEntity"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "LegalEntity_tenantId_createdAt_idx" ON "platform"."LegalEntity"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "platform"."Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_idx" ON "platform"."Workspace"("tenantId");

-- CreateIndex
CREATE INDEX "Workspace_legalEntityId_idx" ON "platform"."Workspace"("legalEntityId");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_createdAt_idx" ON "platform"."Workspace"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_onboardingStatus_idx" ON "platform"."Workspace"("tenantId", "onboardingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_tenantId_name_key" ON "platform"."Workspace"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceDomain_domain_key" ON "platform"."WorkspaceDomain"("domain");

-- CreateIndex
CREATE INDEX "WorkspaceDomain_workspaceId_idx" ON "platform"."WorkspaceDomain"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_idx" ON "platform"."WorkspaceMembership"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_idx" ON "platform"."WorkspaceMembership"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_status_idx" ON "platform"."WorkspaceMembership"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_status_idx" ON "platform"."WorkspaceMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "platform"."WorkspaceMembership"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "platform"."WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "platform"."WorkspaceInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_email_idx" ON "platform"."WorkspaceInvite"("email");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_token_idx" ON "platform"."WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_status_expiresAt_idx" ON "platform"."WorkspaceInvite"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_status_idx" ON "platform"."WorkspaceInvite"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Party_tenantId_displayName_idx" ON "crm"."Party"("tenantId", "displayName");

-- CreateIndex
CREATE INDEX "Party_tenantId_archivedAt_idx" ON "crm"."Party"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "Party_tenantId_idx" ON "crm"."Party"("tenantId");

-- CreateIndex
CREATE INDEX "PartyRole_tenantId_role_idx" ON "crm"."PartyRole"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PartyRole_tenantId_partyId_role_key" ON "crm"."PartyRole"("tenantId", "partyId", "role");

-- CreateIndex
CREATE INDEX "ContactPoint_tenantId_partyId_type_idx" ON "crm"."ContactPoint"("tenantId", "partyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ContactPoint_tenantId_partyId_type_key" ON "crm"."ContactPoint"("tenantId", "partyId", "type");

-- CreateIndex
CREATE INDEX "Address_tenantId_type_idx" ON "crm"."Address"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Address_tenantId_partyId_type_key" ON "crm"."Address"("tenantId", "partyId", "type");

-- CreateIndex
CREATE INDEX "Deal_tenantId_status_idx" ON "crm"."Deal"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Deal_tenantId_partyId_idx" ON "crm"."Deal"("tenantId", "partyId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_ownerUserId_idx" ON "crm"."Deal"("tenantId", "ownerUserId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_stageId_idx" ON "crm"."Deal"("tenantId", "stageId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_createdAt_idx" ON "crm"."Deal"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_tenantId_partyId_createdAt_idx" ON "crm"."Activity"("tenantId", "partyId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_tenantId_dealId_createdAt_idx" ON "crm"."Activity"("tenantId", "dealId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_tenantId_assignedToUserId_status_idx" ON "crm"."Activity"("tenantId", "assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "Activity_tenantId_createdAt_idx" ON "crm"."Activity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "DealStageTransition_tenantId_dealId_transitionedAt_idx" ON "crm"."DealStageTransition"("tenantId", "dealId", "transitionedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineConfig_tenantId_key" ON "crm"."PipelineConfig"("tenantId");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "crm"."Client"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_email_key" ON "crm"."Client"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingSettings_tenantId_key" ON "accounting"."AccountingSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AccountingSettings_tenantId_idx" ON "accounting"."AccountingSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_status_idx" ON "accounting"."AccountingPeriod"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_fiscalYearId_idx" ON "accounting"."AccountingPeriod"("tenantId", "fiscalYearId");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_startDate_idx" ON "accounting"."AccountingPeriod"("tenantId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_tenantId_fiscalYearId_name_key" ON "accounting"."AccountingPeriod"("tenantId", "fiscalYearId", "name");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_type_idx" ON "accounting"."LedgerAccount"("tenantId", "type");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_isActive_idx" ON "accounting"."LedgerAccount"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_systemAccountKey_idx" ON "accounting"."LedgerAccount"("tenantId", "systemAccountKey");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_tenantId_code_key" ON "accounting"."LedgerAccount"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryNumber_key" ON "accounting"."JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_status_idx" ON "accounting"."JournalEntry"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_postingDate_idx" ON "accounting"."JournalEntry"("tenantId", "postingDate");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_createdBy_idx" ON "accounting"."JournalEntry"("tenantId", "createdBy");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_reversesEntryId_idx" ON "accounting"."JournalEntry"("tenantId", "reversesEntryId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_reversedByEntryId_idx" ON "accounting"."JournalEntry"("tenantId", "reversedByEntryId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_sourceType_sourceId_idx" ON "accounting"."JournalEntry"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "accounting"."JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_ledgerAccountId_idx" ON "accounting"."JournalLine"("ledgerAccountId");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_ledgerAccountId_idx" ON "accounting"."JournalLine"("tenantId", "ledgerAccountId");

-- CreateIndex
CREATE INDEX "AiInteraction_tenantId_contextType_idx" ON "accounting"."AiInteraction"("tenantId", "contextType");

-- CreateIndex
CREATE INDEX "AiInteraction_tenantId_actorUserId_idx" ON "accounting"."AiInteraction"("tenantId", "actorUserId");

-- CreateIndex
CREATE INDEX "AiInteraction_tenantId_createdAt_idx" ON "accounting"."AiInteraction"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "billing"."Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_customerPartyId_idx" ON "billing"."Invoice"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_createdAt_idx" ON "billing"."Invoice"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_legalEntityId_idx" ON "billing"."Invoice"("legalEntityId");

-- CreateIndex
CREATE INDEX "Invoice_paymentMethodId_idx" ON "billing"."Invoice"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_number_key" ON "billing"."Invoice"("tenantId", "number");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "billing"."InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "billing"."InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceEmailDelivery_tenantId_invoiceId_idx" ON "billing"."InvoiceEmailDelivery"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceEmailDelivery_providerMessageId_idx" ON "billing"."InvoiceEmailDelivery"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceEmailDelivery_tenantId_idempotencyKey_key" ON "billing"."InvoiceEmailDelivery"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_legalEntityId_idx" ON "billing"."BankAccount"("tenantId", "legalEntityId");

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_isDefault_idx" ON "billing"."BankAccount"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "BankAccount_legalEntityId_isDefault_idx" ON "billing"."BankAccount"("legalEntityId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_tenantId_legalEntityId_label_key" ON "billing"."BankAccount"("tenantId", "legalEntityId", "label");

-- CreateIndex
CREATE INDEX "PaymentMethod_tenantId_legalEntityId_idx" ON "billing"."PaymentMethod"("tenantId", "legalEntityId");

-- CreateIndex
CREATE INDEX "PaymentMethod_tenantId_isDefaultForInvoicing_idx" ON "billing"."PaymentMethod"("tenantId", "isDefaultForInvoicing");

-- CreateIndex
CREATE INDEX "PaymentMethod_bankAccountId_idx" ON "billing"."PaymentMethod"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_tenantId_legalEntityId_label_key" ON "billing"."PaymentMethod"("tenantId", "legalEntityId", "label");

-- CreateIndex
CREATE INDEX "TaxProfile_tenantId_country_idx" ON "billing"."TaxProfile"("tenantId", "country");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_tenantId_effectiveFrom_key" ON "billing"."TaxProfile"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "TaxCode_tenantId_isActive_idx" ON "billing"."TaxCode"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TaxCode_tenantId_code_key" ON "billing"."TaxCode"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TaxRate_tenantId_taxCodeId_idx" ON "billing"."TaxRate"("tenantId", "taxCodeId");

-- CreateIndex
CREATE INDEX "TaxRate_effectiveFrom_idx" ON "billing"."TaxRate"("effectiveFrom");

-- CreateIndex
CREATE INDEX "TaxSnapshot_tenantId_sourceType_idx" ON "billing"."TaxSnapshot"("tenantId", "sourceType");

-- CreateIndex
CREATE INDEX "TaxSnapshot_calculatedAt_idx" ON "billing"."TaxSnapshot"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxSnapshot_tenantId_sourceType_sourceId_key" ON "billing"."TaxSnapshot"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "VatPeriodSummary_tenantId_status_idx" ON "billing"."VatPeriodSummary"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VatPeriodSummary_periodStart_idx" ON "billing"."VatPeriodSummary"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "VatPeriodSummary_tenantId_periodStart_periodEnd_key" ON "billing"."VatPeriodSummary"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TaxConsultant_tenantId_idx" ON "billing"."TaxConsultant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxConsultant_tenantId_name_key" ON "billing"."TaxConsultant"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TaxReport_tenantId_status_idx" ON "billing"."TaxReport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TaxReport_tenantId_periodStart_periodEnd_idx" ON "billing"."TaxReport"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TaxReport_tenantId_type_periodStart_periodEnd_key" ON "billing"."TaxReport"("tenantId", "type", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "TaxReportLine_reportId_idx" ON "billing"."TaxReportLine"("reportId");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_idx" ON "accounting"."cash_registers"("tenantId");

-- CreateIndex
CREATE INDEX "cash_registers_workspaceId_idx" ON "accounting"."cash_registers"("workspaceId");

-- CreateIndex
CREATE INDEX "cash_entries_tenantId_registerId_businessDate_idx" ON "accounting"."cash_entries"("tenantId", "registerId", "businessDate");

-- CreateIndex
CREATE INDEX "cash_entries_workspaceId_registerId_businessDate_idx" ON "accounting"."cash_entries"("workspaceId", "registerId", "businessDate");

-- CreateIndex
CREATE INDEX "cash_entries_tenantId_createdAt_idx" ON "accounting"."cash_entries"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "cash_day_closes_tenantId_idx" ON "accounting"."cash_day_closes"("tenantId");

-- CreateIndex
CREATE INDEX "cash_day_closes_workspaceId_idx" ON "accounting"."cash_day_closes"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_day_closes_registerId_businessDate_key" ON "accounting"."cash_day_closes"("registerId", "businessDate");

-- CreateIndex
CREATE INDEX "Expense_tenantId_idx" ON "billing"."Expense"("tenantId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_expenseDate_idx" ON "billing"."Expense"("tenantId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_tenantId_status_idx" ON "billing"."Expense"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Expense_tenantId_archivedAt_idx" ON "billing"."Expense"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "ExpenseLine_tenantId_idx" ON "billing"."ExpenseLine"("tenantId");

-- CreateIndex
CREATE INDEX "ExpenseLine_expenseId_idx" ON "billing"."ExpenseLine"("expenseId");

-- CreateIndex
CREATE UNIQUE INDEX "FormDefinition_publicId_key" ON "platform"."FormDefinition"("publicId");

-- CreateIndex
CREATE INDEX "FormDefinition_tenantId_idx" ON "platform"."FormDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "FormDefinition_tenantId_status_idx" ON "platform"."FormDefinition"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FormDefinition_tenantId_archivedAt_idx" ON "platform"."FormDefinition"("tenantId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FormDefinition_tenantId_name_key" ON "platform"."FormDefinition"("tenantId", "name");

-- CreateIndex
CREATE INDEX "FormField_formId_order_idx" ON "platform"."FormField"("formId", "order");

-- CreateIndex
CREATE INDEX "FormField_tenantId_idx" ON "platform"."FormField"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_key_key" ON "platform"."FormField"("formId", "key");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_submittedAt_idx" ON "platform"."FormSubmission"("formId", "submittedAt");

-- CreateIndex
CREATE INDEX "FormSubmission_tenantId_idx" ON "platform"."FormSubmission"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesSettings_tenantId_key" ON "commerce"."SalesSettings"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_status_idx" ON "commerce"."PurchaseOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_supplierPartyId_idx" ON "commerce"."PurchaseOrder"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_createdAt_idx" ON "commerce"."PurchaseOrder"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "commerce"."PurchaseOrder"("tenantId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "commerce"."PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_status_idx" ON "commerce"."VendorBill"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_supplierPartyId_idx" ON "commerce"."VendorBill"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_createdAt_idx" ON "commerce"."VendorBill"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_tenantId_supplierPartyId_billNumber_key" ON "commerce"."VendorBill"("tenantId", "supplierPartyId", "billNumber");

-- CreateIndex
CREATE INDEX "VendorBillLine_vendorBillId_idx" ON "commerce"."VendorBillLine"("vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_tenantId_vendorBillId_idx" ON "commerce"."BillPayment"("tenantId", "vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_vendorBillId_idx" ON "commerce"."BillPayment"("vendorBillId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasingSettings_tenantId_key" ON "commerce"."PurchasingSettings"("tenantId");

-- CreateIndex
CREATE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_idx" ON "commerce"."PurchasingAccountMapping"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_categoryK_key" ON "commerce"."PurchasingAccountMapping"("tenantId", "supplierPartyId", "categoryKey");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "platform"."Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_tenantId_type_idx" ON "platform"."Document"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Document_tenantId_archivedAt_idx" ON "platform"."Document"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "File_tenantId_idx" ON "platform"."File"("tenantId");

-- CreateIndex
CREATE INDEX "File_tenantId_documentId_idx" ON "platform"."File"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "File_objectKey_idx" ON "platform"."File"("objectKey");

-- CreateIndex
CREATE INDEX "DocumentLink_tenantId_idx" ON "platform"."DocumentLink"("tenantId");

-- CreateIndex
CREATE INDEX "DocumentLink_tenantId_entityType_entityId_idx" ON "platform"."DocumentLink"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "InventoryProduct_tenantId_productType_idx" ON "commerce"."InventoryProduct"("tenantId", "productType");

-- CreateIndex
CREATE INDEX "InventoryProduct_tenantId_isActive_idx" ON "commerce"."InventoryProduct"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryProduct_tenantId_sku_key" ON "commerce"."InventoryProduct"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "InventoryWarehouse_tenantId_isDefault_idx" ON "commerce"."InventoryWarehouse"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "InventoryLocation_tenantId_warehouseId_idx" ON "commerce"."InventoryLocation"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_status_idx" ON "commerce"."InventoryDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_documentType_idx" ON "commerce"."InventoryDocument"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_partyId_idx" ON "commerce"."InventoryDocument"("tenantId", "partyId");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_createdAt_idx" ON "commerce"."InventoryDocument"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryDocument_tenantId_documentNumber_key" ON "commerce"."InventoryDocument"("tenantId", "documentNumber");

-- CreateIndex
CREATE INDEX "InventoryDocumentLine_documentId_idx" ON "commerce"."InventoryDocumentLine"("documentId");

-- CreateIndex
CREATE INDEX "InventoryDocumentLine_productId_idx" ON "commerce"."InventoryDocumentLine"("productId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_productId_idx" ON "commerce"."StockMove"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_locationId_idx" ON "commerce"."StockMove"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_postingDate_idx" ON "commerce"."StockMove"("tenantId", "postingDate");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_documentId_idx" ON "commerce"."StockReservation"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_productId_idx" ON "commerce"."StockReservation"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ReorderPolicy_tenantId_warehouseId_idx" ON "commerce"."ReorderPolicy"("tenantId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReorderPolicy_tenantId_productId_warehouseId_key" ON "commerce"."ReorderPolicy"("tenantId", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySettings_tenantId_key" ON "commerce"."InventorySettings"("tenantId");

-- CreateIndex
CREATE INDEX "registers_workspace_id_status_idx" ON "commerce"."registers"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registers_workspace_id_name_key" ON "commerce"."registers"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "shift_sessions_workspace_id_register_id_status_idx" ON "commerce"."shift_sessions"("workspace_id", "register_id", "status");

-- CreateIndex
CREATE INDEX "shift_sessions_workspace_id_status_closed_at_idx" ON "commerce"."shift_sessions"("workspace_id", "status", "closed_at");

-- CreateIndex
CREATE INDEX "pos_sale_idempotency_workspace_id_idx" ON "commerce"."pos_sale_idempotency"("workspace_id");

-- CreateIndex
CREATE INDEX "pos_sale_idempotency_pos_sale_id_idx" ON "commerce"."pos_sale_idempotency"("pos_sale_id");

-- CreateIndex
CREATE INDEX "CheckInEvent_tenantId_customerPartyId_checkedInAt_idx" ON "crm"."CheckInEvent"("tenantId", "customerPartyId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_tenantId_registerId_checkedInAt_idx" ON "crm"."CheckInEvent"("tenantId", "registerId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_tenantId_status_idx" ON "crm"."CheckInEvent"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LoyaltyAccount_tenantId_status_idx" ON "crm"."LoyaltyAccount"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_tenantId_customerPartyId_key" ON "crm"."LoyaltyAccount"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "LoyaltyLedgerEntry_tenantId_customerPartyId_createdAt_idx" ON "crm"."LoyaltyLedgerEntry"("tenantId", "customerPartyId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyLedgerEntry_tenantId_entryType_idx" ON "crm"."LoyaltyLedgerEntry"("tenantId", "entryType");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyLedgerEntry_tenantId_sourceType_sourceId_reasonCode_key" ON "crm"."LoyaltyLedgerEntry"("tenantId", "sourceType", "sourceId", "reasonCode");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementSettings_tenantId_key" ON "crm"."EngagementSettings"("tenantId");

-- CreateIndex
CREATE INDEX "CmsPost_tenantId_idx" ON "content"."CmsPost"("tenantId");

-- CreateIndex
CREATE INDEX "CmsPost_tenantId_workspaceId_idx" ON "content"."CmsPost"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "CmsPost_tenantId_status_publishedAt_idx" ON "content"."CmsPost"("tenantId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPost_tenantId_slug_key" ON "content"."CmsPost"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_idx" ON "content"."CmsComment"("tenantId");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_workspaceId_idx" ON "content"."CmsComment"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_postId_idx" ON "content"."CmsComment"("tenantId", "postId");

-- CreateIndex
CREATE INDEX "CmsComment_postId_status_idx" ON "content"."CmsComment"("postId", "status");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_status_idx" ON "content"."CmsComment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CmsReader_tenantId_idx" ON "content"."CmsReader"("tenantId");

-- CreateIndex
CREATE INDEX "CmsReader_tenantId_workspaceId_idx" ON "content"."CmsReader"("tenantId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsReader_tenantId_email_key" ON "content"."CmsReader"("tenantId", "email");

-- CreateIndex
CREATE INDEX "RentalProperty_tenantId_workspaceId_idx" ON "content"."RentalProperty"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "RentalProperty_tenantId_workspaceId_status_publishedAt_idx" ON "content"."RentalProperty"("tenantId", "workspaceId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentalProperty_tenantId_workspaceId_slug_key" ON "content"."RentalProperty"("tenantId", "workspaceId", "slug");

-- CreateIndex
CREATE INDEX "RentalCategory_tenantId_workspaceId_idx" ON "content"."RentalCategory"("tenantId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalCategory_tenantId_workspaceId_slug_key" ON "content"."RentalCategory"("tenantId", "workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RentalCategory_tenantId_workspaceId_name_key" ON "content"."RentalCategory"("tenantId", "workspaceId", "name");

-- CreateIndex
CREATE INDEX "RentalPropertyImage_tenantId_workspaceId_idx" ON "content"."RentalPropertyImage"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "RentalPropertyImage_propertyId_sortOrder_idx" ON "content"."RentalPropertyImage"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "RentalAvailabilityRange_tenantId_workspaceId_idx" ON "content"."RentalAvailabilityRange"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "RentalAvailabilityRange_propertyId_startDate_endDate_idx" ON "content"."RentalAvailabilityRange"("propertyId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "PortfolioShowcase_tenantId_workspaceId_idx" ON "content"."PortfolioShowcase"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioShowcase_tenantId_workspaceId_isPublished_idx" ON "content"."PortfolioShowcase"("tenantId", "workspaceId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioShowcase_tenantId_workspaceId_slug_key" ON "content"."PortfolioShowcase"("tenantId", "workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProfile_showcaseId_key" ON "content"."PortfolioProfile"("showcaseId");

-- CreateIndex
CREATE INDEX "PortfolioProfile_tenantId_workspaceId_idx" ON "content"."PortfolioProfile"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioProject_tenantId_workspaceId_idx" ON "content"."PortfolioProject"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioProject_showcaseId_status_idx" ON "content"."PortfolioProject"("showcaseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProject_showcaseId_slug_key" ON "content"."PortfolioProject"("showcaseId", "slug");

-- CreateIndex
CREATE INDEX "PortfolioClient_tenantId_workspaceId_idx" ON "content"."PortfolioClient"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioClient_showcaseId_featured_idx" ON "content"."PortfolioClient"("showcaseId", "featured");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioClient_showcaseId_slug_key" ON "content"."PortfolioClient"("showcaseId", "slug");

-- CreateIndex
CREATE INDEX "PortfolioProjectClient_tenantId_workspaceId_idx" ON "content"."PortfolioProjectClient"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioService_tenantId_workspaceId_idx" ON "content"."PortfolioService"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioService_showcaseId_status_idx" ON "content"."PortfolioService"("showcaseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioService_showcaseId_slug_key" ON "content"."PortfolioService"("showcaseId", "slug");

-- CreateIndex
CREATE INDEX "PortfolioTeamMember_tenantId_workspaceId_idx" ON "content"."PortfolioTeamMember"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioTeamMember_showcaseId_status_idx" ON "content"."PortfolioTeamMember"("showcaseId", "status");

-- CreateIndex
CREATE INDEX "AgentRun_tenantId_createdAt_idx" ON "platform"."AgentRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_tenantId_runId_createdAt_idx" ON "platform"."Message"("tenantId", "runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ToolExecution_tenantId_runId_toolCallId_key" ON "platform"."ToolExecution"("tenantId", "runId", "toolCallId");

-- CreateIndex
CREATE INDEX "PrivacyRequest_tenantId_subjectUserId_createdAt_idx" ON "identity"."PrivacyRequest"("tenantId", "subjectUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_tenantId_status_createdAt_idx" ON "identity"."PrivacyRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_tenantId_status_idx" ON "workflow"."WorkflowDefinition"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_tenantId_key_idx" ON "workflow"."WorkflowDefinition"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_tenantId_key_version_key" ON "workflow"."WorkflowDefinition"("tenantId", "key", "version");

-- CreateIndex
CREATE INDEX "WorkflowInstance_tenantId_status_idx" ON "workflow"."WorkflowInstance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkflowInstance_tenantId_businessKey_idx" ON "workflow"."WorkflowInstance"("tenantId", "businessKey");

-- CreateIndex
CREATE INDEX "WorkflowInstance_status_updatedAt_idx" ON "workflow"."WorkflowInstance"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowInstance_tenantId_definitionId_businessKey_key" ON "workflow"."WorkflowInstance"("tenantId", "definitionId", "businessKey");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_runAt_idx" ON "workflow"."Task"("tenantId", "status", "runAt");

-- CreateIndex
CREATE INDEX "Task_instanceId_status_idx" ON "workflow"."Task"("instanceId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_idempotencyKey_idx" ON "workflow"."Task"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Task_status_lockedAt_idx" ON "workflow"."Task"("status", "lockedAt");

-- CreateIndex
CREATE INDEX "Task_runAt_status_idx" ON "workflow"."Task"("runAt", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_assigneeUserId_status_idx" ON "workflow"."Task"("tenantId", "assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_assigneeRoleId_status_idx" ON "workflow"."Task"("tenantId", "assigneeRoleId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_assigneePermissionKey_status_idx" ON "workflow"."Task"("tenantId", "assigneePermissionKey", "status");

-- CreateIndex
CREATE INDEX "WorkflowEvent_tenantId_instanceId_createdAt_idx" ON "workflow"."WorkflowEvent"("tenantId", "instanceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowEvent_instanceId_type_idx" ON "workflow"."WorkflowEvent"("instanceId", "type");

-- CreateIndex
CREATE INDEX "WorkflowEvent_tenantId_type_createdAt_idx" ON "workflow"."WorkflowEvent"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_status_availableAt_idx" ON "workflow"."OutboxEvent"("tenantId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "DomainEvent_tenantId_eventType_idx" ON "workflow"."DomainEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entity_entityId_idx" ON "workflow"."AuditLog"("tenantId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "workflow"."AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "IdempotencyKey_tenantId_actionKey_idx" ON "workflow"."IdempotencyKey"("tenantId", "actionKey");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_tenantId_actionKey_key_key" ON "workflow"."IdempotencyKey"("tenantId", "actionKey", "key");

-- AddForeignKey
ALTER TABLE "platform"."TenantAppInstall" ADD CONSTRAINT "TenantAppInstall_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."TenantTemplateInstall" ADD CONSTRAINT "TenantTemplateInstall_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."TenantPackInstall" ADD CONSTRAINT "TenantPackInstall_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."TenantMenuOverride" ADD CONSTRAINT "TenantMenuOverride_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."SeededRecordMeta" ADD CONSTRAINT "SeededRecordMeta_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "identity"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "identity"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "identity"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."RolePermissionGrant" ADD CONSTRAINT "RolePermissionGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."RolePermissionGrant" ADD CONSTRAINT "RolePermissionGrant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "identity"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."RolePermissionGrant" ADD CONSTRAINT "RolePermissionGrant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."RefreshToken" ADD CONSTRAINT "RefreshToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."LegalEntity" ADD CONSTRAINT "LegalEntity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."Workspace" ADD CONSTRAINT "Workspace_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "platform"."LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."WorkspaceDomain" ADD CONSTRAINT "WorkspaceDomain_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."PartyRole" ADD CONSTRAINT "PartyRole_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ContactPoint" ADD CONSTRAINT "ContactPoint_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."Address" ADD CONSTRAINT "Address_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."Deal" ADD CONSTRAINT "Deal_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."Activity" ADD CONSTRAINT "Activity_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "crm"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."DealStageTransition" ADD CONSTRAINT "DealStageTransition_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "crm"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "accounting"."JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."JournalLine" ADD CONSTRAINT "JournalLine_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "accounting"."LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."Invoice" ADD CONSTRAINT "Invoice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "platform"."LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."Invoice" ADD CONSTRAINT "Invoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "billing"."PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "billing"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "billing"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."BankAccount" ADD CONSTRAINT "BankAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "platform"."LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."PaymentMethod" ADD CONSTRAINT "PaymentMethod_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "platform"."LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."PaymentMethod" ADD CONSTRAINT "PaymentMethod_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "billing"."BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."TaxRate" ADD CONSTRAINT "TaxRate_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "billing"."TaxCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."TaxReportLine" ADD CONSTRAINT "TaxReportLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "billing"."TaxReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_registers" ADD CONSTRAINT "cash_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_registers" ADD CONSTRAINT "cash_registers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_entries" ADD CONSTRAINT "cash_entries_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_entries" ADD CONSTRAINT "cash_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_entries" ADD CONSTRAINT "cash_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_day_closes" ADD CONSTRAINT "cash_day_closes_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_day_closes" ADD CONSTRAINT "cash_day_closes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_day_closes" ADD CONSTRAINT "cash_day_closes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."ExpenseLine" ADD CONSTRAINT "ExpenseLine_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "billing"."Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "platform"."FormDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "platform"."FormDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "commerce"."PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."VendorBillLine" ADD CONSTRAINT "VendorBillLine_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "commerce"."VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."BillPayment" ADD CONSTRAINT "BillPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "commerce"."VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."File" ADD CONSTRAINT "File_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "platform"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."DocumentLink" ADD CONSTRAINT "DocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "platform"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."InventoryLocation" ADD CONSTRAINT "InventoryLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "commerce"."InventoryWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."InventoryDocumentLine" ADD CONSTRAINT "InventoryDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "commerce"."InventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."registers" ADD CONSTRAINT "registers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."shift_sessions" ADD CONSTRAINT "shift_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."shift_sessions" ADD CONSTRAINT "shift_sessions_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "commerce"."registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."pos_sale_idempotency" ADD CONSTRAINT "pos_sale_idempotency_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_tenantId_customerPartyId_fkey" FOREIGN KEY ("tenantId", "customerPartyId") REFERENCES "crm"."LoyaltyAccount"("tenantId", "customerPartyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."CmsPost" ADD CONSTRAINT "CmsPost_coverImageFileId_fkey" FOREIGN KEY ("coverImageFileId") REFERENCES "platform"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."CmsComment" ADD CONSTRAINT "CmsComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "content"."CmsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."CmsComment" ADD CONSTRAINT "CmsComment_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "content"."CmsReader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."CmsComment" ADD CONSTRAINT "CmsComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "content"."CmsComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."RentalPropertyCategory" ADD CONSTRAINT "RentalPropertyCategory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "content"."RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."RentalPropertyCategory" ADD CONSTRAINT "RentalPropertyCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "content"."RentalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."RentalPropertyImage" ADD CONSTRAINT "RentalPropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "content"."RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."RentalAvailabilityRange" ADD CONSTRAINT "RentalAvailabilityRange_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "content"."RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."PortfolioProfile" ADD CONSTRAINT "PortfolioProfile_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "content"."PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."PortfolioProject" ADD CONSTRAINT "PortfolioProject_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "content"."PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."PortfolioClient" ADD CONSTRAINT "PortfolioClient_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "content"."PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."PortfolioProjectClient" ADD CONSTRAINT "PortfolioProjectClient_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "content"."PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."PortfolioProjectClient" ADD CONSTRAINT "PortfolioProjectClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "content"."PortfolioClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."PortfolioService" ADD CONSTRAINT "PortfolioService_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "content"."PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."PortfolioTeamMember" ADD CONSTRAINT "PortfolioTeamMember_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "content"."PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."Message" ADD CONSTRAINT "Message_runId_fkey" FOREIGN KEY ("runId") REFERENCES "platform"."AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."ToolExecution" ADD CONSTRAINT "ToolExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "platform"."AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow"."WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "workflow"."WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow"."Task" ADD CONSTRAINT "Task_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow"."WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow"."WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow"."WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
