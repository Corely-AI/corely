-- Baseline from the 90 Prisma migrations at commit 606ccee8a43a58f85372bb38c83bfd27d5d9bd33.
-- See docs/devops/prisma-baseline.md for adopting this migration on an existing database.
BEGIN;

SET LOCAL statement_timeout = 0;
SET LOCAL lock_timeout = 0;
SET LOCAL idle_in_transaction_session_timeout = 0;
SET LOCAL client_encoding = 'UTF8';
SET LOCAL standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', true);
SET LOCAL check_function_bodies = false;
SET LOCAL xmloption = content;
SET LOCAL client_min_messages = warning;
SET LOCAL row_security = off;

CREATE SCHEMA accounting;

CREATE SCHEMA billing;

CREATE SCHEMA commerce;

CREATE SCHEMA content;

CREATE SCHEMA crm;

CREATE SCHEMA ext;

CREATE SCHEMA identity;

CREATE SCHEMA platform;

CREATE SCHEMA workflow;

CREATE TYPE accounting."AcceptedAction" AS ENUM (
    'none',
    'savedDraft',
    'appliedSuggestion',
    'dismissed'
);

CREATE TYPE accounting."AccountType" AS ENUM (
    'Asset',
    'Liability',
    'Equity',
    'Income',
    'Expense'
);

CREATE TYPE accounting."AiContextType" AS ENUM (
    'AccountingCopilotChat',
    'SuggestAccounts',
    'GenerateJournalDraft',
    'ExplainJournalEntry',
    'ExplainReport',
    'AnomalyScan',
    'CloseChecklist'
);

CREATE TYPE accounting."ConfidenceLevel" AS ENUM (
    'High',
    'Medium',
    'Low'
);

CREATE TYPE accounting."EntryStatus" AS ENUM (
    'Draft',
    'Posted',
    'Reversed'
);

CREATE TYPE accounting."LineDirection" AS ENUM (
    'Debit',
    'Credit'
);

CREATE TYPE accounting."PeriodStatus" AS ENUM (
    'Open',
    'Closed'
);

CREATE TYPE accounting."SourceType" AS ENUM (
    'Manual',
    'Invoice',
    'Payment',
    'Expense',
    'VendorBill',
    'BillPayment',
    'Migration',
    'Adjustment',
    'CashEntry'
);

CREATE TYPE billing."BillingProviderEventStatus" AS ENUM (
    'RECEIVED',
    'PROCESSED',
    'FAILED',
    'IGNORED'
);

CREATE TYPE billing."BillingProviderKind" AS ENUM (
    'STRIPE'
);

CREATE TYPE billing."BillingSubscriptionStatus" AS ENUM (
    'FREE',
    'TRIALING',
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'INCOMPLETE',
    'UNPAID'
);

CREATE TYPE billing."BillingTrialStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'SUPERSEDED_BY_SUBSCRIPTION'
);

CREATE TYPE billing."DeliveryStatus" AS ENUM (
    'QUEUED',
    'SENT',
    'DELIVERED',
    'BOUNCED',
    'FAILED',
    'DELAYED'
);

CREATE TYPE billing."ExpenseStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'PAID'
);

CREATE TYPE billing."InvoiceStatus" AS ENUM (
    'DRAFT',
    'ISSUED',
    'SENT',
    'PAID',
    'CANCELED'
);

CREATE TYPE billing."PaymentMethodType" AS ENUM (
    'BANK_TRANSFER',
    'PAYPAL',
    'CASH',
    'CARD',
    'OTHER'
);

CREATE TYPE billing."PdfStatus" AS ENUM (
    'NONE',
    'GENERATING',
    'READY',
    'FAILED'
);

CREATE TYPE billing."TaxCodeKind" AS ENUM (
    'STANDARD',
    'REDUCED',
    'REVERSE_CHARGE',
    'EXEMPT',
    'ZERO'
);

CREATE TYPE billing."TaxDocumentLinkEntityType" AS ENUM (
    'FILING',
    'PAYMENT'
);

CREATE TYPE billing."TaxEricJobAction" AS ENUM (
    'VALIDATE',
    'SUBMIT'
);

CREATE TYPE billing."TaxEricJobStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'VALIDATION_FAILED',
    'SUBMISSION_FAILED',
    'TECHNICAL_FAILED',
    'SUCCEEDED',
    'SUCCEEDED_WITH_WARNINGS'
);

CREATE TYPE billing."TaxRegime" AS ENUM (
    'SMALL_BUSINESS',
    'STANDARD_VAT',
    'VAT_EXEMPT'
);

CREATE TYPE billing."TaxReportGroup" AS ENUM (
    'ADVANCE_VAT',
    'ANNUAL_REPORT',
    'COMPLIANCE',
    'PAYROLL',
    'FINANCIAL_STATEMENT',
    'EXCISE'
);

CREATE TYPE billing."TaxReportStatus" AS ENUM (
    'UPCOMING',
    'OPEN',
    'SUBMITTED',
    'OVERDUE',
    'PAID',
    'NIL',
    'ARCHIVED'
);

CREATE TYPE billing."TaxReportType" AS ENUM (
    'VAT_ADVANCE',
    'VAT_ANNUAL',
    'INCOME_TAX',
    'EU_SALES_LIST',
    'INTRASTAT',
    'PAYROLL_TAX',
    'PROFIT_LOSS',
    'BALANCE_SHEET',
    'TRADE_TAX',
    'FIXED_ASSETS',
    'EXCISE_MONTHLY'
);

CREATE TYPE billing."TaxRoundingMode" AS ENUM (
    'PER_LINE',
    'PER_DOCUMENT'
);

CREATE TYPE billing."TaxSourceType" AS ENUM (
    'INVOICE',
    'EXPENSE'
);

CREATE TYPE billing."VatAccountingMethod" AS ENUM (
    'IST',
    'SOLL'
);

CREATE TYPE billing."VatFilingFrequency" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'YEARLY'
);

CREATE TYPE billing."VatPeriodStatus" AS ENUM (
    'OPEN',
    'OVERDUE',
    'SUBMITTED',
    'PAID',
    'NIL',
    'ARCHIVED'
);

CREATE TYPE commerce."BillPaymentMethod" AS ENUM (
    'BANK_TRANSFER',
    'CASH',
    'CARD',
    'OTHER'
);

CREATE TYPE commerce."BookingAllocationRole" AS ENUM (
    'PRIMARY',
    'SUPPORT',
    'ROOM',
    'EQUIPMENT'
);

CREATE TYPE commerce."BookingHoldStatus" AS ENUM (
    'ACTIVE',
    'CONFIRMED',
    'EXPIRED',
    'CANCELLED'
);

CREATE TYPE commerce."BookingResourceType" AS ENUM (
    'STAFF',
    'ROOM',
    'EQUIPMENT'
);

CREATE TYPE commerce."BookingStatus" AS ENUM (
    'DRAFT',
    'HOLD',
    'CONFIRMED',
    'CANCELLED',
    'NO_SHOW',
    'COMPLETED'
);

CREATE TYPE commerce."CashlessProviderKind" AS ENUM (
    'SUMUP',
    'ADYEN'
);

CREATE TYPE commerce."CatalogItemStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);

CREATE TYPE commerce."CatalogItemType" AS ENUM (
    'PRODUCT',
    'SERVICE'
);

CREATE TYPE commerce."CatalogPriceListStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);

CREATE TYPE commerce."CatalogTaxExciseType" AS ENUM (
    'PERCENT',
    'AMOUNT'
);

CREATE TYPE commerce."CatalogVariantStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);

CREATE TYPE commerce."ImportDocumentType" AS ENUM (
    'BILL_OF_LADING',
    'COMMERCIAL_INVOICE',
    'PACKING_LIST',
    'CERTIFICATE_OF_ORIGIN',
    'IMPORT_LICENSE',
    'CUSTOMS_DECLARATION',
    'INSPECTION_REPORT',
    'OTHER'
);

CREATE TYPE commerce."ImportShipmentStatus" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_TRANSIT',
    'CUSTOMS_CLEARANCE',
    'CLEARED',
    'RECEIVED',
    'CANCELED'
);

CREATE TYPE commerce."InventoryDocumentStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'POSTED',
    'CANCELED'
);

CREATE TYPE commerce."InventoryDocumentType" AS ENUM (
    'RECEIPT',
    'DELIVERY',
    'TRANSFER',
    'ADJUSTMENT'
);

CREATE TYPE commerce."InventoryLotStatus" AS ENUM (
    'AVAILABLE',
    'QUARANTINE',
    'BLOCKED',
    'DISPOSED'
);

CREATE TYPE commerce."KitchenTicketStatus" AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'DONE',
    'BUMPED'
);

CREATE TYPE commerce."LocationType" AS ENUM (
    'INTERNAL',
    'RECEIVING',
    'SHIPPING',
    'VIRTUAL'
);

CREATE TYPE commerce."ModifierSelectionMode" AS ENUM (
    'SINGLE',
    'MULTI'
);

CREATE TYPE commerce."NegativeStockPolicy" AS ENUM (
    'DISALLOW',
    'ALLOW'
);

CREATE TYPE commerce."PaymentAttemptStatus" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'PAID',
    'FAILED',
    'CANCELLED',
    'EXPIRED'
);

CREATE TYPE commerce."ProductType" AS ENUM (
    'STOCKABLE',
    'CONSUMABLE',
    'SERVICE'
);

CREATE TYPE commerce."PurchaseOrderStatus" AS ENUM (
    'DRAFT',
    'APPROVED',
    'SENT',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CLOSED',
    'CANCELED'
);

CREATE TYPE commerce."ReservationPolicy" AS ENUM (
    'FULL_ONLY'
);

CREATE TYPE commerce."ReservationStatus" AS ENUM (
    'ACTIVE',
    'RELEASED',
    'FULFILLED'
);

CREATE TYPE commerce."RestaurantApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'APPLIED'
);

CREATE TYPE commerce."RestaurantApprovalType" AS ENUM (
    'VOID',
    'DISCOUNT'
);

CREATE TYPE commerce."RestaurantOrderStatus" AS ENUM (
    'DRAFT',
    'PARTIALLY_SENT',
    'SENT',
    'PAID',
    'CLOSED',
    'CANCELLED'
);

CREATE TYPE commerce."RestaurantTableAvailabilityStatus" AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'DIRTY',
    'OUT_OF_SERVICE'
);

CREATE TYPE commerce."RestaurantTableSessionStatus" AS ENUM (
    'OPEN',
    'CLOSED',
    'TRANSFERRED'
);

CREATE TYPE commerce."RestaurantTableShape" AS ENUM (
    'SQUARE',
    'ROUND',
    'RECTANGLE'
);

CREATE TYPE commerce."SalesOrderStatus" AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'FULFILLED',
    'INVOICED',
    'CANCELED'
);

CREATE TYPE commerce."SalesQuoteStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'CONVERTED',
    'EXPIRED'
);

CREATE TYPE commerce."ShippingMode" AS ENUM (
    'SEA',
    'AIR',
    'LAND',
    'COURIER'
);

CREATE TYPE commerce."StockMoveReason" AS ENUM (
    'RECEIPT',
    'SHIPMENT',
    'TRANSFER',
    'ADJUSTMENT'
);

CREATE TYPE commerce."VendorBillStatus" AS ENUM (
    'DRAFT',
    'APPROVED',
    'POSTED',
    'PARTIALLY_PAID',
    'PAID',
    'VOID'
);

CREATE TYPE content."AvailabilityStatus" AS ENUM (
    'AVAILABLE',
    'BLOCKED'
);

CREATE TYPE content."CmsCommentStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SPAM',
    'DELETED'
);

CREATE TYPE content."CmsPostStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);

CREATE TYPE content."DirectoryLeadStatus" AS ENUM (
    'NEW',
    'CONTACTED',
    'CLOSED'
);

CREATE TYPE content."DirectoryRestaurantStatus" AS ENUM (
    'ACTIVE',
    'HIDDEN'
);

CREATE TYPE content."PortfolioClientType" AS ENUM (
    'cto',
    'freelancer',
    'partner',
    'employer',
    'other'
);

CREATE TYPE content."PortfolioContentStatus" AS ENUM (
    'draft',
    'published',
    'archived'
);

CREATE TYPE content."PortfolioProjectType" AS ENUM (
    'open_source',
    'side_hustle',
    'startup',
    'agency',
    'other'
);

CREATE TYPE content."PortfolioShowcaseType" AS ENUM (
    'individual',
    'company',
    'hybrid'
);

CREATE TYPE content."RentalStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);

CREATE TYPE content."WebsitePageStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED'
);

CREATE TYPE content."WebsiteQaScope" AS ENUM (
    'site',
    'page'
);

CREATE TYPE content."WebsiteQaStatus" AS ENUM (
    'draft',
    'published'
);

CREATE TYPE content."WebsiteWallOfLoveItemType" AS ENUM (
    'image',
    'youtube',
    'x'
);

CREATE TYPE content."WebsiteWallOfLoveStatus" AS ENUM (
    'draft',
    'published'
);

CREATE TYPE crm."AccountStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'PROSPECT'
);

CREATE TYPE crm."ActivityRecordSource" AS ENUM (
    'MANUAL',
    'SYSTEM',
    'INTEGRATION'
);

CREATE TYPE crm."ActivityStatus" AS ENUM (
    'OPEN',
    'COMPLETED',
    'CANCELED'
);

CREATE TYPE crm."ActivityType" AS ENUM (
    'NOTE',
    'TASK',
    'CALL',
    'MEETING',
    'COMMUNICATION',
    'SYSTEM_EVENT'
);

CREATE TYPE crm."AddressType" AS ENUM (
    'BILLING'
);

CREATE TYPE crm."ChannelCategory" AS ENUM (
    'EMAIL',
    'MESSAGING',
    'SOCIAL',
    'INTERNAL'
);

CREATE TYPE crm."CheckInByType" AS ENUM (
    'SELF_SERVICE',
    'EMPLOYEE'
);

CREATE TYPE crm."CheckInStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'CANCELED'
);

CREATE TYPE crm."ClassAttendanceStatus" AS ENUM (
    'PRESENT',
    'ABSENT',
    'MAKEUP',
    'EXCUSED'
);

CREATE TYPE crm."ClassBillingBasis" AS ENUM (
    'SCHEDULED_SESSIONS',
    'ATTENDED_SESSIONS'
);

CREATE TYPE crm."ClassBillingInvoicePurpose" AS ENUM (
    'DEPOSIT',
    'INSTALLMENT',
    'FINAL',
    'ADHOC',
    'MONTHLY_RUN'
);

CREATE TYPE crm."ClassBillingMonthStrategy" AS ENUM (
    'PREPAID_CURRENT_MONTH',
    'ARREARS_PREVIOUS_MONTH'
);

CREATE TYPE crm."ClassBillingRunStatus" AS ENUM (
    'DRAFT',
    'INVOICES_CREATED',
    'LOCKED',
    'FAILED'
);

CREATE TYPE crm."ClassDeliveryMode" AS ENUM (
    'ONLINE',
    'HYBRID',
    'IN_PERSON'
);

CREATE TYPE crm."ClassEnrollmentBillingPlanType" AS ENUM (
    'UPFRONT',
    'INSTALLMENTS',
    'INVOICE_NET',
    'SUBSCRIPTION'
);

CREATE TYPE crm."ClassEnrollmentSeatType" AS ENUM (
    'LEARNER',
    'AUDITOR',
    'SPONSORED'
);

CREATE TYPE crm."ClassEnrollmentSource" AS ENUM (
    'SELF_SERVE',
    'SALES',
    'ADMIN',
    'PARTNER'
);

CREATE TYPE crm."ClassEnrollmentStatus" AS ENUM (
    'APPLIED',
    'ENROLLED',
    'DEFERRED',
    'DROPPED',
    'COMPLETED'
);

CREATE TYPE crm."ClassGroupInstructorRole" AS ENUM (
    'INSTRUCTOR',
    'MENTOR',
    'TA'
);

CREATE TYPE crm."ClassGroupKind" AS ENUM (
    'COHORT',
    'DROP_IN',
    'OFFICE_HOURS',
    'WORKSHOP'
);

CREATE TYPE crm."ClassGroupLifecycle" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'RUNNING',
    'ENDED',
    'ARCHIVED'
);

CREATE TYPE crm."ClassGroupStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);

CREATE TYPE crm."ClassMilestoneCompletionStatus" AS ENUM (
    'NOT_STARTED',
    'SUBMITTED',
    'PASSED',
    'FAILED'
);

CREATE TYPE crm."ClassMilestoneType" AS ENUM (
    'PROJECT',
    'ASSESSMENT',
    'CHECKPOINT'
);

CREATE TYPE crm."ClassResourceType" AS ENUM (
    'RECORDING',
    'DOC',
    'LINK'
);

CREATE TYPE crm."ClassResourceVisibility" AS ENUM (
    'ENROLLED_ONLY',
    'PUBLIC'
);

CREATE TYPE crm."ClassSessionStatus" AS ENUM (
    'PLANNED',
    'DONE',
    'CANCELLED'
);

CREATE TYPE crm."ClassSessionType" AS ENUM (
    'LECTURE',
    'LAB',
    'OFFICE_HOURS',
    'REVIEW',
    'DEMO_DAY'
);

CREATE TYPE crm."CoachingContractRequestStatus" AS ENUM (
    'pending',
    'viewed',
    'signed',
    'failed'
);

CREATE TYPE crm."CoachingContractStatus" AS ENUM (
    'not_required',
    'pending',
    'signed',
    'failed'
);

CREATE TYPE crm."CoachingEngagementStatus" AS ENUM (
    'draft',
    'pending_payment',
    'pending_signature',
    'confirmed',
    'prep_pending',
    'ready',
    'session_done',
    'debrief_pending',
    'completed',
    'archived'
);

CREATE TYPE crm."CoachingExportBundleStatus" AS ENUM (
    'pending',
    'ready',
    'failed'
);

CREATE TYPE crm."CoachingPaymentRecordStatus" AS ENUM (
    'pending',
    'captured',
    'failed',
    'refunded'
);

CREATE TYPE crm."CoachingPaymentStatus" AS ENUM (
    'not_required',
    'pending',
    'captured',
    'failed'
);

CREATE TYPE crm."CoachingSessionStatus" AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
);

CREATE TYPE crm."CommunicationDirection" AS ENUM (
    'INBOUND',
    'OUTBOUND'
);

CREATE TYPE crm."CommunicationLifecycleStatus" AS ENUM (
    'LOGGED',
    'DRAFT',
    'QUEUED',
    'SENT',
    'DELIVERED',
    'READ',
    'FAILED'
);

CREATE TYPE crm."ContactPointType" AS ENUM (
    'EMAIL',
    'PHONE',
    'SOCIAL'
);

CREATE TYPE crm."CrmAccountType" AS ENUM (
    'CUSTOMER',
    'VENDOR',
    'PARTNER',
    'OTHER'
);

CREATE TYPE crm."CustomerPackageStatus" AS ENUM (
    'ACTIVE',
    'CANCELED',
    'EXPIRED',
    'DEPLETED'
);

CREATE TYPE crm."DealStatus" AS ENUM (
    'OPEN',
    'WON',
    'LOST'
);

CREATE TYPE crm."EnrollmentStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'CANCELED'
);

CREATE TYPE crm."IssueActivityType" AS ENUM (
    'CREATED',
    'COMMENT_ADDED',
    'STATUS_CHANGED',
    'ATTACHMENT_ADDED',
    'RESOLVED',
    'REOPENED',
    'ASSIGNED'
);

CREATE TYPE crm."IssueAttachmentKind" AS ENUM (
    'IMAGE',
    'AUDIO'
);

CREATE TYPE crm."IssuePriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);

CREATE TYPE crm."IssueSiteType" AS ENUM (
    'FIELD',
    'CUSTOMER',
    'MANUFACTURER'
);

CREATE TYPE crm."IssueStatus" AS ENUM (
    'NEW',
    'TRIAGED',
    'IN_PROGRESS',
    'WAITING',
    'RESOLVED',
    'CLOSED',
    'REOPENED'
);

CREATE TYPE crm."IssueTranscriptionStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE crm."LeadSource" AS ENUM (
    'WEB_FORM',
    'MANUAL',
    'IMPORT',
    'REFERRAL',
    'OTHER'
);

CREATE TYPE crm."LeadStatus" AS ENUM (
    'NEW',
    'QUALIFIED',
    'DISQUALIFIED',
    'CONVERTED'
);

CREATE TYPE crm."LoyaltyAccountStatus" AS ENUM (
    'ACTIVE',
    'SUSPENDED'
);

CREATE TYPE crm."LoyaltyEntryType" AS ENUM (
    'EARN',
    'REDEEM',
    'ADJUST',
    'EXPIRE'
);

CREATE TYPE crm."LoyaltyReasonCode" AS ENUM (
    'VISIT_CHECKIN',
    'MANUAL_ADJUSTMENT',
    'REWARD_REDEMPTION',
    'EXPIRATION'
);

CREATE TYPE crm."MeetingProvider" AS ENUM (
    'ZOOM',
    'GOOGLE_MEET',
    'TEAMS',
    'OTHER'
);

CREATE TYPE crm."PartyKind" AS ENUM (
    'INDIVIDUAL',
    'ORGANIZATION'
);

CREATE TYPE crm."PartyLifecycleStatus" AS ENUM (
    'LEAD',
    'ACTIVE',
    'PAUSED',
    'ARCHIVED'
);

CREATE TYPE crm."PartyRelationshipType" AS ENUM (
    'WORKS_FOR',
    'SUBSIDIARY_OF',
    'PARTNER_OF'
);

CREATE TYPE crm."PartyRoleType" AS ENUM (
    'CUSTOMER',
    'SUPPLIER',
    'EMPLOYEE',
    'CONTACT',
    'STUDENT',
    'GUARDIAN'
);

CREATE TYPE crm."SequenceStatus" AS ENUM (
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'ARCHIVED'
);

CREATE TYPE crm."SequenceStepType" AS ENUM (
    'EMAIL_AUTO',
    'EMAIL_MANUAL',
    'CALL',
    'TASK'
);

CREATE TYPE identity."PermissionEffect" AS ENUM (
    'ALLOW',
    'DENY'
);

CREATE TYPE identity."PrivacyRequestStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'READY',
    'COMPLETED',
    'FAILED'
);

CREATE TYPE identity."PrivacyRequestType" AS ENUM (
    'EXPORT',
    'ERASE'
);

CREATE TYPE identity."RoleScope" AS ENUM (
    'HOST',
    'TENANT'
);

CREATE TYPE platform."CustomFieldType" AS ENUM (
    'TEXT',
    'NUMBER',
    'DATE',
    'BOOLEAN',
    'SELECT',
    'MULTI_SELECT',
    'MONEY'
);

CREATE TYPE platform."DocumentLinkEntityType" AS ENUM (
    'INVOICE',
    'EXPENSE',
    'AGENT_RUN',
    'MESSAGE',
    'OTHER',
    'CLASS_GROUP',
    'CLASS_SESSION',
    'PARTY',
    'COACHING_ENGAGEMENT',
    'COACHING_SESSION'
);

CREATE TYPE platform."DocumentStatus" AS ENUM (
    'PENDING',
    'READY',
    'FAILED',
    'QUARANTINED'
);

CREATE TYPE platform."DocumentType" AS ENUM (
    'UPLOAD',
    'RECEIPT',
    'CONTRACT',
    'INVOICE_PDF',
    'OTHER'
);

CREATE TYPE platform."FileKind" AS ENUM (
    'ORIGINAL',
    'DERIVED',
    'GENERATED'
);

CREATE TYPE platform."FormFieldType" AS ENUM (
    'SHORT_TEXT',
    'LONG_TEXT',
    'NUMBER',
    'DATE',
    'BOOLEAN',
    'SINGLE_SELECT',
    'MULTI_SELECT',
    'EMAIL'
);

CREATE TYPE platform."FormPostSubmitAction" AS ENUM (
    'NONE',
    'CREATE_TUTORING_LEAD'
);

CREATE TYPE platform."FormStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED'
);

CREATE TYPE platform."FormSubmissionSource" AS ENUM (
    'PUBLIC',
    'INTERNAL'
);

CREATE TYPE platform."IntegrationAuthMethod" AS ENUM (
    'API_KEY',
    'OAUTH2'
);

CREATE TYPE platform."IntegrationConnectionStatus" AS ENUM (
    'ACTIVE',
    'INVALID',
    'DISABLED'
);

CREATE TYPE platform."IntegrationKind" AS ENUM (
    'SUMUP',
    'ADYEN',
    'MICROSOFT_GRAPH_MAIL',
    'GOOGLE_GMAIL',
    'RESEND'
);

CREATE TYPE platform."MenuScope" AS ENUM (
    'WEB',
    'POS'
);

CREATE TYPE platform."PackInstallStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'FAILED',
    'COMPLETED'
);

CREATE TYPE platform."StorageProvider" AS ENUM (
    'gcs',
    's3',
    'azure'
);

CREATE TYPE platform."WorkspaceInviteStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'CANCELED'
);

CREATE TYPE platform."WorkspaceMembershipRole" AS ENUM (
    'OWNER',
    'ADMIN',
    'MEMBER',
    'ACCOUNTANT',
    'VIEWER'
);

CREATE TYPE platform."WorkspaceMembershipStatus" AS ENUM (
    'ACTIVE',
    'INVITED',
    'DISABLED'
);

CREATE TYPE platform."WorkspaceOnboardingStatus" AS ENUM (
    'NEW',
    'PROFILE',
    'TAX',
    'BANK',
    'DONE'
);

CREATE TYPE workflow."OutboxStatus" AS ENUM (
    'PENDING',
    'SENT',
    'FAILED',
    'PROCESSING'
);

CREATE TYPE workflow."TaskStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'SKIPPED'
);

CREATE TYPE workflow."TaskType" AS ENUM (
    'HUMAN',
    'TIMER',
    'HTTP',
    'EMAIL',
    'AI',
    'SYSTEM'
);

CREATE TYPE workflow."WorkflowDefinitionStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'ARCHIVED'
);

CREATE TYPE workflow."WorkflowDefinitionType" AS ENUM (
    'GENERAL',
    'APPROVAL'
);

CREATE TYPE workflow."WorkflowInstanceStatus" AS ENUM (
    'PENDING',
    'RUNNING',
    'WAITING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

SET LOCAL default_tablespace = '';

SET LOCAL default_table_access_method = heap;

CREATE TABLE accounting."AccountingPeriod" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "fiscalYearId" text NOT NULL,
    name text NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    status accounting."PeriodStatus" DEFAULT 'Open'::accounting."PeriodStatus" NOT NULL,
    "closedAt" timestamp(6) with time zone,
    "closedBy" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE accounting."AccountingSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "baseCurrency" character varying(3) NOT NULL,
    "fiscalYearStartMonthDay" text NOT NULL,
    "periodLockingEnabled" boolean DEFAULT false NOT NULL,
    "entryNumberPrefix" text DEFAULT 'JE'::text NOT NULL,
    "nextEntryNumber" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE accounting."AiInteraction" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "actorUserId" text NOT NULL,
    "contextType" accounting."AiContextType" NOT NULL,
    "inputSummary" text NOT NULL,
    "outputSummary" text NOT NULL,
    confidence accounting."ConfidenceLevel",
    "confidenceScore" double precision,
    "referencedData" text,
    "acceptedAction" accounting."AcceptedAction" DEFAULT 'none'::accounting."AcceptedAction" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE accounting."JournalEntry" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entryNumber" text,
    status accounting."EntryStatus" DEFAULT 'Draft'::accounting."EntryStatus" NOT NULL,
    "postingDate" date NOT NULL,
    memo text NOT NULL,
    "sourceType" accounting."SourceType",
    "sourceId" text,
    "sourceRef" text,
    "reversesEntryId" text,
    "reversedByEntryId" text,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "postedBy" text,
    "postedAt" timestamp(6) with time zone,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE accounting."JournalLine" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "journalEntryId" text NOT NULL,
    "ledgerAccountId" text NOT NULL,
    direction accounting."LineDirection" NOT NULL,
    "amountCents" integer NOT NULL,
    currency character varying(3) NOT NULL,
    "lineMemo" text,
    reference text,
    tags text
);

CREATE TABLE accounting."LedgerAccount" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    type accounting."AccountType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    description text,
    "systemAccountKey" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE accounting.cash_assistant_workspaces (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text,
    "locationId" text,
    type text NOT NULL,
    "conversationId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone,
    "cashDayId" text,
    "createdByUserId" text DEFAULT 'system'::text NOT NULL,
    "businessDate" date,
    "businessMonth" date,
    CONSTRAINT cash_assistant_workspaces_check_daily CHECK (((type <> 'DAILY_CASH_DAY'::text) OR (("businessDate" IS NOT NULL) AND ("businessMonth" IS NULL) AND ("locationId" IS NOT NULL) AND ("registerId" IS NOT NULL)))),
    CONSTRAINT cash_assistant_workspaces_check_general CHECK (((type <> 'GENERAL_HELP'::text) OR (("businessDate" IS NULL) AND ("businessMonth" IS NULL) AND ("cashDayId" IS NULL)))),
    CONSTRAINT cash_assistant_workspaces_check_monthly CHECK (((type <> 'MONTHLY_REVIEW'::text) OR (("businessDate" IS NULL) AND ("businessMonth" IS NOT NULL) AND ("locationId" IS NOT NULL) AND ("registerId" IS NOT NULL))))
);

CREATE TABLE accounting.cash_day_close_count_lines (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "dayCloseId" text NOT NULL,
    "denominationCents" integer NOT NULL,
    count integer NOT NULL,
    "subtotalCents" integer NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE accounting.cash_day_close_review_requirements (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "revisionId" text NOT NULL,
    "affectedDayCloseId" text NOT NULL,
    status text DEFAULT 'REVIEW_REQUIRED'::text NOT NULL,
    "reviewedAt" timestamp(6) with time zone,
    "reviewedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE accounting.cash_day_close_revisions (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text NOT NULL,
    "dayCloseId" text NOT NULL,
    "correctionEntryId" text NOT NULL,
    "revisionNo" integer NOT NULL,
    "correctionType" text NOT NULL,
    reason text NOT NULL,
    "occurredAt" timestamp(6) with time zone NOT NULL,
    "recordedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" text NOT NULL,
    "originalSnapshot" jsonb NOT NULL,
    "correctedSnapshot" jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE accounting.cash_day_closes (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text NOT NULL,
    "businessDate" text NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "expectedBalanceCents" integer NOT NULL,
    "countedBalanceCents" integer,
    "differenceCents" integer,
    notes text,
    "closedAt" timestamp(6) with time zone,
    "closedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "dayKey" text NOT NULL,
    note text,
    "submittedAt" timestamp(6) with time zone,
    "submittedByUserId" text,
    "lockedAt" timestamp(6) with time zone,
    "lockedByUserId" text,
    "verificationStatus" text DEFAULT 'NOT_COUNTED'::text NOT NULL
);

CREATE TABLE accounting.cash_day_confirmations (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text NOT NULL,
    "conversationId" text NOT NULL,
    "preparedByUserId" text NOT NULL,
    "businessDate" text NOT NULL,
    "candidatePayload" jsonb NOT NULL,
    "candidateHash" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "confirmedAt" timestamp(6) with time zone,
    "consumedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE accounting.cash_entries (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text NOT NULL,
    type text NOT NULL,
    "amountCents" integer NOT NULL,
    "sourceType" text NOT NULL,
    description text NOT NULL,
    "referenceId" text,
    "businessDate" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" text NOT NULL,
    "entryNo" integer NOT NULL,
    direction text NOT NULL,
    "entryType" text NOT NULL,
    source text NOT NULL,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::bpchar NOT NULL,
    "occurredAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dayKey" text NOT NULL,
    "balanceAfterCents" integer DEFAULT 0 NOT NULL,
    "reversalOfEntryId" text,
    "reversedByEntryId" text,
    "lockedByDayCloseId" text,
    "grossAmountCents" integer NOT NULL,
    "netAmountCents" integer,
    "taxAmountCents" integer,
    "taxMode" text,
    "taxCodeId" text,
    "taxCode" text,
    "taxRateBps" integer,
    "taxLabel" text,
    "sourceDocumentId" text,
    "sourceDocumentRef" text,
    "sourceDocumentKind" text,
    "idempotencyKey" text
);

CREATE TABLE accounting.cash_entry_attachments (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "entryId" text NOT NULL,
    "documentId" text NOT NULL,
    "uploadedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE accounting.cash_entry_confirmations (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text NOT NULL,
    "conversationId" text,
    "preparedByUserId" text NOT NULL,
    "businessDate" text NOT NULL,
    "candidatePayload" jsonb NOT NULL,
    "candidateHash" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "confirmedAt" timestamp(6) with time zone,
    "consumedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "consumedEntryId" text
);

CREATE TABLE accounting.cash_entry_counters (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text NOT NULL,
    "lastEntryNo" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE accounting.cash_export_artifacts (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "registerId" text NOT NULL,
    month text NOT NULL,
    format text NOT NULL,
    "fileName" text NOT NULL,
    "contentType" text NOT NULL,
    "contentBase64" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(6) with time zone
);

CREATE TABLE accounting.cash_location_transfers (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "cashFundId" text NOT NULL,
    "fromLocationId" text NOT NULL,
    "toLocationId" text NOT NULL,
    "amountCents" integer NOT NULL,
    "occurredAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "businessDate" text NOT NULL,
    "createdByUserId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE accounting.cash_registers (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    location text,
    currency character varying(3) DEFAULT 'EUR'::bpchar NOT NULL,
    "currentBalanceCents" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "disallowNegativeBalance" boolean DEFAULT false NOT NULL
);

CREATE TABLE accounting.cash_workspace_handoffs (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "locationId" text,
    "registerId" text NOT NULL,
    "sourceWorkspaceId" text NOT NULL,
    "targetWorkspaceId" text NOT NULL,
    "sourceConversationId" text NOT NULL,
    "sourceMessageId" text NOT NULL,
    "businessDate" text NOT NULL,
    "movementType" text NOT NULL,
    "amountCents" integer NOT NULL,
    description text NOT NULL,
    "evidenceRequirement" text,
    "candidateHash" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "confirmationId" text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    "viewedAt" timestamp(6) with time zone,
    "viewedByUserId" text,
    "consumedAt" timestamp(6) with time zone,
    "cancelledAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."BankAccount" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "legalEntityId" text NOT NULL,
    label text NOT NULL,
    "accountHolderName" text NOT NULL,
    iban text NOT NULL,
    bic text,
    "bankName" text,
    currency character varying(3) DEFAULT 'EUR'::bpchar NOT NULL,
    country character(2),
    "isActive" boolean DEFAULT true NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."BillingAccount" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    provider billing."BillingProviderKind",
    "providerCustomerRef" text,
    "billingCurrency" character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    email text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."BillingProviderEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "accountId" text,
    provider billing."BillingProviderKind" NOT NULL,
    "externalEventId" text NOT NULL,
    "eventType" text NOT NULL,
    "payloadJson" jsonb NOT NULL,
    status billing."BillingProviderEventStatus" DEFAULT 'RECEIVED'::billing."BillingProviderEventStatus" NOT NULL,
    "errorMessage" text,
    "processedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."BillingSubscription" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productKey" text NOT NULL,
    "accountId" text NOT NULL,
    "planCode" text NOT NULL,
    provider billing."BillingProviderKind",
    "providerSubscriptionRef" text,
    "providerPriceRef" text,
    status billing."BillingSubscriptionStatus" DEFAULT 'FREE'::billing."BillingSubscriptionStatus" NOT NULL,
    "currentPeriodStart" timestamp(6) with time zone,
    "currentPeriodEnd" timestamp(6) with time zone,
    "cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
    "canceledAt" timestamp(6) with time zone,
    "trialEndsAt" timestamp(6) with time zone,
    "rawSnapshotJson" jsonb,
    "lastSyncedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."BillingTrial" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productKey" text NOT NULL,
    "accountId" text NOT NULL,
    "planCode" text NOT NULL,
    status billing."BillingTrialStatus" DEFAULT 'ACTIVE'::billing."BillingTrialStatus" NOT NULL,
    "startedAt" timestamp(6) with time zone NOT NULL,
    "endsAt" timestamp(6) with time zone NOT NULL,
    "expiredAt" timestamp(6) with time zone,
    "supersededAt" timestamp(6) with time zone,
    "activatedByUserId" text,
    source text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."BillingUsageCounter" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productKey" text NOT NULL,
    "metricKey" text NOT NULL,
    "periodStart" timestamp(6) with time zone NOT NULL,
    "periodEnd" timestamp(6) with time zone NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."Expense" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    status billing."ExpenseStatus" DEFAULT 'DRAFT'::billing."ExpenseStatus" NOT NULL,
    "expenseDate" date NOT NULL,
    "merchantName" text,
    "supplierPartyId" text,
    currency character varying(3) NOT NULL,
    notes text,
    category text,
    "totalAmountCents" integer NOT NULL,
    "taxAmountCents" integer,
    "archivedAt" timestamp(6) with time zone,
    "archivedByUserId" text,
    "createdByUserId" text,
    custom jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "deductiblePercent" integer,
    "deductibleAmountCents" integer,
    "nonDeductibleAmountCents" integer,
    "deductibilityRuleKind" text,
    "deductibilityMeta" jsonb
);

COMMENT ON COLUMN billing."Expense"."deductiblePercent" IS 'DE EStG: computed income-tax deductibility percentage (0-100). NULL = not yet computed.';

COMMENT ON COLUMN billing."Expense"."deductibleAmountCents" IS 'DE EStG: deductible portion in euro cents.';

COMMENT ON COLUMN billing."Expense"."nonDeductibleAmountCents" IS 'DE EStG: non-deductible portion in euro cents.';

COMMENT ON COLUMN billing."Expense"."deductibilityRuleKind" IS 'DE EStG: rule kind identifier (PERCENT | GIFT_THRESHOLD_PER_RECIPIENT_YEAR | PER_DIEM | MIXED_USE).';

COMMENT ON COLUMN billing."Expense"."deductibilityMeta" IS 'DE EStG: JSON metadata used in computation (recipient, occasion, participants, travelMeta, homeOfficeDays, etc.).';

CREATE TABLE billing."ExpenseLine" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "expenseId" text NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "unitPriceCents" integer NOT NULL,
    "lineTotalCents" integer NOT NULL,
    "taxRate" double precision,
    category text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE billing."Invoice" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerPartyId" text NOT NULL,
    "billToName" text,
    "billToEmail" text,
    "billToVatId" text,
    "billToAddressLine1" text,
    "billToAddressLine2" text,
    "billToCity" text,
    "billToPostalCode" text,
    "billToCountry" text,
    number text,
    status billing."InvoiceStatus" DEFAULT 'DRAFT'::billing."InvoiceStatus" NOT NULL,
    currency character varying(3) NOT NULL,
    notes text,
    terms text,
    "legalEntityId" text,
    "paymentMethodId" text,
    "issuerSnapshot" jsonb,
    "taxSnapshot" jsonb,
    "paymentSnapshot" jsonb,
    "paymentDetails" jsonb,
    "invoiceDate" date,
    "dueDate" date,
    "issuedAt" timestamp(6) with time zone,
    "sentAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "pdfStorageKey" text,
    "pdfGeneratedAt" timestamp(6) with time zone,
    "pdfSourceVersion" text,
    "pdfStatus" billing."PdfStatus" DEFAULT 'NONE'::billing."PdfStatus" NOT NULL,
    "pdfFailureReason" text,
    "sourceType" text,
    "sourceId" text
);

CREATE TABLE billing."InvoiceEmailDelivery" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "invoiceId" text NOT NULL,
    "to" text NOT NULL,
    status billing."DeliveryStatus" DEFAULT 'QUEUED'::billing."DeliveryStatus" NOT NULL,
    provider text DEFAULT 'resend'::text NOT NULL,
    "providerMessageId" text,
    "idempotencyKey" text NOT NULL,
    "lastError" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."InvoiceLine" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    description text NOT NULL,
    qty integer NOT NULL,
    "unitPriceCents" integer NOT NULL
);

CREATE TABLE billing."InvoicePayment" (
    id text NOT NULL,
    "invoiceId" text NOT NULL,
    "amountCents" integer NOT NULL,
    "paidAt" timestamp(6) with time zone NOT NULL,
    note text
);

CREATE TABLE billing."InvoiceReminderState" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "invoiceId" text NOT NULL,
    "remindersSent" integer DEFAULT 0 NOT NULL,
    "nextReminderAt" timestamp(6) with time zone,
    "lastReminderAt" timestamp(6) with time zone,
    "lockedAt" timestamp(6) with time zone,
    "lockedBy" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."PaymentMethod" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "legalEntityId" text NOT NULL,
    type billing."PaymentMethodType" NOT NULL,
    label text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isDefaultForInvoicing" boolean DEFAULT false NOT NULL,
    "bankAccountId" text,
    instructions text,
    "payUrl" text,
    "referenceTemplate" text DEFAULT 'INV-{invoiceNumber}'::text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxCode" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    code text NOT NULL,
    kind billing."TaxCodeKind" NOT NULL,
    label text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxConsultant" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    notes text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxDocumentLink" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entityType" billing."TaxDocumentLinkEntityType" NOT NULL,
    "entityId" text NOT NULL,
    "documentId" text NOT NULL,
    label text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text
);

CREATE TABLE billing."TaxEricJob" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "filingId" text NOT NULL,
    "reportId" text NOT NULL,
    "reportType" character varying(64) NOT NULL,
    action billing."TaxEricJobAction" NOT NULL,
    status billing."TaxEricJobStatus" NOT NULL,
    "requestPayload" jsonb,
    "responsePayload" jsonb,
    "errorMessage" text,
    artifacts jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startedAt" timestamp(6) with time zone,
    "finishedAt" timestamp(6) with time zone,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "certificateReferenceId" character varying(128),
    "correlationId" text,
    "declarationType" character varying(64),
    "ericVersion" character varying(64),
    "gatewayVersion" character varying(64),
    "idempotencyKey" text,
    messages jsonb,
    outcome character varying(64),
    "payloadVersion" character varying(64),
    "requestHash" character varying(128),
    "resultCodes" jsonb,
    "technicalDetails" jsonb,
    "transferReference" character varying(128)
);

CREATE TABLE billing."TaxFilingEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "filingId" text NOT NULL,
    "eventType" text NOT NULL,
    payload jsonb NOT NULL,
    "occurredAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "processedAt" timestamp(6) with time zone
);

CREATE TABLE billing."TaxProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    country text NOT NULL,
    regime billing."TaxRegime" NOT NULL,
    "vatEnabled" boolean DEFAULT true NOT NULL,
    "vatId" text,
    currency character varying(3) DEFAULT 'EUR'::text NOT NULL,
    "filingFrequency" billing."VatFilingFrequency" NOT NULL,
    "taxYearStartMonth" integer,
    "vatAccountingMethod" billing."VatAccountingMethod" DEFAULT 'IST'::billing."VatAccountingMethod" NOT NULL,
    "localTaxOfficeName" text,
    "vatExemptionParagraph" text,
    "euB2BSales" boolean DEFAULT false NOT NULL,
    "hasEmployees" boolean DEFAULT false NOT NULL,
    "usesTaxAdvisor" boolean DEFAULT false NOT NULL,
    "effectiveFrom" timestamp(6) with time zone NOT NULL,
    "effectiveTo" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxRate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "taxCodeId" text NOT NULL,
    "rateBps" integer NOT NULL,
    "effectiveFrom" timestamp(6) with time zone NOT NULL,
    "effectiveTo" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxReport" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    type billing."TaxReportType" NOT NULL,
    "group" billing."TaxReportGroup" NOT NULL,
    "periodLabel" text NOT NULL,
    "periodStart" timestamp(6) with time zone NOT NULL,
    "periodEnd" timestamp(6) with time zone NOT NULL,
    "dueDate" timestamp(6) with time zone NOT NULL,
    status billing."TaxReportStatus" NOT NULL,
    "amountEstimatedCents" integer,
    "amountFinalCents" integer,
    currency character varying(3) DEFAULT 'EUR'::text NOT NULL,
    "submittedAt" timestamp(6) with time zone,
    "submissionReference" text,
    "submissionNotes" text,
    "archivedReason" text,
    "pdfStorageKey" text,
    "pdfGeneratedAt" timestamp(6) with time zone,
    meta jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxReportLine" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "reportId" text NOT NULL,
    section text,
    label text,
    "netAmountCents" integer NOT NULL,
    "taxAmountCents" integer,
    meta jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxReportSection" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "filingId" text NOT NULL,
    "reportId" text NOT NULL,
    "reportType" character varying(64) NOT NULL,
    "sectionKey" character varying(64) NOT NULL,
    payload jsonb NOT NULL,
    completion double precision DEFAULT 0 NOT NULL,
    "isComplete" boolean DEFAULT false NOT NULL,
    "validationErrors" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE billing."TaxSnapshot" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "sourceType" billing."TaxSourceType" NOT NULL,
    "sourceId" text NOT NULL,
    jurisdiction text NOT NULL,
    regime billing."TaxRegime" NOT NULL,
    "roundingMode" billing."TaxRoundingMode" NOT NULL,
    currency character varying(3) NOT NULL,
    "calculatedAt" timestamp(6) with time zone NOT NULL,
    "subtotalAmountCents" integer NOT NULL,
    "taxTotalAmountCents" integer NOT NULL,
    "totalAmountCents" integer NOT NULL,
    "breakdownJson" text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "packId" text
);

CREATE TABLE billing."VatPeriodSummary" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "periodStart" timestamp(6) with time zone NOT NULL,
    "periodEnd" timestamp(6) with time zone NOT NULL,
    currency character varying(3) NOT NULL,
    "totalsByKindJson" text NOT NULL,
    "generatedAt" timestamp(6) with time zone NOT NULL,
    status billing."VatPeriodStatus" DEFAULT 'OPEN'::billing."VatPeriodStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."BillPayment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "vendorBillId" text NOT NULL,
    "amountCents" integer NOT NULL,
    currency character varying(3) NOT NULL,
    "paymentDate" date NOT NULL,
    method commerce."BillPaymentMethod" NOT NULL,
    reference text,
    notes text,
    "recordedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "recordedByUserId" text,
    "journalEntryId" text
);

CREATE TABLE commerce."Booking" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text,
    status commerce."BookingStatus" DEFAULT 'DRAFT'::commerce."BookingStatus" NOT NULL,
    "startAt" timestamp(6) with time zone NOT NULL,
    "endAt" timestamp(6) with time zone NOT NULL,
    "referenceNumber" character varying(40),
    "serviceOfferingId" text,
    "bookedByPartyId" text,
    "bookedByName" character varying(200),
    "bookedByEmail" character varying(320),
    notes text,
    "holdId" text,
    "cancelledAt" timestamp(6) with time zone,
    "cancelledReason" text,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."BookingAllocation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "bookingId" text NOT NULL,
    "resourceId" text NOT NULL,
    role commerce."BookingAllocationRole" DEFAULT 'PRIMARY'::commerce."BookingAllocationRole" NOT NULL,
    "startAt" timestamp(6) with time zone NOT NULL,
    "endAt" timestamp(6) with time zone NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE commerce."BookingAvailabilityRule" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "resourceId" text NOT NULL,
    timezone character varying(64) DEFAULT 'UTC'::character varying NOT NULL,
    "weeklySlots" jsonb NOT NULL,
    blackouts jsonb DEFAULT '[]'::jsonb NOT NULL,
    "effectiveFrom" timestamp(6) with time zone,
    "effectiveTo" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."BookingHold" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text,
    status commerce."BookingHoldStatus" DEFAULT 'ACTIVE'::commerce."BookingHoldStatus" NOT NULL,
    "startAt" timestamp(6) with time zone NOT NULL,
    "endAt" timestamp(6) with time zone NOT NULL,
    "serviceOfferingId" text,
    "resourceIds" text[],
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "bookedByPartyId" text,
    "bookedByName" character varying(200),
    "bookedByEmail" character varying(320),
    notes text,
    "confirmedBookingId" text,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE commerce."BookingResource" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text,
    type commerce."BookingResourceType" NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    location character varying(500),
    capacity integer,
    tags text[],
    attributes jsonb,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."BookingServiceOffering" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text,
    name character varying(200) NOT NULL,
    description text,
    "durationMinutes" integer NOT NULL,
    "bufferBeforeMinutes" integer DEFAULT 0 NOT NULL,
    "bufferAfterMinutes" integer DEFAULT 0 NOT NULL,
    "priceCents" integer,
    currency character varying(3),
    "depositCents" integer,
    "requiredResourceTypes" text[],
    "requiredTags" text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."CatalogCategory" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone
);

CREATE TABLE commerce."CatalogItem" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    status commerce."CatalogItemStatus" DEFAULT 'ACTIVE'::commerce."CatalogItemStatus" NOT NULL,
    type commerce."CatalogItemType" NOT NULL,
    "defaultUomId" text NOT NULL,
    "taxProfileId" text,
    "shelfLifeDays" integer,
    "requiresLotTracking" boolean DEFAULT false NOT NULL,
    "requiresExpiryDate" boolean DEFAULT false NOT NULL,
    "hsCode" text,
    metadata jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone
);

CREATE TABLE commerce."CatalogItemCategory" (
    "itemId" text NOT NULL,
    "categoryId" text NOT NULL
);

CREATE TABLE commerce."CatalogPrice" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "priceListId" text NOT NULL,
    "itemId" text,
    "variantId" text,
    amount numeric(19,4) NOT NULL,
    "taxIncluded" boolean DEFAULT false NOT NULL,
    "effectiveFrom" timestamp(6) with time zone,
    "effectiveTo" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    CONSTRAINT "CatalogPrice_item_or_variant_check" CHECK ((("itemId" IS NOT NULL) OR ("variantId" IS NOT NULL)))
);

CREATE TABLE commerce."CatalogPriceList" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    currency character varying(3) NOT NULL,
    status commerce."CatalogPriceListStatus" DEFAULT 'ACTIVE'::commerce."CatalogPriceListStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone,
    CONSTRAINT "CatalogPriceList_currency_check" CHECK ((char_length((currency)::text) = 3))
);

CREATE TABLE commerce."CatalogTaxProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    "vatRateBps" integer DEFAULT 0 NOT NULL,
    "isExciseApplicable" boolean DEFAULT false NOT NULL,
    "exciseType" commerce."CatalogTaxExciseType",
    "exciseValue" numeric(19,6),
    "effectiveFrom" timestamp(6) with time zone,
    "effectiveTo" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone
);

CREATE TABLE commerce."CatalogUom" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "baseCode" text,
    factor numeric(19,6),
    rounding integer,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."CatalogVariant" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "itemId" text NOT NULL,
    sku text NOT NULL,
    name text,
    attributes jsonb,
    status commerce."CatalogVariantStatus" DEFAULT 'ACTIVE'::commerce."CatalogVariantStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone
);

CREATE TABLE commerce."CatalogVariantBarcode" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "variantId" text NOT NULL,
    barcode text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE commerce."ImportSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shipmentPrefix" text DEFAULT 'IMP-'::text NOT NULL,
    "shipmentNextNumber" integer DEFAULT 1 NOT NULL,
    "autoCreateLotsOnReceipt" boolean DEFAULT true NOT NULL,
    "requireBolForSubmit" boolean DEFAULT true NOT NULL,
    "requireInvoiceForSubmit" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."ImportShipment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "shipmentNumber" text,
    "supplierPartyId" text NOT NULL,
    status commerce."ImportShipmentStatus" DEFAULT 'DRAFT'::commerce."ImportShipmentStatus" NOT NULL,
    "shippingMode" commerce."ShippingMode" DEFAULT 'SEA'::commerce."ShippingMode" NOT NULL,
    "containerNumber" text,
    "sealNumber" text,
    "billOfLadingNumber" text,
    "carrierName" text,
    "vesselName" text,
    "voyageNumber" text,
    "originCountry" text,
    "originPort" text,
    "destinationCountry" text,
    "destinationPort" text,
    "finalWarehouseId" text,
    "departureDate" date,
    "estimatedArrivalDate" date,
    "actualArrivalDate" date,
    "clearanceDate" date,
    "receivedDate" date,
    "customsDeclarationNumber" text,
    "importLicenseNumber" text,
    "hsCodesPrimary" text[] DEFAULT ARRAY[]::text[],
    incoterm text,
    "fobValueCents" integer,
    "freightCostCents" integer,
    "insuranceCostCents" integer,
    "customsDutyCents" integer,
    "customsTaxCents" integer,
    "otherCostsCents" integer,
    "totalLandedCostCents" integer,
    "totalWeightKg" double precision,
    "totalVolumeM3" double precision,
    "totalPackages" integer,
    notes text,
    "metadataJson" jsonb,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone
);

CREATE TABLE commerce."ImportShipmentDocument" (
    id text NOT NULL,
    "shipmentId" text NOT NULL,
    "documentType" commerce."ImportDocumentType" NOT NULL,
    "documentNumber" text,
    "documentName" text NOT NULL,
    "documentUrl" text,
    "fileStorageKey" text,
    "mimeType" text,
    "fileSizeBytes" integer,
    "uploadedByUserId" text,
    "uploadedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text
);

CREATE TABLE commerce."ImportShipmentLine" (
    id text NOT NULL,
    "shipmentId" text NOT NULL,
    "productId" text NOT NULL,
    "hsCode" text,
    "orderedQty" integer NOT NULL,
    "receivedQty" integer DEFAULT 0 NOT NULL,
    "unitFobCostCents" integer,
    "lineFobCostCents" integer,
    "allocatedFreightCents" integer,
    "allocatedInsuranceCents" integer,
    "allocatedDutyCents" integer,
    "allocatedTaxCents" integer,
    "allocatedOtherCents" integer,
    "unitLandedCostCents" integer,
    "weightKg" double precision,
    "volumeM3" double precision,
    notes text
);

CREATE TABLE commerce."InventoryDocument" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "documentType" commerce."InventoryDocumentType" NOT NULL,
    "documentNumber" text,
    status commerce."InventoryDocumentStatus" DEFAULT 'DRAFT'::commerce."InventoryDocumentStatus" NOT NULL,
    reference text,
    "scheduledDate" date,
    "postingDate" date,
    notes text,
    "partyId" text,
    "sourceType" text,
    "sourceId" text,
    "confirmedAt" timestamp(6) with time zone,
    "postedAt" timestamp(6) with time zone,
    "canceledAt" timestamp(6) with time zone,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."InventoryDocumentLine" (
    id text NOT NULL,
    "documentId" text NOT NULL,
    "productId" text NOT NULL,
    quantity integer NOT NULL,
    "unitCostCents" integer,
    "fromLocationId" text,
    "toLocationId" text,
    notes text,
    "reservedQuantity" integer,
    "lotId" text,
    "lotNumber" text,
    "mfgDate" date,
    "expiryDate" date
);

CREATE TABLE commerce."InventoryLocation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "warehouseId" text NOT NULL,
    name text NOT NULL,
    "locationType" commerce."LocationType" NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."InventoryLot" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "lotNumber" text NOT NULL,
    "mfgDate" date,
    "expiryDate" date,
    "receivedDate" date NOT NULL,
    "shipmentId" text,
    "supplierPartyId" text,
    "unitCostCents" integer,
    "qtyReceived" integer NOT NULL,
    "qtyOnHand" integer NOT NULL,
    "qtyReserved" integer DEFAULT 0 NOT NULL,
    status commerce."InventoryLotStatus" DEFAULT 'AVAILABLE'::commerce."InventoryLotStatus" NOT NULL,
    notes text,
    "metadataJson" jsonb,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "archivedAt" timestamp(6) with time zone
);

CREATE TABLE commerce."InventoryProduct" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    "productType" commerce."ProductType" NOT NULL,
    "unitOfMeasure" text NOT NULL,
    barcode text,
    "defaultSalesPriceCents" integer,
    "defaultPurchaseCostCents" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    tags text[] DEFAULT ARRAY[]::text[],
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."InventorySettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "receiptPrefix" text DEFAULT 'RCPT-'::text NOT NULL,
    "receiptNextNumber" integer DEFAULT 1 NOT NULL,
    "deliveryPrefix" text DEFAULT 'DLV-'::text NOT NULL,
    "deliveryNextNumber" integer DEFAULT 1 NOT NULL,
    "transferPrefix" text DEFAULT 'TRF-'::text NOT NULL,
    "transferNextNumber" integer DEFAULT 1 NOT NULL,
    "adjustmentPrefix" text DEFAULT 'ADJ-'::text NOT NULL,
    "adjustmentNextNumber" integer DEFAULT 1 NOT NULL,
    "negativeStockPolicy" commerce."NegativeStockPolicy" DEFAULT 'DISALLOW'::commerce."NegativeStockPolicy" NOT NULL,
    "reservationPolicy" commerce."ReservationPolicy" DEFAULT 'FULL_ONLY'::commerce."ReservationPolicy" NOT NULL,
    "defaultWarehouseId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."InventoryWarehouse" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    address text,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."PurchaseOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "poNumber" text,
    status commerce."PurchaseOrderStatus" DEFAULT 'DRAFT'::commerce."PurchaseOrderStatus" NOT NULL,
    "supplierPartyId" text NOT NULL,
    "supplierContactPartyId" text,
    "orderDate" date,
    "expectedDeliveryDate" date,
    currency character varying(3) NOT NULL,
    notes text,
    "subtotalCents" integer NOT NULL,
    "taxCents" integer NOT NULL,
    "totalCents" integer NOT NULL,
    "approvedAt" timestamp(6) with time zone,
    "sentAt" timestamp(6) with time zone,
    "receivedAt" timestamp(6) with time zone,
    "closedAt" timestamp(6) with time zone,
    "canceledAt" timestamp(6) with time zone,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."PurchaseOrderLine" (
    id text NOT NULL,
    "purchaseOrderId" text NOT NULL,
    description text NOT NULL,
    quantity integer NOT NULL,
    "unitCostCents" integer NOT NULL,
    "taxCode" text,
    category text,
    "sortOrder" integer
);

CREATE TABLE commerce."PurchasingAccountMapping" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "supplierPartyId" text NOT NULL,
    "categoryKey" text NOT NULL,
    "glAccountId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."PurchasingSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "defaultPaymentTerms" text,
    "defaultCurrency" character varying(3) DEFAULT 'EUR'::text NOT NULL,
    "poNumberingPrefix" text DEFAULT 'PO-'::text NOT NULL,
    "poNextNumber" integer DEFAULT 1 NOT NULL,
    "billInternalRefPrefix" text DEFAULT 'BILL-'::text,
    "billNextNumber" integer DEFAULT 1,
    "defaultAccountsPayableAccountId" text,
    "defaultExpenseAccountId" text,
    "defaultBankAccountId" text,
    "autoPostOnBillPost" boolean DEFAULT true NOT NULL,
    "autoPostOnPaymentRecord" boolean DEFAULT true NOT NULL,
    "billDuplicateDetectionEnabled" boolean DEFAULT true NOT NULL,
    "approvalRequiredForBills" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."ReorderPolicy" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "warehouseId" text NOT NULL,
    "minQty" integer NOT NULL,
    "maxQty" integer,
    "reorderPoint" integer,
    "preferredSupplierPartyId" text,
    "leadTimeDays" integer,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."SalesOrder" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    number text,
    status commerce."SalesOrderStatus" DEFAULT 'DRAFT'::commerce."SalesOrderStatus" NOT NULL,
    "customerPartyId" text NOT NULL,
    "customerContactPartyId" text,
    "orderDate" date,
    "deliveryDate" date,
    currency character varying(3) NOT NULL,
    notes text,
    "subtotalCents" integer NOT NULL,
    "discountCents" integer NOT NULL,
    "taxCents" integer NOT NULL,
    "totalCents" integer NOT NULL,
    "confirmedAt" timestamp(6) with time zone,
    "fulfilledAt" timestamp(6) with time zone,
    "canceledAt" timestamp(6) with time zone,
    "sourceQuoteId" text,
    "sourceInvoiceId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."SalesOrderLine" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    description text NOT NULL,
    quantity integer NOT NULL,
    "unitPriceCents" integer NOT NULL,
    "discountCents" integer,
    "taxCode" text,
    "revenueCategory" text,
    "sortOrder" integer
);

CREATE TABLE commerce."SalesQuote" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    number text,
    status commerce."SalesQuoteStatus" DEFAULT 'DRAFT'::commerce."SalesQuoteStatus" NOT NULL,
    "customerPartyId" text NOT NULL,
    "customerContactPartyId" text,
    "issueDate" date,
    "validUntilDate" date,
    currency character varying(3) NOT NULL,
    "paymentTerms" text,
    notes text,
    "subtotalCents" integer NOT NULL,
    "discountCents" integer NOT NULL,
    "taxCents" integer NOT NULL,
    "totalCents" integer NOT NULL,
    "sentAt" timestamp(6) with time zone,
    "acceptedAt" timestamp(6) with time zone,
    "rejectedAt" timestamp(6) with time zone,
    "convertedToSalesOrderId" text,
    "convertedToInvoiceId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."SalesQuoteLine" (
    id text NOT NULL,
    "quoteId" text NOT NULL,
    description text NOT NULL,
    quantity integer NOT NULL,
    "unitPriceCents" integer NOT NULL,
    "discountCents" integer,
    "taxCode" text,
    "revenueCategory" text,
    "sortOrder" integer
);

CREATE TABLE commerce."SalesSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "defaultPaymentTerms" text,
    "defaultCurrency" character varying(3) DEFAULT 'EUR'::text NOT NULL,
    "quoteNumberPrefix" text DEFAULT 'Q-'::text NOT NULL,
    "quoteNextNumber" integer DEFAULT 1 NOT NULL,
    "orderNumberPrefix" text DEFAULT 'SO-'::text NOT NULL,
    "orderNextNumber" integer DEFAULT 1 NOT NULL,
    "invoiceNumberPrefix" text DEFAULT 'INV-'::text NOT NULL,
    "invoiceNextNumber" integer DEFAULT 1 NOT NULL,
    "defaultRevenueAccountId" text,
    "defaultAccountsReceivableAccountId" text,
    "defaultBankAccountId" text,
    "autoPostOnIssue" boolean DEFAULT true NOT NULL,
    "autoPostOnPayment" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."StockMove" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "postingDate" date NOT NULL,
    "productId" text NOT NULL,
    "quantityDelta" integer NOT NULL,
    "locationId" text NOT NULL,
    "documentType" commerce."InventoryDocumentType" NOT NULL,
    "documentId" text NOT NULL,
    "lineId" text NOT NULL,
    "reasonCode" commerce."StockMoveReason" NOT NULL,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lotId" text
);

CREATE TABLE commerce."StockReservation" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "productId" text NOT NULL,
    "locationId" text NOT NULL,
    "documentId" text NOT NULL,
    "reservedQty" integer NOT NULL,
    status commerce."ReservationStatus" DEFAULT 'ACTIVE'::commerce."ReservationStatus" NOT NULL,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "releasedAt" timestamp(6) with time zone,
    "fulfilledAt" timestamp(6) with time zone
);

CREATE TABLE commerce."VendorBill" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "billNumber" text,
    "internalBillRef" text,
    status commerce."VendorBillStatus" DEFAULT 'DRAFT'::commerce."VendorBillStatus" NOT NULL,
    "supplierPartyId" text NOT NULL,
    "supplierContactPartyId" text,
    "billDate" date NOT NULL,
    "dueDate" date NOT NULL,
    currency character varying(3) NOT NULL,
    "paymentTerms" text,
    notes text,
    "subtotalCents" integer NOT NULL,
    "taxCents" integer NOT NULL,
    "totalCents" integer NOT NULL,
    "paidCents" integer NOT NULL,
    "dueCents" integer NOT NULL,
    "approvedAt" timestamp(6) with time zone,
    "postedAt" timestamp(6) with time zone,
    "voidedAt" timestamp(6) with time zone,
    "purchaseOrderId" text,
    "postedJournalEntryId" text,
    "possibleDuplicateOfBillId" text,
    "duplicateScore" double precision,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce."VendorBillLine" (
    id text NOT NULL,
    "vendorBillId" text NOT NULL,
    description text NOT NULL,
    quantity integer NOT NULL,
    "unitCostCents" integer NOT NULL,
    category text,
    "glAccountId" text,
    "taxCode" text,
    "sortOrder" integer
);

CREATE TABLE commerce.kitchen_stations (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.kitchen_ticket_items (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "ticketId" text NOT NULL,
    "orderItemId" text NOT NULL,
    quantity integer NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE commerce.kitchen_tickets (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "orderId" text NOT NULL,
    "tableSessionId" text NOT NULL,
    "tableId" text NOT NULL,
    "stationId" text,
    "sendKey" text NOT NULL,
    status commerce."KitchenTicketStatus" DEFAULT 'NEW'::commerce."KitchenTicketStatus" NOT NULL,
    "sentAt" timestamp(6) with time zone NOT NULL,
    "bumpedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.payment_attempts (
    id uuid NOT NULL,
    tenant_id text NOT NULL,
    workspace_id text NOT NULL,
    sale_id uuid,
    register_id uuid NOT NULL,
    amount_cents integer NOT NULL,
    currency character varying(3) NOT NULL,
    status commerce."PaymentAttemptStatus" DEFAULT 'PENDING'::commerce."PaymentAttemptStatus" NOT NULL,
    provider_kind commerce."CashlessProviderKind" NOT NULL,
    provider_ref text NOT NULL,
    action_json jsonb,
    idempotency_key character varying(255) NOT NULL,
    failure_reason text,
    paid_at timestamp(6) with time zone,
    expires_at timestamp(6) with time zone,
    raw_status_json jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.pos_sale_idempotency (
    "idempotencyKey" character varying(255) NOT NULL,
    workspace_id text NOT NULL,
    pos_sale_id uuid NOT NULL,
    server_invoice_id uuid NOT NULL,
    server_payment_id uuid,
    receipt_number character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE commerce.pos_sale_records (
    id uuid NOT NULL,
    workspace_id text NOT NULL,
    session_id uuid,
    register_id uuid NOT NULL,
    receipt_number character varying(100) NOT NULL,
    sale_date timestamp with time zone NOT NULL,
    cashier_employee_party_id uuid NOT NULL,
    customer_party_id uuid,
    subtotal_cents integer NOT NULL,
    tax_cents integer NOT NULL,
    total_cents integer NOT NULL,
    currency character varying(3) NOT NULL,
    status character varying(20) DEFAULT 'SYNCED'::character varying NOT NULL,
    line_items_json jsonb NOT NULL,
    payments_json jsonb NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    server_invoice_id uuid,
    server_payment_id uuid,
    synced_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE commerce.registers (
    id uuid NOT NULL,
    workspace_id text NOT NULL,
    name character varying(100) NOT NULL,
    default_warehouse_id uuid,
    default_bank_account_id uuid,
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    cash_drawer_id text
);

CREATE TABLE commerce.restaurant_approval_requests (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "orderId" text NOT NULL,
    "orderItemId" text,
    type commerce."RestaurantApprovalType" NOT NULL,
    status commerce."RestaurantApprovalStatus" DEFAULT 'PENDING'::commerce."RestaurantApprovalStatus" NOT NULL,
    reason text NOT NULL,
    "amountCents" integer,
    "workflowInstanceId" text,
    "requestedByUserId" text NOT NULL,
    "decidedByUserId" text,
    "decidedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_dining_rooms (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_menu_item_modifier_groups (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "catalogItemId" text NOT NULL,
    "modifierGroupId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE commerce.restaurant_modifier_groups (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    "selectionMode" commerce."ModifierSelectionMode" DEFAULT 'MULTI'::commerce."ModifierSelectionMode" NOT NULL,
    "isRequired" boolean DEFAULT false NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_modifier_options (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "modifierGroupId" text NOT NULL,
    name text NOT NULL,
    "priceDeltaCents" integer DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_order_item_modifiers (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "orderItemId" text NOT NULL,
    "modifierGroupId" text,
    "optionName" text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "priceDeltaCents" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_order_items (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "orderId" text NOT NULL,
    "catalogItemId" text NOT NULL,
    "itemName" text NOT NULL,
    sku text NOT NULL,
    quantity integer NOT NULL,
    "sentQuantity" integer DEFAULT 0 NOT NULL,
    "unitPriceCents" integer NOT NULL,
    "taxRateBps" integer DEFAULT 0 NOT NULL,
    "taxCents" integer DEFAULT 0 NOT NULL,
    "lineSubtotalCents" integer NOT NULL,
    "lineTotalCents" integer NOT NULL,
    "voidedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_order_payments (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "orderId" text NOT NULL,
    method text NOT NULL,
    "amountCents" integer NOT NULL,
    reference text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE commerce.restaurant_orders (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "tableSessionId" text NOT NULL,
    "tableId" text NOT NULL,
    status commerce."RestaurantOrderStatus" DEFAULT 'DRAFT'::commerce."RestaurantOrderStatus" NOT NULL,
    "subtotalCents" integer DEFAULT 0 NOT NULL,
    "discountCents" integer DEFAULT 0 NOT NULL,
    "taxCents" integer DEFAULT 0 NOT NULL,
    "totalCents" integer DEFAULT 0 NOT NULL,
    "sentAt" timestamp(6) with time zone,
    "paidAt" timestamp(6) with time zone,
    "closedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_table_sessions (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "tableId" text NOT NULL,
    "registerId" text,
    "shiftSessionId" text,
    "openedByUserId" text NOT NULL,
    "openedAt" timestamp(6) with time zone NOT NULL,
    "closedAt" timestamp(6) with time zone,
    status commerce."RestaurantTableSessionStatus" DEFAULT 'OPEN'::commerce."RestaurantTableSessionStatus" NOT NULL,
    "transferCount" integer DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.restaurant_tables (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "diningRoomId" text NOT NULL,
    name text NOT NULL,
    capacity integer,
    "posX" integer,
    "posY" integer,
    shape commerce."RestaurantTableShape" DEFAULT 'SQUARE'::commerce."RestaurantTableShape" NOT NULL,
    "availabilityStatus" commerce."RestaurantTableAvailabilityStatus" DEFAULT 'AVAILABLE'::commerce."RestaurantTableAvailabilityStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE commerce.shift_sessions (
    id uuid NOT NULL,
    workspace_id text NOT NULL,
    register_id uuid NOT NULL,
    opened_by_employee_party_id uuid NOT NULL,
    opened_at timestamp with time zone NOT NULL,
    starting_cash_cents integer,
    status character varying(20) DEFAULT 'OPEN'::character varying NOT NULL,
    closed_at timestamp with time zone,
    closed_by_employee_party_id uuid,
    closing_cash_cents integer,
    total_sales_cents integer DEFAULT 0 NOT NULL,
    total_cash_received_cents integer DEFAULT 0 NOT NULL,
    variance_cents integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone NOT NULL
);

CREATE TABLE content."CmsComment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "postId" text NOT NULL,
    "readerId" text NOT NULL,
    "parentId" text,
    "bodyText" text NOT NULL,
    status content."CmsCommentStatus" DEFAULT 'PENDING'::content."CmsCommentStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."CmsPost" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    status content."CmsPostStatus" DEFAULT 'DRAFT'::content."CmsPostStatus" NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    "coverImageFileId" text,
    tags text[] DEFAULT ARRAY[]::text[],
    "contentJson" jsonb NOT NULL,
    "contentHtml" text NOT NULL,
    "contentText" text NOT NULL,
    "publishedAt" timestamp(6) with time zone,
    "authorUserId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."CmsReader" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "displayName" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."DirectoryLead" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "restaurantId" text NOT NULL,
    name text NOT NULL,
    contact text NOT NULL,
    message text NOT NULL,
    status content."DirectoryLeadStatus" DEFAULT 'NEW'::content."DirectoryLeadStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."DirectoryRestaurant" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    "shortDescription" text,
    phone text,
    website text,
    "priceRange" character varying(16),
    "dishTags" text[] DEFAULT ARRAY[]::text[],
    "neighborhoodSlug" text,
    "addressLine" text NOT NULL,
    "postalCode" text NOT NULL,
    city text DEFAULT 'Berlin'::text NOT NULL,
    lat numeric(10,7),
    lng numeric(10,7),
    "openingHoursJson" jsonb,
    status content."DirectoryRestaurantStatus" DEFAULT 'ACTIVE'::content."DirectoryRestaurantStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."PortfolioClient" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "showcaseId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "clientType" content."PortfolioClientType" NOT NULL,
    "locationText" text NOT NULL,
    "websiteUrl" text,
    "logoImageUrl" text,
    summary text,
    "testimonialQuote" text,
    "testimonialAuthor" text,
    featured boolean DEFAULT false NOT NULL,
    "sortOrder" integer,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."PortfolioProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "showcaseId" text NOT NULL,
    "introLine" text,
    headline text,
    subheadline text,
    "aboutShort" text,
    "aboutLong" text,
    "focusBullets" text[] DEFAULT ARRAY[]::text[],
    "ctaTitle" text,
    "ctaText" text,
    "ctaUrl" text,
    "techStacks" text[] DEFAULT ARRAY[]::text[],
    "socialLinks" jsonb,
    "homeSections" text[] DEFAULT ARRAY[]::text[],
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."PortfolioProject" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "showcaseId" text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    summary text NOT NULL,
    content text NOT NULL,
    type content."PortfolioProjectType" NOT NULL,
    status content."PortfolioContentStatus" DEFAULT 'draft'::content."PortfolioContentStatus" NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    "sortOrder" integer,
    "coverImageUrl" text,
    links jsonb,
    "techStack" text[] DEFAULT ARRAY[]::text[],
    metrics jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."PortfolioProjectClient" (
    "projectId" text NOT NULL,
    "clientId" text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL
);

CREATE TABLE content."PortfolioService" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "showcaseId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "shortDescription" text NOT NULL,
    deliverables text[] DEFAULT ARRAY[]::text[],
    "startingFromPrice" text,
    "ctaText" text,
    "ctaUrl" text,
    status content."PortfolioContentStatus" DEFAULT 'draft'::content."PortfolioContentStatus" NOT NULL,
    "sortOrder" integer,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."PortfolioShowcase" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    type content."PortfolioShowcaseType" NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "primaryDomain" text,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."PortfolioTeamMember" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "showcaseId" text NOT NULL,
    name text NOT NULL,
    "roleTitle" text NOT NULL,
    bio text NOT NULL,
    skills text[] DEFAULT ARRAY[]::text[],
    "photoUrl" text,
    "socialLinks" jsonb,
    status content."PortfolioContentStatus" DEFAULT 'draft'::content."PortfolioContentStatus" NOT NULL,
    "sortOrder" integer,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."RentalAvailabilityRange" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "propertyId" text NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    status content."AvailabilityStatus" DEFAULT 'AVAILABLE'::content."AvailabilityStatus" NOT NULL,
    note text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."RentalCategory" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."RentalProperty" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    status content."RentalStatus" DEFAULT 'DRAFT'::content."RentalStatus" NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    summary text,
    "descriptionHtml" text,
    "maxGuests" integer,
    "coverImageFileId" text,
    "publishedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    currency character varying(3),
    price numeric(19,4),
    "checkIn" text,
    "checkOut" text,
    offers text[] DEFAULT ARRAY[]::text[]
);

CREATE TABLE content."RentalPropertyCategory" (
    "propertyId" text NOT NULL,
    "categoryId" text NOT NULL
);

CREATE TABLE content."RentalPropertyImage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "propertyId" text NOT NULL,
    "fileId" text NOT NULL,
    "altText" text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."WebsiteDomain" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "siteId" text NOT NULL,
    hostname text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."WebsiteFeedback" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "siteId" text NOT NULL,
    "pageId" text,
    message text NOT NULL,
    email text,
    name text,
    rating integer,
    "youtubeJson" jsonb NOT NULL,
    "metaJson" jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE content."WebsiteFeedbackImage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "feedbackId" text NOT NULL,
    "fileId" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE content."WebsiteMenu" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "siteId" text NOT NULL,
    name text NOT NULL,
    locale text NOT NULL,
    "itemsJson" jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."WebsitePage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "siteId" text NOT NULL,
    path text NOT NULL,
    locale text NOT NULL,
    template text NOT NULL,
    status content."WebsitePageStatus" DEFAULT 'DRAFT'::content."WebsitePageStatus" NOT NULL,
    "cmsEntryId" text NOT NULL,
    "seoTitle" text,
    "seoDescription" text,
    "seoImageFileId" text,
    "publishedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."WebsitePageSnapshot" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "siteId" text NOT NULL,
    "pageId" text NOT NULL,
    path text NOT NULL,
    locale text NOT NULL,
    version integer NOT NULL,
    "payloadJson" jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE content."WebsiteQa" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "siteId" text NOT NULL,
    locale text NOT NULL,
    scope content."WebsiteQaScope" NOT NULL,
    "pageId" text,
    status content."WebsiteQaStatus" DEFAULT 'draft'::content."WebsiteQaStatus" NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    question text NOT NULL,
    "answerHtml" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."WebsiteSite" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "defaultLocale" text NOT NULL,
    "brandingJson" jsonb,
    "themeJson" jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    slug text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL
);

CREATE TABLE content."WebsiteWallOfLoveItem" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "siteId" text NOT NULL,
    type content."WebsiteWallOfLoveItemType" NOT NULL,
    status content."WebsiteWallOfLoveStatus" DEFAULT 'draft'::content."WebsiteWallOfLoveStatus" NOT NULL,
    "order" integer NOT NULL,
    quote text,
    "authorName" text,
    "authorTitle" text,
    "sourceLabel" text,
    "linkUrl" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE content."WebsiteWallOfLoveItemImage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "itemId" text NOT NULL,
    "fileId" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE crm."Activity" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    type crm."ActivityType" NOT NULL,
    subject text NOT NULL,
    body text,
    "channelKey" text,
    "messageDirection" text,
    "messageTo" text,
    "openUrl" text,
    "partyId" text,
    "dealId" text,
    "dueAt" timestamp(6) with time zone,
    "completedAt" timestamp(6) with time zone,
    status crm."ActivityStatus" DEFAULT 'OPEN'::crm."ActivityStatus" NOT NULL,
    "assignedToUserId" text,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    attendees jsonb,
    "durationSeconds" integer,
    location text,
    metadata jsonb,
    outcome text,
    direction crm."CommunicationDirection",
    "communicationStatus" crm."CommunicationLifecycleStatus",
    "activityDate" timestamp(6) with time zone,
    "ownerId" text,
    "recordSource" crm."ActivityRecordSource",
    "recordSourceDetails" jsonb,
    "toRecipients" jsonb,
    "ccRecipients" jsonb,
    participants jsonb,
    "threadKey" text,
    "externalThreadId" text,
    "externalMessageId" text,
    "providerKey" text,
    "errorCode" text,
    "errorMessage" text,
    "rawProviderPayload" jsonb,
    attachments jsonb,
    "leadId" text
);

CREATE TABLE crm."Address" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partyId" text NOT NULL,
    type crm."AddressType" NOT NULL,
    line1 text NOT NULL,
    line2 text,
    city text,
    "postalCode" text,
    country text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ChannelRegistry" (
    key text NOT NULL,
    "displayName" text NOT NULL,
    category crm."ChannelCategory" NOT NULL,
    capabilities jsonb NOT NULL,
    "defaultProviderKey" text,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ChannelTemplate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "channelKey" character varying(64) NOT NULL,
    name character varying(120) NOT NULL,
    subject character varying(300),
    body text NOT NULL,
    "createdByUserId" text,
    "updatedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CheckInEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerPartyId" text NOT NULL,
    "registerId" text NOT NULL,
    "kioskDeviceId" text,
    "checkedInAt" timestamp(6) with time zone NOT NULL,
    "checkedInByType" crm."CheckInByType" NOT NULL,
    "checkedInByEmployeePartyId" text,
    status crm."CheckInStatus" DEFAULT 'ACTIVE'::crm."CheckInStatus" NOT NULL,
    "visitReason" text,
    "assignedEmployeePartyId" text,
    tags text[] DEFAULT ARRAY[]::text[],
    "posSaleId" text,
    notes text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassAttendance" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "sessionId" text NOT NULL,
    "enrollmentId" text NOT NULL,
    status crm."ClassAttendanceStatus" NOT NULL,
    billable boolean DEFAULT true NOT NULL,
    note text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassBillingInvoiceLink" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "billingRunId" text,
    "payerClientId" text NOT NULL,
    "invoiceId" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "classGroupId" text,
    "enrollmentId" text,
    purpose crm."ClassBillingInvoicePurpose" DEFAULT 'MONTHLY_RUN'::crm."ClassBillingInvoicePurpose" NOT NULL
);

CREATE TABLE crm."ClassEnrollment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "classGroupId" text NOT NULL,
    "studentClientId" text NOT NULL,
    "startDate" date,
    "endDate" date,
    "isActive" boolean DEFAULT true NOT NULL,
    "priceOverridePerSession" integer,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "payerClientId" text NOT NULL,
    status crm."ClassEnrollmentStatus" DEFAULT 'ENROLLED'::crm."ClassEnrollmentStatus" NOT NULL,
    "payerPartyId" text,
    "seatType" crm."ClassEnrollmentSeatType" DEFAULT 'LEARNER'::crm."ClassEnrollmentSeatType" NOT NULL,
    source crm."ClassEnrollmentSource" DEFAULT 'ADMIN'::crm."ClassEnrollmentSource" NOT NULL,
    "priceCents" integer,
    currency character varying(3),
    "discountCents" integer,
    "discountLabel" text,
    "placementLevel" text,
    "placementGoal" text,
    "placementNote" text
);

CREATE TABLE crm."ClassEnrollmentBillingPlan" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "enrollmentId" text NOT NULL,
    type crm."ClassEnrollmentBillingPlanType" NOT NULL,
    "scheduleJson" jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassGroup" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    level text NOT NULL,
    "defaultPricePerSession" integer NOT NULL,
    currency character varying(3) DEFAULT 'EUR'::character varying NOT NULL,
    "schedulePattern" jsonb,
    status crm."ClassGroupStatus" DEFAULT 'ACTIVE'::crm."ClassGroupStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    kind crm."ClassGroupKind" DEFAULT 'COHORT'::crm."ClassGroupKind" NOT NULL,
    lifecycle crm."ClassGroupLifecycle" DEFAULT 'DRAFT'::crm."ClassGroupLifecycle" NOT NULL,
    "startAt" timestamp(6) with time zone,
    "endAt" timestamp(6) with time zone,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    capacity integer,
    "waitlistEnabled" boolean DEFAULT false NOT NULL,
    "deliveryMode" crm."ClassDeliveryMode" DEFAULT 'ONLINE'::crm."ClassDeliveryMode" NOT NULL,
    "communityUrl" text,
    "programId" text
);

CREATE TABLE crm."ClassGroupInstructor" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "classGroupId" text NOT NULL,
    "partyId" text NOT NULL,
    role crm."ClassGroupInstructorRole" DEFAULT 'INSTRUCTOR'::crm."ClassGroupInstructorRole" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassGroupResource" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "classGroupId" text NOT NULL,
    type crm."ClassResourceType" NOT NULL,
    title text NOT NULL,
    "documentId" text,
    url text,
    visibility crm."ClassResourceVisibility" DEFAULT 'ENROLLED_ONLY'::crm."ClassResourceVisibility" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassMilestone" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "classGroupId" text NOT NULL,
    "programMilestoneTemplateId" text,
    title text NOT NULL,
    type crm."ClassMilestoneType" DEFAULT 'CHECKPOINT'::crm."ClassMilestoneType" NOT NULL,
    "dueAt" timestamp(6) with time zone,
    required boolean DEFAULT true NOT NULL,
    index integer,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassMilestoneCompletion" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "milestoneId" text NOT NULL,
    "enrollmentId" text NOT NULL,
    status crm."ClassMilestoneCompletionStatus" DEFAULT 'NOT_STARTED'::crm."ClassMilestoneCompletionStatus" NOT NULL,
    score integer,
    feedback text,
    "gradedByPartyId" text,
    "gradedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassMonthlyBillingRun" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    month character varying(7) NOT NULL,
    status crm."ClassBillingRunStatus" DEFAULT 'DRAFT'::crm."ClassBillingRunStatus" NOT NULL,
    "runId" text NOT NULL,
    "generatedAt" timestamp(6) with time zone,
    "createdByUserId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "billingMonthStrategy" crm."ClassBillingMonthStrategy" DEFAULT 'ARREARS_PREVIOUS_MONTH'::crm."ClassBillingMonthStrategy" NOT NULL,
    "billingBasis" crm."ClassBillingBasis" DEFAULT 'ATTENDED_SESSIONS'::crm."ClassBillingBasis" NOT NULL,
    "billingSnapshot" jsonb
);

CREATE TABLE crm."ClassProgram" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    title text NOT NULL,
    description text,
    "levelTag" text,
    "expectedSessionsCount" integer,
    "defaultTimezone" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassProgramMilestoneTemplate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "programId" text NOT NULL,
    title text NOT NULL,
    type crm."ClassMilestoneType" DEFAULT 'CHECKPOINT'::crm."ClassMilestoneType" NOT NULL,
    required boolean DEFAULT true NOT NULL,
    index integer NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassProgramSessionTemplate" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "programId" text NOT NULL,
    index integer NOT NULL,
    title text,
    "defaultDurationMin" integer,
    type crm."ClassSessionType" DEFAULT 'LECTURE'::crm."ClassSessionType" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."ClassSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "classGroupId" text NOT NULL,
    "startsAt" timestamp(6) with time zone NOT NULL,
    "endsAt" timestamp(6) with time zone,
    topic text,
    notes text,
    status crm."ClassSessionStatus" DEFAULT 'PLANNED'::crm."ClassSessionStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    type crm."ClassSessionType" DEFAULT 'LECTURE'::crm."ClassSessionType" NOT NULL,
    "meetingProvider" crm."MeetingProvider",
    "meetingJoinUrl" text,
    "meetingExternalId" text
);

CREATE TABLE crm."Client" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    custom jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE crm."CoachingArtifactBundle" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "engagementId" text NOT NULL,
    status crm."CoachingExportBundleStatus" DEFAULT 'pending'::crm."CoachingExportBundleStatus" NOT NULL,
    "documentId" text,
    "requestedByUserId" text NOT NULL,
    "requestedAt" timestamp(6) with time zone NOT NULL,
    "completedAt" timestamp(6) with time zone,
    "errorMessage" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CoachingBookingHold" (
    id text NOT NULL,
    "offerId" text NOT NULL,
    "coachUserId" text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "startAt" timestamp(6) with time zone NOT NULL,
    "endAt" timestamp(6) with time zone NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "bookedByName" text,
    "bookedByEmail" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CoachingContractRequest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "engagementId" text NOT NULL,
    "clientPartyId" text NOT NULL,
    provider character varying(32) DEFAULT 'corely-internal'::character varying NOT NULL,
    status crm."CoachingContractRequestStatus" DEFAULT 'pending'::crm."CoachingContractRequestStatus" NOT NULL,
    "requestToken" text NOT NULL,
    "requestTokenHash" text NOT NULL,
    "templateLocale" text NOT NULL,
    "contractTitle" text NOT NULL,
    "contractBody" text NOT NULL,
    "recipientName" text,
    "recipientEmail" text,
    "signerName" text,
    "signerEmail" text,
    "requestedAt" timestamp(6) with time zone NOT NULL,
    "deliveredAt" timestamp(6) with time zone,
    "viewedAt" timestamp(6) with time zone,
    "completedAt" timestamp(6) with time zone,
    "draftDocumentId" text NOT NULL,
    "signedDocumentId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CoachingEngagement" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "offerId" text NOT NULL,
    "clientPartyId" text NOT NULL,
    "coachPartyId" text,
    "coachUserId" text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    status crm."CoachingEngagementStatus" DEFAULT 'draft'::crm."CoachingEngagementStatus" NOT NULL,
    "paymentStatus" crm."CoachingPaymentStatus" DEFAULT 'pending'::crm."CoachingPaymentStatus" NOT NULL,
    "contractStatus" crm."CoachingContractStatus" DEFAULT 'pending'::crm."CoachingContractStatus" NOT NULL,
    "legalEntityId" text,
    "paymentMethodId" text,
    "invoiceId" text,
    "stripeCheckoutSessionId" text,
    "stripeCheckoutUrl" text,
    "stripePaymentIntentId" text,
    "contractAccessTokenHash" text,
    "contractRequestedAt" timestamp(6) with time zone,
    "contractSignedAt" timestamp(6) with time zone,
    "contractDraftDocumentId" text,
    "signedContractDocumentId" text,
    "latestSummary" text,
    "archivedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CoachingEngagementEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "engagementId" text NOT NULL,
    "eventType" text NOT NULL,
    "stateFrom" crm."CoachingEngagementStatus",
    "stateTo" crm."CoachingEngagementStatus",
    "actorUserId" text,
    "metadataJson" jsonb,
    "occurredAt" timestamp(6) with time zone NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE crm."CoachingOffer" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text,
    "titleJson" jsonb NOT NULL,
    "descriptionJson" jsonb,
    currency character varying(3) NOT NULL,
    "priceCents" integer NOT NULL,
    "sessionDurationMinutes" integer NOT NULL,
    "contractRequired" boolean DEFAULT true NOT NULL,
    "paymentRequired" boolean DEFAULT true NOT NULL,
    "localeDefault" text DEFAULT 'en'::text NOT NULL,
    "contractLabelJson" jsonb,
    "prepFormTemplateJson" jsonb,
    "debriefTemplateJson" jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "meetingType" character varying(32) DEFAULT 'video'::character varying NOT NULL,
    "availabilityRuleJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "bookingRulesJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "contractTemplateJson" jsonb,
    "archivedAt" timestamp(6) with time zone,
    "coachUserId" text,
    "prepFormSendHoursBeforeSession" integer
);

CREATE TABLE crm."CoachingPayment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text,
    "engagementId" text NOT NULL,
    "sessionId" text,
    provider character varying(32) NOT NULL,
    status crm."CoachingPaymentRecordStatus" DEFAULT 'pending'::crm."CoachingPaymentRecordStatus" NOT NULL,
    "amountCents" integer NOT NULL,
    "refundedAmountCents" integer DEFAULT 0 NOT NULL,
    currency character varying(3) NOT NULL,
    "customerEmail" text,
    "providerCheckoutSessionId" text,
    "providerCheckoutUrl" text,
    "providerPaymentRef" text,
    "providerRefundRef" text,
    "failureCode" text,
    "failureMessage" text,
    "checkoutCreatedAt" timestamp(6) with time zone,
    "capturedAt" timestamp(6) with time zone,
    "failedAt" timestamp(6) with time zone,
    "refundedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CoachingPaymentProviderEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    provider character varying(32) NOT NULL,
    "providerEventId" text NOT NULL,
    "eventType" text NOT NULL,
    "engagementId" text,
    "paymentId" text,
    "payloadJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "processedAt" timestamp(6) with time zone NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE crm."CoachingSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "engagementId" text NOT NULL,
    status crm."CoachingSessionStatus" DEFAULT 'scheduled'::crm."CoachingSessionStatus" NOT NULL,
    "sequenceNo" integer DEFAULT 1 NOT NULL,
    "startAt" timestamp(6) with time zone NOT NULL,
    "endAt" timestamp(6) with time zone NOT NULL,
    "meetingProvider" text,
    "meetingLink" text,
    "meetingIssuedAt" timestamp(6) with time zone,
    "prepAccessTokenHash" text,
    "prepRequestedAt" timestamp(6) with time zone,
    "prepSubmittedAt" timestamp(6) with time zone,
    "prepDocumentId" text,
    "debriefAccessTokenHash" text,
    "debriefRequestedAt" timestamp(6) with time zone,
    "debriefSubmittedAt" timestamp(6) with time zone,
    "debriefDocumentId" text,
    "completedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "prepAccessToken" text
);

CREATE TABLE crm."CommunicationWebhookEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "providerKey" text NOT NULL,
    "channelKey" text NOT NULL,
    "externalMessageId" text NOT NULL,
    "eventType" text NOT NULL,
    "eventTimestamp" timestamp(6) with time zone NOT NULL,
    payload jsonb NOT NULL,
    "receivedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "activityId" text
);

CREATE TABLE crm."ContactPoint" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partyId" text NOT NULL,
    type crm."ContactPointType" NOT NULL,
    value text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    platform text,
    label text
);

CREATE TABLE crm."CrmAccountProfile" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partyId" text NOT NULL,
    "accountType" crm."CrmAccountType" DEFAULT 'CUSTOMER'::crm."CrmAccountType" NOT NULL,
    status crm."AccountStatus" DEFAULT 'ACTIVE'::crm."AccountStatus" NOT NULL,
    industry text,
    "ownerUserId" text,
    notes text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CrmMailMessage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "mailboxId" text NOT NULL,
    "threadId" text NOT NULL,
    external_message_id text NOT NULL,
    direction crm."CommunicationDirection" NOT NULL,
    subject text,
    from_json jsonb,
    to_json jsonb NOT NULL,
    cc_json jsonb NOT NULL,
    bcc_json jsonb NOT NULL,
    snippet text,
    body_preview text,
    sent_at timestamp(6) with time zone,
    received_at timestamp(6) with time zone,
    raw_json jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CrmMailThread" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "mailboxId" text NOT NULL,
    external_thread_id text NOT NULL,
    subject text,
    snippet text,
    last_message_at timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CrmMailbox" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "integrationConnectionId" text NOT NULL,
    provider_kind character varying(64) NOT NULL,
    address character varying(320) NOT NULL,
    display_name character varying(120),
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    sync_cursor text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."CustomerPackage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerPartyId" text NOT NULL,
    name text NOT NULL,
    status crm."CustomerPackageStatus" DEFAULT 'ACTIVE'::crm."CustomerPackageStatus" NOT NULL,
    "totalUnits" integer NOT NULL,
    "remainingUnits" integer NOT NULL,
    "expiresOn" date,
    notes text,
    "createdByEmployeePartyId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."Deal" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    "partyId" text NOT NULL,
    "stageId" text NOT NULL,
    "amountCents" integer,
    currency character varying(3) DEFAULT 'EUR'::text NOT NULL,
    "expectedCloseDate" date,
    probability integer,
    status crm."DealStatus" DEFAULT 'OPEN'::crm."DealStatus" NOT NULL,
    "ownerUserId" text,
    notes text,
    tags text[] DEFAULT ARRAY[]::text[],
    "wonAt" timestamp(6) with time zone,
    "lostAt" timestamp(6) with time zone,
    "lostReason" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "companyId" text
);

CREATE TABLE crm."DealAiSnapshot" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "dealId" text NOT NULL,
    kind text NOT NULL,
    "generatedAt" timestamp(6) with time zone NOT NULL,
    "payloadJson" jsonb NOT NULL,
    version text NOT NULL,
    "ttlExpiresAt" timestamp(6) with time zone NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE crm."DealStageTransition" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "dealId" text NOT NULL,
    "fromStageId" text,
    "toStageId" text NOT NULL,
    "transitionedByUserId" text,
    "transitionedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE crm."EngagementSettings" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "checkInModeEnabled" boolean DEFAULT true NOT NULL,
    "checkInDuplicateWindowMinutes" integer DEFAULT 10 NOT NULL,
    "loyaltyEnabled" boolean DEFAULT true NOT NULL,
    "pointsPerVisit" integer DEFAULT 1 NOT NULL,
    "rewardRulesJson" text,
    "aiEnabled" boolean DEFAULT true NOT NULL,
    "kioskBrandingJson" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."Issue" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    title text NOT NULL,
    description text,
    status crm."IssueStatus" DEFAULT 'NEW'::crm."IssueStatus" NOT NULL,
    priority crm."IssuePriority" DEFAULT 'MEDIUM'::crm."IssuePriority" NOT NULL,
    "siteType" crm."IssueSiteType" NOT NULL,
    "siteId" text,
    "customerPartyId" text,
    "manufacturerPartyId" text,
    "assigneeUserId" text,
    "reporterUserId" text,
    "resolvedAt" timestamp(6) with time zone,
    "resolvedByUserId" text,
    "closedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "workspaceId" text,
    "requestKind" text,
    "clientEmail" text,
    "clientUpdateStatus" text,
    "clientUpdateSummary" text,
    "clientUpdateQueuedAt" timestamp(6) with time zone
);

CREATE TABLE crm."IssueActivity" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "issueId" text NOT NULL,
    type crm."IssueActivityType" NOT NULL,
    "metadataJson" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" text
);

CREATE TABLE crm."IssueAttachment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "issueId" text NOT NULL,
    "commentId" text,
    "documentId" text NOT NULL,
    kind crm."IssueAttachmentKind" NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    "durationSeconds" integer,
    "transcriptText" text,
    "transcriptSegmentsJson" text,
    "transcriptionStatus" crm."IssueTranscriptionStatus",
    "transcriptionError" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" text
);

CREATE TABLE crm."IssueComment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "issueId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" text NOT NULL
);

CREATE TABLE crm."Lead" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    source crm."LeadSource" DEFAULT 'MANUAL'::crm."LeadSource" NOT NULL,
    status crm."LeadStatus" DEFAULT 'NEW'::crm."LeadStatus" NOT NULL,
    "firstName" text,
    "lastName" text,
    "companyName" text,
    email text,
    phone text,
    "ownerUserId" text,
    "convertedDealId" text,
    "convertedPartyId" text,
    notes text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "lastRepliedAt" timestamp(6) with time zone
);

CREATE TABLE crm."LoyaltyAccount" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerPartyId" text NOT NULL,
    status crm."LoyaltyAccountStatus" DEFAULT 'ACTIVE'::crm."LoyaltyAccountStatus" NOT NULL,
    "currentPointsBalance" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "lifetimeEarnedPoints" integer DEFAULT 0 NOT NULL,
    tier text
);

CREATE TABLE crm."LoyaltyLedgerEntry" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerPartyId" text NOT NULL,
    "entryType" crm."LoyaltyEntryType" NOT NULL,
    "pointsDelta" integer NOT NULL,
    "reasonCode" crm."LoyaltyReasonCode" NOT NULL,
    "sourceType" text,
    "sourceId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByEmployeePartyId" text
);

CREATE TABLE crm."PackageUsage" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "customerPackageId" text NOT NULL,
    "customerPartyId" text NOT NULL,
    "unitsUsed" integer NOT NULL,
    "usedAt" timestamp(6) with time zone NOT NULL,
    "sourceType" text,
    "sourceId" text,
    notes text,
    "createdByEmployeePartyId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE crm."Party" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "displayName" text NOT NULL,
    "vatId" text,
    notes text,
    tags text[] DEFAULT ARRAY[]::text[],
    "archivedAt" timestamp(6) with time zone,
    "archivedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "lifecycleStatus" crm."PartyLifecycleStatus" DEFAULT 'LEAD'::crm."PartyLifecycleStatus" NOT NULL,
    department text,
    "firstName" text,
    industry text,
    "jobTitle" text,
    kind crm."PartyKind" DEFAULT 'INDIVIDUAL'::crm."PartyKind" NOT NULL,
    "lastName" text,
    "organizationName" text,
    size text,
    website text,
    birthday date
);

CREATE TABLE crm."PartyLifecycleTransition" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partyId" text NOT NULL,
    "fromStatus" crm."PartyLifecycleStatus",
    "toStatus" crm."PartyLifecycleStatus" NOT NULL,
    reason text,
    "changedByUserId" text,
    "changedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE crm."PartyRelationship" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "fromPartyId" text NOT NULL,
    "toPartyId" text NOT NULL,
    type crm."PartyRelationshipType" NOT NULL,
    title text
);

CREATE TABLE crm."PartyRole" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "partyId" text NOT NULL,
    role crm."PartyRoleType" NOT NULL
);

CREATE TABLE crm."PipelineConfig" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "stagesJson" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."Sequence" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "ownerUserId" text,
    description text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE crm."SequenceEnrollment" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "sequenceId" text NOT NULL,
    "leadId" text,
    "partyId" text,
    "currentStepOrder" integer DEFAULT 1 NOT NULL,
    status crm."EnrollmentStatus" DEFAULT 'ACTIVE'::crm."EnrollmentStatus" NOT NULL,
    "nextExecutionAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "dealId" text
);

CREATE TABLE crm."SequenceStep" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "sequenceId" text NOT NULL,
    "stepOrder" integer NOT NULL,
    type crm."SequenceStepType" NOT NULL,
    "dayDelay" integer DEFAULT 0 NOT NULL,
    "templateSubject" text,
    "templateBody" text
);

CREATE TABLE ext."ExtEntityAttr" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "moduleId" text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "attrKey" text NOT NULL,
    "attrValue" jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE ext."ExtEntityLink" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "moduleId" text NOT NULL,
    "fromEntityType" text NOT NULL,
    "fromEntityId" text NOT NULL,
    "toEntityType" text NOT NULL,
    "toEntityId" text NOT NULL,
    "linkType" text NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE ext."ExtKv" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "moduleId" text NOT NULL,
    scope text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE identity."ApiKey" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "keyHash" text NOT NULL,
    "lastUsedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE identity."Membership" (
    id text NOT NULL,
    "tenantId" text,
    "userId" text NOT NULL,
    "roleId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE identity."PasswordResetToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE identity."Permission" (
    id text NOT NULL,
    key text NOT NULL,
    description text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE identity."PortalOtpCode" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "emailNormalized" text NOT NULL,
    "codeHash" text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "consumedAt" timestamp(6) with time zone,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    "lastSentAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE identity."PortalSession" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "userId" text NOT NULL,
    "refreshTokenHash" text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "revokedAt" timestamp(6) with time zone,
    "lastUsedAt" timestamp(6) with time zone,
    "userAgent" text,
    ip text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE identity."PrivacyRequest" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "subjectUserId" text NOT NULL,
    "requestedByUserId" text NOT NULL,
    type identity."PrivacyRequestType" NOT NULL,
    status identity."PrivacyRequestStatus" NOT NULL,
    "resultDocumentId" text,
    "resultReportDocumentId" text,
    "errorMessage" text,
    "completedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE identity."RefreshToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text,
    "tokenHash" text NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE identity."Role" (
    id text NOT NULL,
    "tenantId" text,
    name text NOT NULL,
    "systemKey" text,
    description text,
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    scope identity."RoleScope" DEFAULT 'TENANT'::identity."RoleScope" NOT NULL
);

CREATE TABLE identity."RolePermission" (
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE identity."RolePermissionGrant" (
    id text NOT NULL,
    "tenantId" text,
    "roleId" text NOT NULL,
    "permissionKey" text NOT NULL,
    effect identity."PermissionEffect" DEFAULT 'ALLOW'::identity."PermissionEffect" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdBy" text
);

CREATE TABLE identity."SsoAppSession" (
    id text NOT NULL,
    "familyId" text NOT NULL,
    environment text NOT NULL,
    "appKey" text NOT NULL,
    "userId" text NOT NULL,
    "handleHash" text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "idleExpiresAt" timestamp(6) with time zone NOT NULL,
    "revokedAt" timestamp(6) with time zone
);

CREATE TABLE identity."SsoAttemptBudget" (
    id text NOT NULL,
    attempts integer NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE identity."SsoCentralSession" (
    id text NOT NULL,
    environment text NOT NULL,
    "userId" text NOT NULL,
    "handleHash" text NOT NULL,
    "credentialHash" text NOT NULL,
    "createdAt" timestamp(6) with time zone NOT NULL,
    "idleExpiresAt" timestamp(6) with time zone NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "revokedAt" timestamp(6) with time zone
);

CREATE TABLE identity."SsoEmailChallenge" (
    id text NOT NULL,
    "transactionId" text NOT NULL,
    email text NOT NULL,
    "userId" text,
    "credentialHash" text,
    "codeHash" text NOT NULL,
    "codeCipher" text NOT NULL,
    "createdAt" timestamp(6) with time zone NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "consumedAt" timestamp(6) with time zone
);

CREATE TABLE identity."SsoLoginTransaction" (
    id text NOT NULL,
    environment text NOT NULL,
    "appKey" text NOT NULL,
    origin text NOT NULL,
    "returnPath" text NOT NULL,
    "browserHash" text NOT NULL,
    "stateHash" text NOT NULL,
    "stateCipher" text NOT NULL,
    "verifierCipher" text NOT NULL,
    challenge text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "codeHash" text,
    "codeExpiresAt" timestamp(6) with time zone,
    "familyId" text,
    "consumedAt" timestamp(6) with time zone
);

CREATE TABLE identity."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "timeZone" text DEFAULT 'UTC'::text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "billingMethod" text,
    "billingNote" text,
    plan text,
    "planStatus" text,
    "planUpdatedAt" timestamp(6) with time zone,
    "planUpdatedBy" text
);

CREATE TABLE identity."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    "passwordHash" text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "partyId" text
);

CREATE TABLE platform."AgentRun" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "createdByUserId" text,
    status text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "finishedAt" timestamp(3) without time zone,
    "metadataJson" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "traceId" text,
    title text,
    "lastMessageAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "archivedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE platform."AppCatalog" (
    "appId" text NOT NULL,
    name text NOT NULL,
    tier integer DEFAULT 0 NOT NULL,
    version text NOT NULL,
    description text,
    "depsJson" text NOT NULL,
    "permissionsJson" text NOT NULL,
    "capabilitiesJson" text NOT NULL,
    "menuJson" text NOT NULL,
    "settingsSchemaJson" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."CustomFieldDefinition" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entityType" text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text,
    type platform."CustomFieldType" NOT NULL,
    required boolean NOT NULL,
    "defaultValue" jsonb,
    options jsonb,
    validation jsonb,
    "isIndexed" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE platform."CustomFieldIndex" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "fieldId" text NOT NULL,
    "fieldKey" text NOT NULL,
    "valueText" text,
    "valueNumber" double precision,
    "valueDate" timestamp(3) without time zone,
    "valueBool" boolean,
    "valueJson" jsonb,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE platform."DimensionType" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    "appliesTo" text[] NOT NULL,
    "requiredFor" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "allowMultiple" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE platform."DimensionValue" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "typeId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE platform."Document" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    type platform."DocumentType" NOT NULL,
    status platform."DocumentStatus" NOT NULL,
    title text,
    "errorMessage" text,
    "metadataJson" jsonb,
    "archivedAt" timestamp(6) with time zone,
    "archivedByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."DocumentLink" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "documentId" text NOT NULL,
    "entityType" platform."DocumentLinkEntityType" NOT NULL,
    "entityId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."EntityDimension" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text NOT NULL,
    "typeId" text NOT NULL,
    "valueId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."EntityLayout" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "entityType" text NOT NULL,
    layout jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE platform."File" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "documentId" text NOT NULL,
    kind platform."FileKind" NOT NULL,
    "storageProvider" platform."StorageProvider" NOT NULL,
    bucket text NOT NULL,
    "objectKey" text NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "contentType" text,
    "sizeBytes" integer,
    sha256 text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."FormDefinition" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    description text,
    status platform."FormStatus" DEFAULT 'DRAFT'::platform."FormStatus" NOT NULL,
    "publicId" text,
    "publicTokenHash" text,
    "publishedAt" timestamp(6) with time zone,
    "archivedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "postSubmitAction" platform."FormPostSubmitAction" DEFAULT 'NONE'::platform."FormPostSubmitAction" NOT NULL
);

CREATE TABLE platform."FormField" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "formId" text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    type platform."FormFieldType" NOT NULL,
    required boolean DEFAULT false NOT NULL,
    "helpText" text,
    "order" integer DEFAULT 0 NOT NULL,
    "configJson" jsonb,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."FormSubmission" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "formId" text NOT NULL,
    source platform."FormSubmissionSource" DEFAULT 'PUBLIC'::platform."FormSubmissionSource" NOT NULL,
    "payloadJson" jsonb NOT NULL,
    "submittedAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."LegalEntity" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    kind text NOT NULL,
    "legalName" text NOT NULL,
    "countryCode" character(2) NOT NULL,
    currency character varying(3) NOT NULL,
    "taxId" text,
    "vatId" text,
    phone text,
    email text,
    website text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    address jsonb,
    "bankAccount" jsonb
);

CREATE TABLE platform."Message" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "runId" text NOT NULL,
    role text NOT NULL,
    "partsJson" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "traceId" text,
    "contentText" text
);

CREATE TABLE platform."Notification" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    type text NOT NULL,
    severity text NOT NULL,
    title text NOT NULL,
    body text,
    resource jsonb NOT NULL,
    data jsonb,
    "dedupeKey" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(6) with time zone
);

CREATE TABLE platform."NotificationRecipient" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "notificationId" text NOT NULL,
    "userId" text NOT NULL,
    "readAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."PackCatalog" (
    pack_id text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    description text,
    definition_json text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."SeededRecordMeta" (
    id text NOT NULL,
    tenant_id text NOT NULL,
    target_table text NOT NULL,
    target_id text NOT NULL,
    source_template_id text NOT NULL,
    source_template_version text NOT NULL,
    is_customized boolean DEFAULT false NOT NULL,
    customized_at timestamp(6) with time zone,
    customized_by_user_id text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."SignCeremony" (
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "requestId" uuid NOT NULL,
    status text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "sentAt" timestamp(6) with time zone NOT NULL,
    consent text NOT NULL,
    invitation text NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    "artifactSha256" text,
    "evidenceSha256" text,
    "verifiedAt" timestamp(6) with time zone,
    "leaseId" uuid,
    "leaseUntil" timestamp(6) with time zone,
    "candidateSha256" text,
    "finalizationFailed" boolean DEFAULT false NOT NULL,
    "senderWorkspace" text,
    CONSTRAINT "SignCeremony_status_check" CHECK ((status = ANY (ARRAY['SENT'::text, 'DECLINED'::text, 'VOID'::text, 'EXPIRED'::text, 'COLLECTED'::text, 'COMPLETED'::text])))
);

CREATE TABLE platform."SignCeremonyRecipient" (
    id uuid NOT NULL,
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "requestId" uuid NOT NULL,
    "roleId" text NOT NULL,
    "position" integer NOT NULL,
    status text NOT NULL,
    "tokenDigest" text,
    envelope text,
    "sessionDigest" text,
    "sessionUntil" timestamp(6) with time zone,
    "deliveredAt" timestamp(6) with time zone,
    "acceptedAt" timestamp(6) with time zone,
    "values" jsonb,
    "reviewedSha256" text,
    CONSTRAINT "SignCeremonyRecipient_status_check" CHECK ((status = ANY (ARRAY['WAITING'::text, 'INVITED'::text, 'ACCEPTED'::text])))
);

CREATE TABLE platform."SignReminder" (
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "requestId" uuid NOT NULL,
    "commandId" uuid NOT NULL,
    "roleId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."SignRequestDraft" (
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "requestId" uuid NOT NULL,
    "templateId" uuid NOT NULL,
    "templateRevision" integer NOT NULL,
    "actorId" text NOT NULL,
    "commandId" uuid NOT NULL,
    fingerprint character(64) NOT NULL,
    routing text NOT NULL,
    recipients jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "SignRequestDraft_routing_check" CHECK ((routing = ANY (ARRAY['parallel'::text, 'sequential'::text])))
);

CREATE TABLE platform."SignTemplatePublication" (
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "templateId" uuid NOT NULL,
    revision integer NOT NULL,
    "originalSha256" character(64) NOT NULL,
    "canonicalSha256" character(64) NOT NULL,
    profile text NOT NULL,
    "actorId" text NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."SignTemplateRevision" (
    "tenantId" text NOT NULL,
    "workspaceId" text NOT NULL,
    "templateId" uuid NOT NULL,
    revision integer NOT NULL,
    "actorId" text NOT NULL,
    "commandId" uuid NOT NULL,
    fingerprint character(64) NOT NULL,
    title character varying(160) NOT NULL,
    layout jsonb NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    CONSTRAINT "SignTemplateRevision_revision_check" CHECK ((revision > 0))
);

CREATE TABLE platform."TemplateCatalog" (
    template_id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    version text NOT NULL,
    description text,
    requires_apps_json text NOT NULL,
    params_schema_json text NOT NULL,
    upgrade_policy_json text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."TenantAppInstall" (
    id text NOT NULL,
    tenant_id text NOT NULL,
    app_id text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    installed_version text NOT NULL,
    config_json text,
    enabled_at timestamp(6) with time zone,
    enabled_by_user_id text,
    disabled_at timestamp(6) with time zone,
    disabled_by_user_id text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."TenantFeatureOverride" (
    id text NOT NULL,
    tenant_id text NOT NULL,
    feature_key text NOT NULL,
    value_json text NOT NULL,
    updated_by text,
    updated_at timestamp(6) with time zone NOT NULL,
    reason text
);

CREATE TABLE platform."TenantMenuOverride" (
    id text NOT NULL,
    tenant_id text NOT NULL,
    scope platform."MenuScope" NOT NULL,
    overrides_json text NOT NULL,
    updated_by_user_id text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."TenantPackInstall" (
    id text NOT NULL,
    tenant_id text NOT NULL,
    pack_id text NOT NULL,
    version text NOT NULL,
    status platform."PackInstallStatus" DEFAULT 'PENDING'::platform."PackInstallStatus" NOT NULL,
    params_json text,
    log_json text DEFAULT '[]'::text NOT NULL,
    started_at timestamp(6) with time zone,
    completed_at timestamp(6) with time zone,
    installed_by_user_id text,
    error_json text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."TenantTemplateInstall" (
    id text NOT NULL,
    tenant_id text NOT NULL,
    template_id text NOT NULL,
    version text NOT NULL,
    params_json text NOT NULL,
    applied_by_user_id text,
    applied_at timestamp(6) with time zone NOT NULL,
    result_summary_json text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE platform."ToolExecution" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "runId" text NOT NULL,
    "toolCallId" text NOT NULL,
    "toolName" text NOT NULL,
    "inputJson" text NOT NULL,
    "outputJson" text,
    status text NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "finishedAt" timestamp(3) without time zone,
    "errorJson" text,
    "traceId" text
);

CREATE TABLE platform."Workspace" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "legalEntityId" text NOT NULL,
    name text NOT NULL,
    slug text,
    "publicEnabled" boolean DEFAULT false NOT NULL,
    "publicModules" jsonb,
    "onboardingStatus" platform."WorkspaceOnboardingStatus" DEFAULT 'NEW'::platform."WorkspaceOnboardingStatus" NOT NULL,
    "onboardingCompletedAt" timestamp(6) with time zone,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(6) with time zone NOT NULL,
    "invoiceSettings" jsonb,
    "deletedAt" timestamp(6) with time zone,
    "verticalId" character varying(32)
);

CREATE TABLE platform."WorkspaceDomain" (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    domain text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."WorkspaceInvite" (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    email text NOT NULL,
    role platform."WorkspaceMembershipRole" NOT NULL,
    status platform."WorkspaceInviteStatus" DEFAULT 'PENDING'::platform."WorkspaceInviteStatus" NOT NULL,
    token text NOT NULL,
    "expiresAt" timestamp(6) with time zone NOT NULL,
    "acceptedAt" timestamp(6) with time zone,
    "createdByUserId" text,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform."WorkspaceMembership" (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    "userId" text NOT NULL,
    role platform."WorkspaceMembershipRole" NOT NULL,
    status platform."WorkspaceMembershipStatus" DEFAULT 'ACTIVE'::platform."WorkspaceMembershipStatus" NOT NULL,
    "createdAt" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE platform.integration_connections (
    id text NOT NULL,
    tenant_id text NOT NULL,
    workspace_id text NOT NULL,
    kind platform."IntegrationKind" NOT NULL,
    auth_method platform."IntegrationAuthMethod" NOT NULL,
    display_name character varying(120),
    config_json jsonb NOT NULL,
    secret_encrypted text,
    status platform."IntegrationConnectionStatus" DEFAULT 'ACTIVE'::platform."IntegrationConnectionStatus" NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE workflow."AuditLog" (
    id text NOT NULL,
    "tenantId" text,
    action text NOT NULL,
    "actorUserId" text,
    entity text NOT NULL,
    "entityId" text NOT NULL,
    details text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE workflow."DomainEvent" (
    id text NOT NULL,
    "tenantId" text,
    "eventType" text NOT NULL,
    payload text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE workflow."IdempotencyKey" (
    id text NOT NULL,
    "tenantId" text,
    "actionKey" text NOT NULL,
    key text NOT NULL,
    "userId" text,
    "requestHash" text,
    status text DEFAULT 'IN_PROGRESS'::text NOT NULL,
    "responseJson" text,
    "responseStatus" integer,
    "statusCode" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "expiresAt" timestamp(3) without time zone
);

CREATE TABLE workflow."OutboxEvent" (
    id text NOT NULL,
    "tenantId" text,
    "eventType" text NOT NULL,
    "payloadJson" text NOT NULL,
    status workflow."OutboxStatus" DEFAULT 'PENDING'::workflow."OutboxStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "availableAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "correlationId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lockedBy" text,
    "lockedUntil" timestamp(3) without time zone,
    "lastError" text
);

CREATE TABLE workflow."Task" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "instanceId" text NOT NULL,
    name text NOT NULL,
    type workflow."TaskType" NOT NULL,
    status workflow."TaskStatus" DEFAULT 'PENDING'::workflow."TaskStatus" NOT NULL,
    "runAt" timestamp(3) without time zone,
    "dueAt" timestamp(3) without time zone,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 3 NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "lockedBy" text,
    "assigneeUserId" text,
    "assigneeRoleId" text,
    "assigneePermissionKey" text,
    "idempotencyKey" text,
    input text,
    output text,
    error text,
    "traceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE workflow."WorkflowDefinition" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    key text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    name text NOT NULL,
    description text,
    type workflow."WorkflowDefinitionType" DEFAULT 'GENERAL'::workflow."WorkflowDefinitionType" NOT NULL,
    status workflow."WorkflowDefinitionStatus" DEFAULT 'ACTIVE'::workflow."WorkflowDefinitionStatus" NOT NULL,
    spec text NOT NULL,
    "createdBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE TABLE workflow."WorkflowEvent" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "instanceId" text NOT NULL,
    type text NOT NULL,
    payload text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE workflow."WorkflowInstance" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "definitionId" text NOT NULL,
    "businessKey" text,
    status workflow."WorkflowInstanceStatus" DEFAULT 'PENDING'::workflow."WorkflowInstanceStatus" NOT NULL,
    "currentState" text,
    context text,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "lastError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

INSERT INTO content."DirectoryRestaurant" (id, "tenantId", "workspaceId", slug, name, "shortDescription", phone, website, "priceRange", "dishTags", "neighborhoodSlug", "addressLine", "postalCode", city, lat, lng, "openingHoursJson", status, "createdAt", "updatedAt") VALUES ('dir_restaurant_01', 'directory-public-tenant', 'directory-public-workspace', 'pho-viet-mitte', 'Pho Viet Mitte', 'Casual pho spot in central Berlin.', '+49 30 5551 1001', 'https://example.com/pho-viet-mitte', '$$', '{pho,bun-cha,summer-rolls}', 'mitte', 'Rosenthaler Str. 10', '10119', 'Berlin', 52.5243700, 13.4021800, '{"fri": ["11:30-22:30"], "mon": ["11:30-22:00"], "sat": ["12:00-22:30"], "sun": ["12:00-21:30"], "thu": ["11:30-22:00"], "tue": ["11:30-22:00"], "wed": ["11:30-22:00"]}', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO content."DirectoryRestaurant" (id, "tenantId", "workspaceId", slug, name, "shortDescription", phone, website, "priceRange", "dishTags", "neighborhoodSlug", "addressLine", "postalCode", city, lat, lng, "openingHoursJson", status, "createdAt", "updatedAt") VALUES ('dir_restaurant_02', 'directory-public-tenant', 'directory-public-workspace', 'bun-bo-friedrichshain', 'Bun Bo Friedrichshain', 'Bun bowls and grilled meats near Boxhagener Platz.', '+49 30 5551 1002', 'https://example.com/bun-bo-friedrichshain', '$$', '{bun-bo,grilled-pork,iced-coffee}', 'friedrichshain', 'Warschauer Str. 44', '10243', 'Berlin', 52.5073600, 13.4508400, '{"fri": ["12:00-23:00"], "mon": ["12:00-22:00"], "sat": ["12:00-23:00"], "sun": ["12:00-21:00"], "thu": ["12:00-22:00"], "tue": ["12:00-22:00"], "wed": ["12:00-22:00"]}', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO content."DirectoryRestaurant" (id, "tenantId", "workspaceId", slug, name, "shortDescription", phone, website, "priceRange", "dishTags", "neighborhoodSlug", "addressLine", "postalCode", city, lat, lng, "openingHoursJson", status, "createdAt", "updatedAt") VALUES ('dir_restaurant_03', 'directory-public-tenant', 'directory-public-workspace', 'saigon-kitchen-neukolln', 'Saigon Kitchen Neukoelln', 'Family-run kitchen for com tam and banh mi.', '+49 30 5551 1003', 'https://example.com/saigon-kitchen-neukolln', '$', '{banh-mi,com-tam,spring-rolls}', 'neukolln', 'Karl-Marx-Str. 150', '12043', 'Berlin', 52.4814700, 13.4353700, '{"fri": ["11:30-22:00"], "mon": ["11:30-21:30"], "sat": ["12:00-22:00"], "sun": ["12:00-21:00"], "thu": ["11:30-21:30"], "tue": ["11:30-21:30"], "wed": ["11:30-21:30"]}', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO content."DirectoryRestaurant" (id, "tenantId", "workspaceId", slug, name, "shortDescription", phone, website, "priceRange", "dishTags", "neighborhoodSlug", "addressLine", "postalCode", city, lat, lng, "openingHoursJson", status, "createdAt", "updatedAt") VALUES ('dir_restaurant_04', 'directory-public-tenant', 'directory-public-workspace', 'hanoi-corner-prenzlauer-berg', 'Hanoi Corner Prenzlauer Berg', 'Northern-style soups and small plates.', '+49 30 5551 1004', 'https://example.com/hanoi-corner-prenzlauer-berg', '$$$', '{bun-rieu,pho,nem-ran}', 'prenzlauer-berg', 'Kastanienallee 22', '10435', 'Berlin', 52.5398200, 13.4055600, '{"fri": ["12:00-22:30"], "mon": ["12:00-22:00"], "sat": ["12:00-22:30"], "sun": ["12:00-21:30"], "thu": ["12:00-22:00"], "tue": ["12:00-22:00"], "wed": ["12:00-22:00"]}', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO content."DirectoryRestaurant" (id, "tenantId", "workspaceId", slug, name, "shortDescription", phone, website, "priceRange", "dishTags", "neighborhoodSlug", "addressLine", "postalCode", city, lat, lng, "openingHoursJson", status, "createdAt", "updatedAt") VALUES ('dir_restaurant_05', 'directory-public-tenant', 'directory-public-workspace', 'vegan-vietnam-kreuzberg', 'Vegan Vietnam Kreuzberg', 'Plant-based Vietnamese classics in Kreuzberg.', '+49 30 5551 1005', 'https://example.com/vegan-vietnam-kreuzberg', '$$', '{vegan-pho,tofu,banh-xeo}', 'kreuzberg', 'Oranienstr. 80', '10969', 'Berlin', 52.5006400, 13.4173000, '{"fri": ["12:00-23:00"], "mon": ["12:00-22:00"], "sat": ["12:00-23:00"], "sun": ["12:00-21:00"], "thu": ["12:00-22:00"], "tue": ["12:00-22:00"], "wed": ["12:00-22:00"]}', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('email', 'Email', 'EMAIL', '{"log": true, "copy": true, "open": true, "subject": true, "manualOnly": false, "attachments": true, "canSendFromCRM": true, "supportsThreads": true, "canReceiveInbound": true, "hasDeliveryReceipts": true, "supportsAttachments": true}', 'resend', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('whatsapp', 'WhatsApp', 'MESSAGING', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": false, "attachments": false, "canSendFromCRM": true, "supportsThreads": true, "canReceiveInbound": true, "hasDeliveryReceipts": true, "supportsAttachments": false}', 'meta', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('sms', 'SMS', 'MESSAGING', '{"log": true, "copy": true, "open": false, "subject": false, "manualOnly": false, "attachments": false, "canSendFromCRM": true, "supportsThreads": false, "canReceiveInbound": true, "hasDeliveryReceipts": true, "supportsAttachments": false}', 'twilio', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('in_app', 'In-App', 'INTERNAL', '{"log": true, "copy": true, "open": false, "subject": false, "manualOnly": false, "attachments": true, "canSendFromCRM": true, "supportsThreads": true, "canReceiveInbound": true, "hasDeliveryReceipts": false, "supportsAttachments": true}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('linkedin', 'LinkedIn', 'SOCIAL', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": true, "attachments": false, "canSendFromCRM": false, "supportsThreads": true, "canReceiveInbound": false, "hasDeliveryReceipts": false, "supportsAttachments": false}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('facebook_messenger', 'Facebook Messenger', 'SOCIAL', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": true, "attachments": false, "canSendFromCRM": false, "supportsThreads": true, "canReceiveInbound": false, "hasDeliveryReceipts": false, "supportsAttachments": false}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('instagram_dm', 'Instagram DM', 'SOCIAL', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": true, "attachments": false, "canSendFromCRM": false, "supportsThreads": true, "canReceiveInbound": false, "hasDeliveryReceipts": false, "supportsAttachments": false}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('x_dm', 'X DM', 'SOCIAL', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": true, "attachments": false, "canSendFromCRM": false, "supportsThreads": true, "canReceiveInbound": false, "hasDeliveryReceipts": false, "supportsAttachments": false}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('telegram', 'Telegram', 'SOCIAL', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": true, "attachments": false, "canSendFromCRM": false, "supportsThreads": true, "canReceiveInbound": false, "hasDeliveryReceipts": false, "supportsAttachments": false}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('wechat', 'WeChat', 'SOCIAL', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": true, "attachments": false, "canSendFromCRM": false, "supportsThreads": true, "canReceiveInbound": false, "hasDeliveryReceipts": false, "supportsAttachments": false}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO crm."ChannelRegistry" (key, "displayName", category, capabilities, "defaultProviderKey", enabled, "createdAt", "updatedAt") VALUES ('line', 'LINE', 'SOCIAL', '{"log": true, "copy": true, "open": true, "subject": false, "manualOnly": true, "attachments": false, "canSendFromCRM": false, "supportsThreads": true, "canReceiveInbound": false, "hasDeliveryReceipts": false, "supportsAttachments": false}', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE ONLY accounting."AccountingPeriod"
    ADD CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY accounting."AccountingSettings"
    ADD CONSTRAINT "AccountingSettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY accounting."AiInteraction"
    ADD CONSTRAINT "AiInteraction_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY accounting."JournalEntry"
    ADD CONSTRAINT "JournalEntry_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY accounting."JournalLine"
    ADD CONSTRAINT "JournalLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY accounting."LedgerAccount"
    ADD CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_assistant_workspaces
    ADD CONSTRAINT cash_assistant_workspaces_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_day_close_count_lines
    ADD CONSTRAINT cash_day_close_count_lines_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_day_close_review_requirements
    ADD CONSTRAINT cash_day_close_review_requirements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_day_close_revisions
    ADD CONSTRAINT cash_day_close_revisions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_day_closes
    ADD CONSTRAINT cash_day_closes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_day_confirmations
    ADD CONSTRAINT cash_day_confirmations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_entries
    ADD CONSTRAINT cash_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_entry_attachments
    ADD CONSTRAINT cash_entry_attachments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_entry_confirmations
    ADD CONSTRAINT cash_entry_confirmations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_entry_counters
    ADD CONSTRAINT cash_entry_counters_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_export_artifacts
    ADD CONSTRAINT cash_export_artifacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_location_transfers
    ADD CONSTRAINT cash_location_transfers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_registers
    ADD CONSTRAINT cash_registers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY accounting.cash_workspace_handoffs
    ADD CONSTRAINT cash_workspace_handoffs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY billing."BankAccount"
    ADD CONSTRAINT "BankAccount_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."BillingAccount"
    ADD CONSTRAINT "BillingAccount_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."BillingProviderEvent"
    ADD CONSTRAINT "BillingProviderEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."BillingSubscription"
    ADD CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."BillingTrial"
    ADD CONSTRAINT "BillingTrial_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."BillingUsageCounter"
    ADD CONSTRAINT "BillingUsageCounter_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."ExpenseLine"
    ADD CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."InvoiceEmailDelivery"
    ADD CONSTRAINT "InvoiceEmailDelivery_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."InvoiceLine"
    ADD CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."InvoicePayment"
    ADD CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."InvoiceReminderState"
    ADD CONSTRAINT "InvoiceReminderState_invoiceId_key" UNIQUE ("invoiceId");

ALTER TABLE ONLY billing."InvoiceReminderState"
    ADD CONSTRAINT "InvoiceReminderState_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."Invoice"
    ADD CONSTRAINT "Invoice_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxCode"
    ADD CONSTRAINT "TaxCode_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxConsultant"
    ADD CONSTRAINT "TaxConsultant_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxDocumentLink"
    ADD CONSTRAINT "TaxDocumentLink_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxEricJob"
    ADD CONSTRAINT "TaxEricJob_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxFilingEvent"
    ADD CONSTRAINT "TaxFilingEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxProfile"
    ADD CONSTRAINT "TaxProfile_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxRate"
    ADD CONSTRAINT "TaxRate_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxReportLine"
    ADD CONSTRAINT "TaxReportLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxReportSection"
    ADD CONSTRAINT "TaxReportSection_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxReport"
    ADD CONSTRAINT "TaxReport_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."TaxSnapshot"
    ADD CONSTRAINT "TaxSnapshot_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY billing."VatPeriodSummary"
    ADD CONSTRAINT "VatPeriodSummary_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."BillPayment"
    ADD CONSTRAINT "BillPayment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."BookingAllocation"
    ADD CONSTRAINT "BookingAllocation_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."BookingAvailabilityRule"
    ADD CONSTRAINT "BookingAvailabilityRule_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."BookingHold"
    ADD CONSTRAINT "BookingHold_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."BookingResource"
    ADD CONSTRAINT "BookingResource_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."BookingServiceOffering"
    ADD CONSTRAINT "BookingServiceOffering_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogCategory"
    ADD CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogItemCategory"
    ADD CONSTRAINT "CatalogItemCategory_pkey" PRIMARY KEY ("itemId", "categoryId");

ALTER TABLE ONLY commerce."CatalogItem"
    ADD CONSTRAINT "CatalogItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogPriceList"
    ADD CONSTRAINT "CatalogPriceList_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogPrice"
    ADD CONSTRAINT "CatalogPrice_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogTaxProfile"
    ADD CONSTRAINT "CatalogTaxProfile_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogUom"
    ADD CONSTRAINT "CatalogUom_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogVariantBarcode"
    ADD CONSTRAINT "CatalogVariantBarcode_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."CatalogVariant"
    ADD CONSTRAINT "CatalogVariant_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."ImportSettings"
    ADD CONSTRAINT "ImportSettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."ImportShipmentDocument"
    ADD CONSTRAINT "ImportShipmentDocument_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."ImportShipmentLine"
    ADD CONSTRAINT "ImportShipmentLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."ImportShipment"
    ADD CONSTRAINT "ImportShipment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."InventoryDocumentLine"
    ADD CONSTRAINT "InventoryDocumentLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."InventoryDocument"
    ADD CONSTRAINT "InventoryDocument_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."InventoryLocation"
    ADD CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."InventoryLot"
    ADD CONSTRAINT "InventoryLot_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."InventoryProduct"
    ADD CONSTRAINT "InventoryProduct_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."InventorySettings"
    ADD CONSTRAINT "InventorySettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."InventoryWarehouse"
    ADD CONSTRAINT "InventoryWarehouse_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."PurchaseOrderLine"
    ADD CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."PurchaseOrder"
    ADD CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."PurchasingAccountMapping"
    ADD CONSTRAINT "PurchasingAccountMapping_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."PurchasingSettings"
    ADD CONSTRAINT "PurchasingSettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."ReorderPolicy"
    ADD CONSTRAINT "ReorderPolicy_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."SalesOrderLine"
    ADD CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."SalesOrder"
    ADD CONSTRAINT "SalesOrder_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."SalesQuoteLine"
    ADD CONSTRAINT "SalesQuoteLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."SalesQuote"
    ADD CONSTRAINT "SalesQuote_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."SalesSettings"
    ADD CONSTRAINT "SalesSettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."StockMove"
    ADD CONSTRAINT "StockMove_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."StockReservation"
    ADD CONSTRAINT "StockReservation_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."VendorBillLine"
    ADD CONSTRAINT "VendorBillLine_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce."VendorBill"
    ADD CONSTRAINT "VendorBill_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY commerce.kitchen_stations
    ADD CONSTRAINT kitchen_stations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.kitchen_ticket_items
    ADD CONSTRAINT kitchen_ticket_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.kitchen_tickets
    ADD CONSTRAINT kitchen_tickets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.payment_attempts
    ADD CONSTRAINT payment_attempts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_pkey PRIMARY KEY ("idempotencyKey");

ALTER TABLE ONLY commerce.pos_sale_records
    ADD CONSTRAINT pos_sale_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.registers
    ADD CONSTRAINT registers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_approval_requests
    ADD CONSTRAINT restaurant_approval_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_dining_rooms
    ADD CONSTRAINT restaurant_dining_rooms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_menu_item_modifier_groups
    ADD CONSTRAINT restaurant_menu_item_modifier_groups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_modifier_groups
    ADD CONSTRAINT restaurant_modifier_groups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_modifier_options
    ADD CONSTRAINT restaurant_modifier_options_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_order_item_modifiers
    ADD CONSTRAINT restaurant_order_item_modifiers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_order_items
    ADD CONSTRAINT restaurant_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_order_payments
    ADD CONSTRAINT restaurant_order_payments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_orders
    ADD CONSTRAINT restaurant_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_table_sessions
    ADD CONSTRAINT restaurant_table_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.restaurant_tables
    ADD CONSTRAINT restaurant_tables_pkey PRIMARY KEY (id);

ALTER TABLE ONLY commerce.shift_sessions
    ADD CONSTRAINT shift_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY content."CmsComment"
    ADD CONSTRAINT "CmsComment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."CmsPost"
    ADD CONSTRAINT "CmsPost_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."CmsReader"
    ADD CONSTRAINT "CmsReader_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."DirectoryLead"
    ADD CONSTRAINT "DirectoryLead_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."DirectoryRestaurant"
    ADD CONSTRAINT "DirectoryRestaurant_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."PortfolioClient"
    ADD CONSTRAINT "PortfolioClient_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."PortfolioProfile"
    ADD CONSTRAINT "PortfolioProfile_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."PortfolioProjectClient"
    ADD CONSTRAINT "PortfolioProjectClient_pkey" PRIMARY KEY ("projectId", "clientId");

ALTER TABLE ONLY content."PortfolioProject"
    ADD CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."PortfolioService"
    ADD CONSTRAINT "PortfolioService_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."PortfolioShowcase"
    ADD CONSTRAINT "PortfolioShowcase_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."PortfolioTeamMember"
    ADD CONSTRAINT "PortfolioTeamMember_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."RentalAvailabilityRange"
    ADD CONSTRAINT "RentalAvailabilityRange_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."RentalCategory"
    ADD CONSTRAINT "RentalCategory_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."RentalPropertyCategory"
    ADD CONSTRAINT "RentalPropertyCategory_pkey" PRIMARY KEY ("propertyId", "categoryId");

ALTER TABLE ONLY content."RentalPropertyImage"
    ADD CONSTRAINT "RentalPropertyImage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."RentalProperty"
    ADD CONSTRAINT "RentalProperty_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteDomain"
    ADD CONSTRAINT "WebsiteDomain_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteFeedbackImage"
    ADD CONSTRAINT "WebsiteFeedbackImage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteFeedback"
    ADD CONSTRAINT "WebsiteFeedback_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteMenu"
    ADD CONSTRAINT "WebsiteMenu_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsitePageSnapshot"
    ADD CONSTRAINT "WebsitePageSnapshot_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsitePage"
    ADD CONSTRAINT "WebsitePage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteQa"
    ADD CONSTRAINT "WebsiteQa_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteSite"
    ADD CONSTRAINT "WebsiteSite_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteWallOfLoveItemImage"
    ADD CONSTRAINT "WebsiteWallOfLoveItemImage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY content."WebsiteWallOfLoveItem"
    ADD CONSTRAINT "WebsiteWallOfLoveItem_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Activity"
    ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ChannelRegistry"
    ADD CONSTRAINT "ChannelRegistry_pkey" PRIMARY KEY (key);

ALTER TABLE ONLY crm."ChannelTemplate"
    ADD CONSTRAINT "ChannelTemplate_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CheckInEvent"
    ADD CONSTRAINT "CheckInEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassAttendance"
    ADD CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassBillingInvoiceLink"
    ADD CONSTRAINT "ClassBillingInvoiceLink_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassEnrollmentBillingPlan"
    ADD CONSTRAINT "ClassEnrollmentBillingPlan_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassEnrollment"
    ADD CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassGroupInstructor"
    ADD CONSTRAINT "ClassGroupInstructor_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassGroupResource"
    ADD CONSTRAINT "ClassGroupResource_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassGroup"
    ADD CONSTRAINT "ClassGroup_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassMilestoneCompletion"
    ADD CONSTRAINT "ClassMilestoneCompletion_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassMilestone"
    ADD CONSTRAINT "ClassMilestone_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassMonthlyBillingRun"
    ADD CONSTRAINT "ClassMonthlyBillingRun_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassProgramMilestoneTemplate"
    ADD CONSTRAINT "ClassProgramMilestoneTemplate_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassProgramSessionTemplate"
    ADD CONSTRAINT "ClassProgramSessionTemplate_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassProgram"
    ADD CONSTRAINT "ClassProgram_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ClassSession"
    ADD CONSTRAINT "ClassSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingArtifactBundle"
    ADD CONSTRAINT "CoachingArtifactBundle_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingBookingHold"
    ADD CONSTRAINT "CoachingBookingHold_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingContractRequest"
    ADD CONSTRAINT "CoachingContractRequest_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingEngagementEvent"
    ADD CONSTRAINT "CoachingEngagementEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingEngagement"
    ADD CONSTRAINT "CoachingEngagement_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingOffer"
    ADD CONSTRAINT "CoachingOffer_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingPaymentProviderEvent"
    ADD CONSTRAINT "CoachingPaymentProviderEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingPayment"
    ADD CONSTRAINT "CoachingPayment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CoachingSession"
    ADD CONSTRAINT "CoachingSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CommunicationWebhookEvent"
    ADD CONSTRAINT "CommunicationWebhookEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ContactPoint"
    ADD CONSTRAINT "ContactPoint_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CrmAccountProfile"
    ADD CONSTRAINT "CrmAccountProfile_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CrmMailMessage"
    ADD CONSTRAINT "CrmMailMessage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CrmMailThread"
    ADD CONSTRAINT "CrmMailThread_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CrmMailbox"
    ADD CONSTRAINT "CrmMailbox_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."CustomerPackage"
    ADD CONSTRAINT "CustomerPackage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."DealAiSnapshot"
    ADD CONSTRAINT "DealAiSnapshot_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."DealStageTransition"
    ADD CONSTRAINT "DealStageTransition_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Deal"
    ADD CONSTRAINT "Deal_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."EngagementSettings"
    ADD CONSTRAINT "EngagementSettings_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."IssueActivity"
    ADD CONSTRAINT "IssueActivity_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."IssueAttachment"
    ADD CONSTRAINT "IssueAttachment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."IssueComment"
    ADD CONSTRAINT "IssueComment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Issue"
    ADD CONSTRAINT "Issue_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Lead"
    ADD CONSTRAINT "Lead_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."LoyaltyAccount"
    ADD CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."LoyaltyLedgerEntry"
    ADD CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."PackageUsage"
    ADD CONSTRAINT "PackageUsage_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."PartyLifecycleTransition"
    ADD CONSTRAINT "PartyLifecycleTransition_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."PartyRelationship"
    ADD CONSTRAINT "PartyRelationship_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."PartyRole"
    ADD CONSTRAINT "PartyRole_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Party"
    ADD CONSTRAINT "Party_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."PipelineConfig"
    ADD CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."SequenceEnrollment"
    ADD CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."SequenceStep"
    ADD CONSTRAINT "SequenceStep_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."Sequence"
    ADD CONSTRAINT "Sequence_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY crm."ContactPoint"
    ADD CONSTRAINT "tenantId_partyId_type_value" UNIQUE ("tenantId", "partyId", type, value);

ALTER TABLE ONLY ext."ExtEntityAttr"
    ADD CONSTRAINT "ExtEntityAttr_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY ext."ExtEntityLink"
    ADD CONSTRAINT "ExtEntityLink_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY ext."ExtKv"
    ADD CONSTRAINT "ExtKv_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."ApiKey"
    ADD CONSTRAINT "ApiKey_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."Membership"
    ADD CONSTRAINT "Membership_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."PortalOtpCode"
    ADD CONSTRAINT "PortalOtpCode_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."PortalSession"
    ADD CONSTRAINT "PortalSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."PrivacyRequest"
    ADD CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."RolePermissionGrant"
    ADD CONSTRAINT "RolePermissionGrant_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."SsoAppSession"
    ADD CONSTRAINT "SsoAppSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."SsoAttemptBudget"
    ADD CONSTRAINT "SsoAttemptBudget_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."SsoCentralSession"
    ADD CONSTRAINT "SsoCentralSession_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."SsoEmailChallenge"
    ADD CONSTRAINT "SsoEmailChallenge_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."SsoLoginTransaction"
    ADD CONSTRAINT "SsoLoginTransaction_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY identity."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."AgentRun"
    ADD CONSTRAINT "AgentRun_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."AppCatalog"
    ADD CONSTRAINT "AppCatalog_pkey" PRIMARY KEY ("appId");

ALTER TABLE ONLY platform."CustomFieldDefinition"
    ADD CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."CustomFieldIndex"
    ADD CONSTRAINT "CustomFieldIndex_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."DimensionType"
    ADD CONSTRAINT "DimensionType_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."DimensionValue"
    ADD CONSTRAINT "DimensionValue_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."DocumentLink"
    ADD CONSTRAINT "DocumentLink_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."EntityDimension"
    ADD CONSTRAINT "EntityDimension_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."EntityLayout"
    ADD CONSTRAINT "EntityLayout_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."File"
    ADD CONSTRAINT "File_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."FormDefinition"
    ADD CONSTRAINT "FormDefinition_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."FormField"
    ADD CONSTRAINT "FormField_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."FormSubmission"
    ADD CONSTRAINT "FormSubmission_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."LegalEntity"
    ADD CONSTRAINT "LegalEntity_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."NotificationRecipient"
    ADD CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."PackCatalog"
    ADD CONSTRAINT "PackCatalog_pkey" PRIMARY KEY (pack_id);

ALTER TABLE ONLY platform."SeededRecordMeta"
    ADD CONSTRAINT "SeededRecordMeta_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."SignCeremonyRecipient"
    ADD CONSTRAINT "SignCeremonyRecipient_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."SignCeremonyRecipient"
    ADD CONSTRAINT "SignCeremonyRecipient_sessionDigest_key" UNIQUE ("sessionDigest");

ALTER TABLE ONLY platform."SignCeremonyRecipient"
    ADD CONSTRAINT "SignCeremonyRecipient_tenantId_workspaceId_requestId_roleId_key" UNIQUE ("tenantId", "workspaceId", "requestId", "roleId");

ALTER TABLE ONLY platform."SignCeremonyRecipient"
    ADD CONSTRAINT "SignCeremonyRecipient_tokenDigest_key" UNIQUE ("tokenDigest");

ALTER TABLE ONLY platform."SignCeremony"
    ADD CONSTRAINT "SignCeremony_pkey" PRIMARY KEY ("tenantId", "workspaceId", "requestId");

ALTER TABLE ONLY platform."SignReminder"
    ADD CONSTRAINT "SignReminder_pkey" PRIMARY KEY ("tenantId", "workspaceId", "requestId", "commandId");

ALTER TABLE ONLY platform."SignRequestDraft"
    ADD CONSTRAINT "SignRequestDraft_pkey" PRIMARY KEY ("tenantId", "workspaceId", "requestId");

ALTER TABLE ONLY platform."SignTemplatePublication"
    ADD CONSTRAINT "SignTemplatePublication_pkey" PRIMARY KEY ("tenantId", "workspaceId", "templateId", revision);

ALTER TABLE ONLY platform."SignTemplateRevision"
    ADD CONSTRAINT "SignTemplateRevision_pkey" PRIMARY KEY ("tenantId", "workspaceId", "templateId", revision);

ALTER TABLE ONLY platform."TemplateCatalog"
    ADD CONSTRAINT "TemplateCatalog_pkey" PRIMARY KEY (template_id);

ALTER TABLE ONLY platform."TenantAppInstall"
    ADD CONSTRAINT "TenantAppInstall_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."TenantFeatureOverride"
    ADD CONSTRAINT "TenantFeatureOverride_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."TenantMenuOverride"
    ADD CONSTRAINT "TenantMenuOverride_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."TenantPackInstall"
    ADD CONSTRAINT "TenantPackInstall_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."TenantTemplateInstall"
    ADD CONSTRAINT "TenantTemplateInstall_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."ToolExecution"
    ADD CONSTRAINT "ToolExecution_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."WorkspaceDomain"
    ADD CONSTRAINT "WorkspaceDomain_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."WorkspaceInvite"
    ADD CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."WorkspaceMembership"
    ADD CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform."Workspace"
    ADD CONSTRAINT "Workspace_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY platform.integration_connections
    ADD CONSTRAINT integration_connections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY workflow."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY workflow."DomainEvent"
    ADD CONSTRAINT "DomainEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY workflow."IdempotencyKey"
    ADD CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY workflow."OutboxEvent"
    ADD CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY workflow."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY workflow."WorkflowDefinition"
    ADD CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY workflow."WorkflowEvent"
    ADD CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY (id);

ALTER TABLE ONLY workflow."WorkflowInstance"
    ADD CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY (id);

CREATE INDEX "AccountingPeriod_tenantId_fiscalYearId_idx" ON accounting."AccountingPeriod" USING btree ("tenantId", "fiscalYearId");

CREATE UNIQUE INDEX "AccountingPeriod_tenantId_fiscalYearId_name_key" ON accounting."AccountingPeriod" USING btree ("tenantId", "fiscalYearId", name);

CREATE INDEX "AccountingPeriod_tenantId_startDate_idx" ON accounting."AccountingPeriod" USING btree ("tenantId", "startDate");

CREATE INDEX "AccountingPeriod_tenantId_status_idx" ON accounting."AccountingPeriod" USING btree ("tenantId", status);

CREATE INDEX "AccountingSettings_tenantId_idx" ON accounting."AccountingSettings" USING btree ("tenantId");

CREATE UNIQUE INDEX "AccountingSettings_tenantId_key" ON accounting."AccountingSettings" USING btree ("tenantId");

CREATE INDEX "AiInteraction_tenantId_actorUserId_idx" ON accounting."AiInteraction" USING btree ("tenantId", "actorUserId");

CREATE INDEX "AiInteraction_tenantId_contextType_idx" ON accounting."AiInteraction" USING btree ("tenantId", "contextType");

CREATE INDEX "AiInteraction_tenantId_createdAt_idx" ON accounting."AiInteraction" USING btree ("tenantId", "createdAt");

CREATE UNIQUE INDEX "JournalEntry_entryNumber_key" ON accounting."JournalEntry" USING btree ("entryNumber");

CREATE INDEX "JournalEntry_tenantId_createdBy_idx" ON accounting."JournalEntry" USING btree ("tenantId", "createdBy");

CREATE INDEX "JournalEntry_tenantId_postingDate_idx" ON accounting."JournalEntry" USING btree ("tenantId", "postingDate");

CREATE INDEX "JournalEntry_tenantId_reversedByEntryId_idx" ON accounting."JournalEntry" USING btree ("tenantId", "reversedByEntryId");

CREATE INDEX "JournalEntry_tenantId_reversesEntryId_idx" ON accounting."JournalEntry" USING btree ("tenantId", "reversesEntryId");

CREATE INDEX "JournalEntry_tenantId_sourceType_sourceId_idx" ON accounting."JournalEntry" USING btree ("tenantId", "sourceType", "sourceId");

CREATE INDEX "JournalEntry_tenantId_status_idx" ON accounting."JournalEntry" USING btree ("tenantId", status);

CREATE INDEX "JournalLine_journalEntryId_idx" ON accounting."JournalLine" USING btree ("journalEntryId");

CREATE INDEX "JournalLine_ledgerAccountId_idx" ON accounting."JournalLine" USING btree ("ledgerAccountId");

CREATE INDEX "JournalLine_tenantId_ledgerAccountId_idx" ON accounting."JournalLine" USING btree ("tenantId", "ledgerAccountId");

CREATE UNIQUE INDEX "LedgerAccount_tenantId_code_key" ON accounting."LedgerAccount" USING btree ("tenantId", code);

CREATE INDEX "LedgerAccount_tenantId_isActive_idx" ON accounting."LedgerAccount" USING btree ("tenantId", "isActive");

CREATE INDEX "LedgerAccount_tenantId_systemAccountKey_idx" ON accounting."LedgerAccount" USING btree ("tenantId", "systemAccountKey");

CREATE INDEX "LedgerAccount_tenantId_type_idx" ON accounting."LedgerAccount" USING btree ("tenantId", type);

CREATE UNIQUE INDEX "cash_assistant_workspaces_conversationId_key" ON accounting.cash_assistant_workspaces USING btree ("conversationId");

CREATE INDEX "cash_assistant_workspaces_tenantId_workspaceId_conversation_idx" ON accounting.cash_assistant_workspaces USING btree ("tenantId", "workspaceId", "conversationId");

CREATE INDEX "cash_assistant_workspaces_tenantId_workspaceId_type_busines_idx" ON accounting.cash_assistant_workspaces USING btree ("tenantId", "workspaceId", type, "businessDate");

CREATE UNIQUE INDEX "cash_day_close_count_lines_dayCloseId_denominationCents_key" ON accounting.cash_day_close_count_lines USING btree ("dayCloseId", "denominationCents");

CREATE INDEX "cash_day_close_count_lines_tenantId_workspaceId_dayCloseId_idx" ON accounting.cash_day_close_count_lines USING btree ("tenantId", "workspaceId", "dayCloseId");

CREATE UNIQUE INDEX "cash_day_close_review_requirements_revisionId_affectedDayCloseI" ON accounting.cash_day_close_review_requirements USING btree ("revisionId", "affectedDayCloseId");

CREATE INDEX "cash_day_close_review_requirements_tenantId_workspaceId_affecte" ON accounting.cash_day_close_review_requirements USING btree ("tenantId", "workspaceId", "affectedDayCloseId", status);

CREATE UNIQUE INDEX "cash_day_close_revisions_correctionEntryId_key" ON accounting.cash_day_close_revisions USING btree ("correctionEntryId");

CREATE UNIQUE INDEX "cash_day_close_revisions_dayCloseId_revisionNo_key" ON accounting.cash_day_close_revisions USING btree ("dayCloseId", "revisionNo");

CREATE INDEX "cash_day_close_revisions_tenantId_workspaceId_registerId_dayClo" ON accounting.cash_day_close_revisions USING btree ("tenantId", "workspaceId", "registerId", "dayCloseId");

CREATE INDEX "cash_day_closes_tenantId_workspaceId_registerId_dayKey_idx" ON accounting.cash_day_closes USING btree ("tenantId", "workspaceId", "registerId", "dayKey");

CREATE UNIQUE INDEX "cash_day_closes_tenantId_workspaceId_registerId_dayKey_key" ON accounting.cash_day_closes USING btree ("tenantId", "workspaceId", "registerId", "dayKey");

CREATE INDEX "cash_day_closes_tenantId_workspaceId_registerId_submittedAt_idx" ON accounting.cash_day_closes USING btree ("tenantId", "workspaceId", "registerId", "submittedAt");

CREATE INDEX "cash_day_confirmations_status_expiresAt_idx" ON accounting.cash_day_confirmations USING btree (status, "expiresAt");

CREATE INDEX "cash_day_confirmations_tenantId_workspaceId_conversationId_idx" ON accounting.cash_day_confirmations USING btree ("tenantId", "workspaceId", "conversationId");

CREATE INDEX "cash_day_confirmations_tenantId_workspaceId_registerId_idx" ON accounting.cash_day_confirmations USING btree ("tenantId", "workspaceId", "registerId");

CREATE UNIQUE INDEX cash_entries_one_active_daily_z_report_per_day ON accounting.cash_entries USING btree ("tenantId", "workspaceId", "registerId", "dayKey") WHERE (("entryType" = 'SALE_CASH'::text) AND ("sourceDocumentKind" = 'DAILY_Z_REPORT'::text) AND ("reversedByEntryId" IS NULL));

CREATE UNIQUE INDEX "cash_entries_reversedByEntryId_key" ON accounting.cash_entries USING btree ("reversedByEntryId");

CREATE UNIQUE INDEX "cash_entries_tenantId_workspaceId_idempotencyKey_key" ON accounting.cash_entries USING btree ("tenantId", "workspaceId", "idempotencyKey");

CREATE INDEX "cash_entries_tenantId_workspaceId_lockedByDayCloseId_idx" ON accounting.cash_entries USING btree ("tenantId", "workspaceId", "lockedByDayCloseId");

CREATE INDEX "cash_entries_tenantId_workspaceId_registerId_dayKey_occurre_idx" ON accounting.cash_entries USING btree ("tenantId", "workspaceId", "registerId", "dayKey", "occurredAt");

CREATE UNIQUE INDEX "cash_entries_tenantId_workspaceId_registerId_entryNo_key" ON accounting.cash_entries USING btree ("tenantId", "workspaceId", "registerId", "entryNo");

CREATE INDEX "cash_entries_tenantId_workspaceId_registerId_occurredAt_idx" ON accounting.cash_entries USING btree ("tenantId", "workspaceId", "registerId", "occurredAt");

CREATE INDEX "cash_entries_tenantId_workspaceId_reversalOfEntryId_idx" ON accounting.cash_entries USING btree ("tenantId", "workspaceId", "reversalOfEntryId");

CREATE INDEX "cash_entry_attachments_tenantId_workspaceId_documentId_idx" ON accounting.cash_entry_attachments USING btree ("tenantId", "workspaceId", "documentId");

CREATE UNIQUE INDEX "cash_entry_attachments_tenantId_workspaceId_entryId_documen_key" ON accounting.cash_entry_attachments USING btree ("tenantId", "workspaceId", "entryId", "documentId");

CREATE INDEX "cash_entry_attachments_tenantId_workspaceId_entryId_idx" ON accounting.cash_entry_attachments USING btree ("tenantId", "workspaceId", "entryId");

CREATE INDEX "cash_entry_confirmations_status_expiresAt_idx" ON accounting.cash_entry_confirmations USING btree (status, "expiresAt");

CREATE INDEX "cash_entry_confirmations_tenantId_workspaceId_registerId_idx" ON accounting.cash_entry_confirmations USING btree ("tenantId", "workspaceId", "registerId");

CREATE UNIQUE INDEX "cash_entry_counters_registerId_key" ON accounting.cash_entry_counters USING btree ("registerId");

CREATE INDEX "cash_entry_counters_tenantId_workspaceId_registerId_idx" ON accounting.cash_entry_counters USING btree ("tenantId", "workspaceId", "registerId");

CREATE UNIQUE INDEX "cash_entry_counters_tenantId_workspaceId_registerId_key" ON accounting.cash_entry_counters USING btree ("tenantId", "workspaceId", "registerId");

CREATE INDEX "cash_export_artifacts_tenantId_workspaceId_createdAt_idx" ON accounting.cash_export_artifacts USING btree ("tenantId", "workspaceId", "createdAt");

CREATE INDEX "cash_export_artifacts_tenantId_workspaceId_registerId_month_idx" ON accounting.cash_export_artifacts USING btree ("tenantId", "workspaceId", "registerId", month, format);

CREATE INDEX "cash_location_transfers_tenantId_workspaceId_cashFundId_bus_idx" ON accounting.cash_location_transfers USING btree ("tenantId", "workspaceId", "cashFundId", "businessDate");

CREATE INDEX "cash_registers_tenantId_workspaceId_idx" ON accounting.cash_registers USING btree ("tenantId", "workspaceId");

CREATE INDEX "cash_registers_tenantId_workspaceId_name_idx" ON accounting.cash_registers USING btree ("tenantId", "workspaceId", name);

CREATE UNIQUE INDEX cash_workspace_daily_idx ON accounting.cash_assistant_workspaces USING btree ("tenantId", "locationId", "registerId", "businessDate", type);

CREATE INDEX "cash_workspace_handoffs_status_expiresAt_idx" ON accounting.cash_workspace_handoffs USING btree (status, "expiresAt");

CREATE INDEX "cash_workspace_handoffs_tenantId_targetWorkspaceId_idx" ON accounting.cash_workspace_handoffs USING btree ("tenantId", "targetWorkspaceId");

CREATE UNIQUE INDEX cash_workspace_monthly_idx ON accounting.cash_assistant_workspaces USING btree ("tenantId", "locationId", "registerId", "businessMonth", type);

CREATE INDEX "BankAccount_legalEntityId_isDefault_idx" ON billing."BankAccount" USING btree ("legalEntityId", "isDefault");

CREATE INDEX "BankAccount_tenantId_isDefault_idx" ON billing."BankAccount" USING btree ("tenantId", "isDefault");

CREATE INDEX "BankAccount_tenantId_legalEntityId_idx" ON billing."BankAccount" USING btree ("tenantId", "legalEntityId");

CREATE UNIQUE INDEX "BankAccount_tenantId_legalEntityId_label_key" ON billing."BankAccount" USING btree ("tenantId", "legalEntityId", label);

CREATE INDEX "BillingAccount_provider_providerCustomerRef_idx" ON billing."BillingAccount" USING btree (provider, "providerCustomerRef");

CREATE UNIQUE INDEX "BillingAccount_tenantId_key" ON billing."BillingAccount" USING btree ("tenantId");

CREATE INDEX "BillingProviderEvent_accountId_idx" ON billing."BillingProviderEvent" USING btree ("accountId");

CREATE UNIQUE INDEX "BillingProviderEvent_provider_externalEventId_key" ON billing."BillingProviderEvent" USING btree (provider, "externalEventId");

CREATE INDEX "BillingProviderEvent_tenantId_createdAt_idx" ON billing."BillingProviderEvent" USING btree ("tenantId", "createdAt");

CREATE INDEX "BillingSubscription_accountId_idx" ON billing."BillingSubscription" USING btree ("accountId");

CREATE UNIQUE INDEX "BillingSubscription_provider_providerSubscriptionRef_key" ON billing."BillingSubscription" USING btree (provider, "providerSubscriptionRef");

CREATE UNIQUE INDEX "BillingSubscription_tenantId_productKey_key" ON billing."BillingSubscription" USING btree ("tenantId", "productKey");

CREATE INDEX "BillingSubscription_tenantId_productKey_status_idx" ON billing."BillingSubscription" USING btree ("tenantId", "productKey", status);

CREATE INDEX "BillingTrial_accountId_idx" ON billing."BillingTrial" USING btree ("accountId");

CREATE INDEX "BillingTrial_status_endsAt_idx" ON billing."BillingTrial" USING btree (status, "endsAt");

CREATE UNIQUE INDEX "BillingTrial_tenantId_productKey_key" ON billing."BillingTrial" USING btree ("tenantId", "productKey");

CREATE INDEX "BillingUsageCounter_tenantId_productKey_metricKey_idx" ON billing."BillingUsageCounter" USING btree ("tenantId", "productKey", "metricKey");

CREATE UNIQUE INDEX "BillingUsageCounter_tenantId_productKey_metricKey_periodSta_key" ON billing."BillingUsageCounter" USING btree ("tenantId", "productKey", "metricKey", "periodStart", "periodEnd");

CREATE INDEX "ExpenseLine_expenseId_idx" ON billing."ExpenseLine" USING btree ("expenseId");

CREATE INDEX "ExpenseLine_tenantId_idx" ON billing."ExpenseLine" USING btree ("tenantId");

CREATE INDEX "Expense_tenantId_archivedAt_idx" ON billing."Expense" USING btree ("tenantId", "archivedAt");

CREATE INDEX "Expense_tenantId_expenseDate_idx" ON billing."Expense" USING btree ("tenantId", "expenseDate");

CREATE INDEX "Expense_tenantId_idx" ON billing."Expense" USING btree ("tenantId");

CREATE INDEX "Expense_tenantId_status_idx" ON billing."Expense" USING btree ("tenantId", status);

CREATE INDEX "InvoiceEmailDelivery_providerMessageId_idx" ON billing."InvoiceEmailDelivery" USING btree ("providerMessageId");

CREATE UNIQUE INDEX "InvoiceEmailDelivery_tenantId_idempotencyKey_key" ON billing."InvoiceEmailDelivery" USING btree ("tenantId", "idempotencyKey");

CREATE INDEX "InvoiceEmailDelivery_tenantId_invoiceId_idx" ON billing."InvoiceEmailDelivery" USING btree ("tenantId", "invoiceId");

CREATE INDEX "InvoiceLine_invoiceId_idx" ON billing."InvoiceLine" USING btree ("invoiceId");

CREATE INDEX "InvoicePayment_invoiceId_idx" ON billing."InvoicePayment" USING btree ("invoiceId");

CREATE UNIQUE INDEX "InvoiceReminderState_tenantId_invoiceId_key" ON billing."InvoiceReminderState" USING btree ("tenantId", "invoiceId");

CREATE INDEX "InvoiceReminderState_tenantId_lockedAt_idx" ON billing."InvoiceReminderState" USING btree ("tenantId", "lockedAt");

CREATE INDEX "InvoiceReminderState_tenantId_workspaceId_nextReminderAt_idx" ON billing."InvoiceReminderState" USING btree ("tenantId", "workspaceId", "nextReminderAt");

CREATE INDEX "Invoice_legalEntityId_idx" ON billing."Invoice" USING btree ("legalEntityId");

CREATE INDEX "Invoice_paymentMethodId_idx" ON billing."Invoice" USING btree ("paymentMethodId");

CREATE INDEX "Invoice_tenantId_createdAt_idx" ON billing."Invoice" USING btree ("tenantId", "createdAt");

CREATE INDEX "Invoice_tenantId_customerPartyId_idx" ON billing."Invoice" USING btree ("tenantId", "customerPartyId");

CREATE UNIQUE INDEX "Invoice_tenantId_number_key" ON billing."Invoice" USING btree ("tenantId", number);

CREATE INDEX "Invoice_tenantId_status_idx" ON billing."Invoice" USING btree ("tenantId", status);

CREATE INDEX "PaymentMethod_bankAccountId_idx" ON billing."PaymentMethod" USING btree ("bankAccountId");

CREATE INDEX "PaymentMethod_tenantId_isDefaultForInvoicing_idx" ON billing."PaymentMethod" USING btree ("tenantId", "isDefaultForInvoicing");

CREATE INDEX "PaymentMethod_tenantId_legalEntityId_idx" ON billing."PaymentMethod" USING btree ("tenantId", "legalEntityId");

CREATE UNIQUE INDEX "PaymentMethod_tenantId_legalEntityId_label_key" ON billing."PaymentMethod" USING btree ("tenantId", "legalEntityId", label);

CREATE UNIQUE INDEX "TaxCode_tenantId_code_key" ON billing."TaxCode" USING btree ("tenantId", code);

CREATE INDEX "TaxCode_tenantId_isActive_idx" ON billing."TaxCode" USING btree ("tenantId", "isActive");

CREATE INDEX "TaxConsultant_tenantId_idx" ON billing."TaxConsultant" USING btree ("tenantId");

CREATE UNIQUE INDEX "TaxConsultant_tenantId_name_key" ON billing."TaxConsultant" USING btree ("tenantId", name);

CREATE UNIQUE INDEX "TaxDocumentLink_tenantId_entityType_entityId_documentId_key" ON billing."TaxDocumentLink" USING btree ("tenantId", "entityType", "entityId", "documentId");

CREATE INDEX "TaxDocumentLink_tenantId_entityType_entityId_idx" ON billing."TaxDocumentLink" USING btree ("tenantId", "entityType", "entityId");

CREATE INDEX "TaxEricJob_tenantId_reportId_action_idempotencyKey_idx" ON billing."TaxEricJob" USING btree ("tenantId", "reportId", action, "idempotencyKey");

CREATE INDEX "TaxEricJob_tenantId_reportId_createdAt_idx" ON billing."TaxEricJob" USING btree ("tenantId", "reportId", "createdAt");

CREATE INDEX "TaxEricJob_tenantId_status_createdAt_idx" ON billing."TaxEricJob" USING btree ("tenantId", status, "createdAt");

CREATE INDEX "TaxFilingEvent_processedAt_idx" ON billing."TaxFilingEvent" USING btree ("processedAt");

CREATE INDEX "TaxFilingEvent_tenantId_filingId_idx" ON billing."TaxFilingEvent" USING btree ("tenantId", "filingId");

CREATE INDEX "TaxProfile_tenantId_country_idx" ON billing."TaxProfile" USING btree ("tenantId", country);

CREATE UNIQUE INDEX "TaxProfile_tenantId_effectiveFrom_key" ON billing."TaxProfile" USING btree ("tenantId", "effectiveFrom");

CREATE INDEX "TaxRate_effectiveFrom_idx" ON billing."TaxRate" USING btree ("effectiveFrom");

CREATE INDEX "TaxRate_tenantId_taxCodeId_idx" ON billing."TaxRate" USING btree ("tenantId", "taxCodeId");

CREATE INDEX "TaxReportLine_reportId_idx" ON billing."TaxReportLine" USING btree ("reportId");

CREATE INDEX "TaxReportSection_tenantId_filingId_idx" ON billing."TaxReportSection" USING btree ("tenantId", "filingId");

CREATE UNIQUE INDEX "TaxReportSection_tenantId_reportId_sectionKey_key" ON billing."TaxReportSection" USING btree ("tenantId", "reportId", "sectionKey");

CREATE INDEX "TaxReport_tenantId_periodStart_periodEnd_idx" ON billing."TaxReport" USING btree ("tenantId", "periodStart", "periodEnd");

CREATE INDEX "TaxReport_tenantId_status_idx" ON billing."TaxReport" USING btree ("tenantId", status);

CREATE UNIQUE INDEX "TaxReport_tenantId_type_periodStart_periodEnd_key" ON billing."TaxReport" USING btree ("tenantId", type, "periodStart", "periodEnd");

CREATE INDEX "TaxSnapshot_calculatedAt_idx" ON billing."TaxSnapshot" USING btree ("calculatedAt");

CREATE INDEX "TaxSnapshot_tenantId_sourceType_idx" ON billing."TaxSnapshot" USING btree ("tenantId", "sourceType");

CREATE UNIQUE INDEX "TaxSnapshot_tenantId_sourceType_sourceId_key" ON billing."TaxSnapshot" USING btree ("tenantId", "sourceType", "sourceId");

CREATE INDEX "VatPeriodSummary_periodStart_idx" ON billing."VatPeriodSummary" USING btree ("periodStart");

CREATE UNIQUE INDEX "VatPeriodSummary_tenantId_periodStart_periodEnd_key" ON billing."VatPeriodSummary" USING btree ("tenantId", "periodStart", "periodEnd");

CREATE INDEX "VatPeriodSummary_tenantId_status_idx" ON billing."VatPeriodSummary" USING btree ("tenantId", status);

CREATE INDEX "BillPayment_tenantId_vendorBillId_idx" ON commerce."BillPayment" USING btree ("tenantId", "vendorBillId");

CREATE INDEX "BillPayment_vendorBillId_idx" ON commerce."BillPayment" USING btree ("vendorBillId");

CREATE INDEX "BookingAllocation_tenantId_bookingId_idx" ON commerce."BookingAllocation" USING btree ("tenantId", "bookingId");

CREATE INDEX "BookingAllocation_tenantId_resourceId_idx" ON commerce."BookingAllocation" USING btree ("tenantId", "resourceId");

CREATE INDEX "BookingAllocation_tenantId_resourceId_startAt_idx" ON commerce."BookingAllocation" USING btree ("tenantId", "resourceId", "startAt");

CREATE INDEX "BookingAvailabilityRule_tenantId_resourceId_idx" ON commerce."BookingAvailabilityRule" USING btree ("tenantId", "resourceId");

CREATE UNIQUE INDEX "BookingAvailabilityRule_tenantId_resourceId_key" ON commerce."BookingAvailabilityRule" USING btree ("tenantId", "resourceId");

CREATE INDEX "BookingHold_tenantId_expiresAt_idx" ON commerce."BookingHold" USING btree ("tenantId", "expiresAt");

CREATE INDEX "BookingHold_tenantId_idx" ON commerce."BookingHold" USING btree ("tenantId");

CREATE INDEX "BookingHold_tenantId_status_idx" ON commerce."BookingHold" USING btree ("tenantId", status);

CREATE INDEX "BookingResource_tenantId_idx" ON commerce."BookingResource" USING btree ("tenantId");

CREATE INDEX "BookingResource_tenantId_isActive_idx" ON commerce."BookingResource" USING btree ("tenantId", "isActive");

CREATE INDEX "BookingResource_tenantId_type_idx" ON commerce."BookingResource" USING btree ("tenantId", type);

CREATE INDEX "BookingResource_tenantId_workspaceId_idx" ON commerce."BookingResource" USING btree ("tenantId", "workspaceId");

CREATE INDEX "BookingServiceOffering_tenantId_idx" ON commerce."BookingServiceOffering" USING btree ("tenantId");

CREATE INDEX "BookingServiceOffering_tenantId_isActive_idx" ON commerce."BookingServiceOffering" USING btree ("tenantId", "isActive");

CREATE INDEX "BookingServiceOffering_tenantId_workspaceId_idx" ON commerce."BookingServiceOffering" USING btree ("tenantId", "workspaceId");

CREATE INDEX "Booking_tenantId_bookedByPartyId_idx" ON commerce."Booking" USING btree ("tenantId", "bookedByPartyId");

CREATE INDEX "Booking_tenantId_endAt_idx" ON commerce."Booking" USING btree ("tenantId", "endAt");

CREATE INDEX "Booking_tenantId_idx" ON commerce."Booking" USING btree ("tenantId");

CREATE INDEX "Booking_tenantId_serviceOfferingId_idx" ON commerce."Booking" USING btree ("tenantId", "serviceOfferingId");

CREATE INDEX "Booking_tenantId_startAt_idx" ON commerce."Booking" USING btree ("tenantId", "startAt");

CREATE INDEX "Booking_tenantId_status_idx" ON commerce."Booking" USING btree ("tenantId", status);

CREATE INDEX "Booking_tenantId_workspaceId_idx" ON commerce."Booking" USING btree ("tenantId", "workspaceId");

CREATE UNIQUE INDEX "CatalogCategory_tenantId_workspaceId_name_key" ON commerce."CatalogCategory" USING btree ("tenantId", "workspaceId", name);

CREATE INDEX "CatalogCategory_tenantId_workspaceId_parentId_idx" ON commerce."CatalogCategory" USING btree ("tenantId", "workspaceId", "parentId");

CREATE INDEX "CatalogItem_tenantId_workspaceId_archivedAt_idx" ON commerce."CatalogItem" USING btree ("tenantId", "workspaceId", "archivedAt");

CREATE UNIQUE INDEX "CatalogItem_tenantId_workspaceId_code_key" ON commerce."CatalogItem" USING btree ("tenantId", "workspaceId", code);

CREATE INDEX "CatalogItem_tenantId_workspaceId_name_idx" ON commerce."CatalogItem" USING btree ("tenantId", "workspaceId", name);

CREATE INDEX "CatalogItem_tenantId_workspaceId_status_type_idx" ON commerce."CatalogItem" USING btree ("tenantId", "workspaceId", status, type);

CREATE UNIQUE INDEX "CatalogPriceList_tenantId_workspaceId_name_key" ON commerce."CatalogPriceList" USING btree ("tenantId", "workspaceId", name);

CREATE INDEX "CatalogPriceList_tenantId_workspaceId_status_idx" ON commerce."CatalogPriceList" USING btree ("tenantId", "workspaceId", status);

CREATE INDEX "CatalogPrice_tenantId_workspaceId_itemId_idx" ON commerce."CatalogPrice" USING btree ("tenantId", "workspaceId", "itemId");

CREATE INDEX "CatalogPrice_tenantId_workspaceId_priceListId_idx" ON commerce."CatalogPrice" USING btree ("tenantId", "workspaceId", "priceListId");

CREATE INDEX "CatalogPrice_tenantId_workspaceId_variantId_idx" ON commerce."CatalogPrice" USING btree ("tenantId", "workspaceId", "variantId");

CREATE INDEX "CatalogTaxProfile_tenantId_workspaceId_archivedAt_idx" ON commerce."CatalogTaxProfile" USING btree ("tenantId", "workspaceId", "archivedAt");

CREATE UNIQUE INDEX "CatalogTaxProfile_tenantId_workspaceId_name_key" ON commerce."CatalogTaxProfile" USING btree ("tenantId", "workspaceId", name);

CREATE UNIQUE INDEX "CatalogUom_tenantId_workspaceId_code_key" ON commerce."CatalogUom" USING btree ("tenantId", "workspaceId", code);

CREATE INDEX "CatalogUom_tenantId_workspaceId_name_idx" ON commerce."CatalogUom" USING btree ("tenantId", "workspaceId", name);

CREATE UNIQUE INDEX "CatalogVariantBarcode_tenantId_workspaceId_barcode_key" ON commerce."CatalogVariantBarcode" USING btree ("tenantId", "workspaceId", barcode);

CREATE INDEX "CatalogVariantBarcode_tenantId_workspaceId_variantId_idx" ON commerce."CatalogVariantBarcode" USING btree ("tenantId", "workspaceId", "variantId");

CREATE INDEX "CatalogVariant_tenantId_workspaceId_archivedAt_idx" ON commerce."CatalogVariant" USING btree ("tenantId", "workspaceId", "archivedAt");

CREATE INDEX "CatalogVariant_tenantId_workspaceId_itemId_idx" ON commerce."CatalogVariant" USING btree ("tenantId", "workspaceId", "itemId");

CREATE UNIQUE INDEX "CatalogVariant_tenantId_workspaceId_sku_key" ON commerce."CatalogVariant" USING btree ("tenantId", "workspaceId", sku);

CREATE UNIQUE INDEX "ImportSettings_tenantId_key" ON commerce."ImportSettings" USING btree ("tenantId");

CREATE INDEX "ImportShipmentDocument_documentType_idx" ON commerce."ImportShipmentDocument" USING btree ("documentType");

CREATE INDEX "ImportShipmentDocument_shipmentId_idx" ON commerce."ImportShipmentDocument" USING btree ("shipmentId");

CREATE INDEX "ImportShipmentLine_productId_idx" ON commerce."ImportShipmentLine" USING btree ("productId");

CREATE INDEX "ImportShipmentLine_shipmentId_idx" ON commerce."ImportShipmentLine" USING btree ("shipmentId");

CREATE INDEX "ImportShipment_tenantId_actualArrivalDate_idx" ON commerce."ImportShipment" USING btree ("tenantId", "actualArrivalDate");

CREATE INDEX "ImportShipment_tenantId_createdAt_idx" ON commerce."ImportShipment" USING btree ("tenantId", "createdAt");

CREATE INDEX "ImportShipment_tenantId_estimatedArrivalDate_idx" ON commerce."ImportShipment" USING btree ("tenantId", "estimatedArrivalDate");

CREATE UNIQUE INDEX "ImportShipment_tenantId_shipmentNumber_key" ON commerce."ImportShipment" USING btree ("tenantId", "shipmentNumber");

CREATE INDEX "ImportShipment_tenantId_status_idx" ON commerce."ImportShipment" USING btree ("tenantId", status);

CREATE INDEX "ImportShipment_tenantId_supplierPartyId_idx" ON commerce."ImportShipment" USING btree ("tenantId", "supplierPartyId");

CREATE INDEX "InventoryDocumentLine_documentId_idx" ON commerce."InventoryDocumentLine" USING btree ("documentId");

CREATE INDEX "InventoryDocumentLine_lotId_idx" ON commerce."InventoryDocumentLine" USING btree ("lotId");

CREATE INDEX "InventoryDocumentLine_productId_idx" ON commerce."InventoryDocumentLine" USING btree ("productId");

CREATE INDEX "InventoryDocument_tenantId_createdAt_idx" ON commerce."InventoryDocument" USING btree ("tenantId", "createdAt");

CREATE UNIQUE INDEX "InventoryDocument_tenantId_documentNumber_key" ON commerce."InventoryDocument" USING btree ("tenantId", "documentNumber");

CREATE INDEX "InventoryDocument_tenantId_documentType_idx" ON commerce."InventoryDocument" USING btree ("tenantId", "documentType");

CREATE INDEX "InventoryDocument_tenantId_partyId_idx" ON commerce."InventoryDocument" USING btree ("tenantId", "partyId");

CREATE INDEX "InventoryDocument_tenantId_status_idx" ON commerce."InventoryDocument" USING btree ("tenantId", status);

CREATE INDEX "InventoryLocation_tenantId_warehouseId_idx" ON commerce."InventoryLocation" USING btree ("tenantId", "warehouseId");

CREATE INDEX "InventoryLot_tenantId_expiryDate_idx" ON commerce."InventoryLot" USING btree ("tenantId", "expiryDate");

CREATE INDEX "InventoryLot_tenantId_productId_expiryDate_idx" ON commerce."InventoryLot" USING btree ("tenantId", "productId", "expiryDate");

CREATE UNIQUE INDEX "InventoryLot_tenantId_productId_lotNumber_key" ON commerce."InventoryLot" USING btree ("tenantId", "productId", "lotNumber");

CREATE INDEX "InventoryLot_tenantId_shipmentId_idx" ON commerce."InventoryLot" USING btree ("tenantId", "shipmentId");

CREATE INDEX "InventoryLot_tenantId_status_idx" ON commerce."InventoryLot" USING btree ("tenantId", status);

CREATE INDEX "InventoryProduct_tenantId_isActive_idx" ON commerce."InventoryProduct" USING btree ("tenantId", "isActive");

CREATE INDEX "InventoryProduct_tenantId_productType_idx" ON commerce."InventoryProduct" USING btree ("tenantId", "productType");

CREATE UNIQUE INDEX "InventoryProduct_tenantId_sku_key" ON commerce."InventoryProduct" USING btree ("tenantId", sku);

CREATE UNIQUE INDEX "InventorySettings_tenantId_key" ON commerce."InventorySettings" USING btree ("tenantId");

CREATE INDEX "InventoryWarehouse_tenantId_isDefault_idx" ON commerce."InventoryWarehouse" USING btree ("tenantId", "isDefault");

CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON commerce."PurchaseOrderLine" USING btree ("purchaseOrderId");

CREATE INDEX "PurchaseOrder_tenantId_createdAt_idx" ON commerce."PurchaseOrder" USING btree ("tenantId", "createdAt");

CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON commerce."PurchaseOrder" USING btree ("tenantId", "poNumber");

CREATE INDEX "PurchaseOrder_tenantId_status_idx" ON commerce."PurchaseOrder" USING btree ("tenantId", status);

CREATE INDEX "PurchaseOrder_tenantId_supplierPartyId_idx" ON commerce."PurchaseOrder" USING btree ("tenantId", "supplierPartyId");

CREATE UNIQUE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_categoryK_key" ON commerce."PurchasingAccountMapping" USING btree ("tenantId", "supplierPartyId", "categoryKey");

CREATE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_idx" ON commerce."PurchasingAccountMapping" USING btree ("tenantId", "supplierPartyId");

CREATE UNIQUE INDEX "PurchasingSettings_tenantId_key" ON commerce."PurchasingSettings" USING btree ("tenantId");

CREATE UNIQUE INDEX "ReorderPolicy_tenantId_productId_warehouseId_key" ON commerce."ReorderPolicy" USING btree ("tenantId", "productId", "warehouseId");

CREATE INDEX "ReorderPolicy_tenantId_warehouseId_idx" ON commerce."ReorderPolicy" USING btree ("tenantId", "warehouseId");

CREATE INDEX "SalesOrderLine_orderId_idx" ON commerce."SalesOrderLine" USING btree ("orderId");

CREATE INDEX "SalesOrder_tenantId_createdAt_idx" ON commerce."SalesOrder" USING btree ("tenantId", "createdAt");

CREATE INDEX "SalesOrder_tenantId_customerPartyId_idx" ON commerce."SalesOrder" USING btree ("tenantId", "customerPartyId");

CREATE UNIQUE INDEX "SalesOrder_tenantId_number_key" ON commerce."SalesOrder" USING btree ("tenantId", number);

CREATE INDEX "SalesOrder_tenantId_status_idx" ON commerce."SalesOrder" USING btree ("tenantId", status);

CREATE INDEX "SalesQuoteLine_quoteId_idx" ON commerce."SalesQuoteLine" USING btree ("quoteId");

CREATE INDEX "SalesQuote_tenantId_createdAt_idx" ON commerce."SalesQuote" USING btree ("tenantId", "createdAt");

CREATE INDEX "SalesQuote_tenantId_customerPartyId_idx" ON commerce."SalesQuote" USING btree ("tenantId", "customerPartyId");

CREATE UNIQUE INDEX "SalesQuote_tenantId_number_key" ON commerce."SalesQuote" USING btree ("tenantId", number);

CREATE INDEX "SalesQuote_tenantId_status_idx" ON commerce."SalesQuote" USING btree ("tenantId", status);

CREATE UNIQUE INDEX "SalesSettings_tenantId_key" ON commerce."SalesSettings" USING btree ("tenantId");

CREATE INDEX "StockMove_tenantId_locationId_idx" ON commerce."StockMove" USING btree ("tenantId", "locationId");

CREATE INDEX "StockMove_tenantId_lotId_idx" ON commerce."StockMove" USING btree ("tenantId", "lotId");

CREATE INDEX "StockMove_tenantId_postingDate_idx" ON commerce."StockMove" USING btree ("tenantId", "postingDate");

CREATE INDEX "StockMove_tenantId_productId_idx" ON commerce."StockMove" USING btree ("tenantId", "productId");

CREATE INDEX "StockReservation_tenantId_documentId_idx" ON commerce."StockReservation" USING btree ("tenantId", "documentId");

CREATE INDEX "StockReservation_tenantId_productId_idx" ON commerce."StockReservation" USING btree ("tenantId", "productId");

CREATE INDEX "VendorBillLine_vendorBillId_idx" ON commerce."VendorBillLine" USING btree ("vendorBillId");

CREATE INDEX "VendorBill_tenantId_createdAt_idx" ON commerce."VendorBill" USING btree ("tenantId", "createdAt");

CREATE INDEX "VendorBill_tenantId_status_idx" ON commerce."VendorBill" USING btree ("tenantId", status);

CREATE UNIQUE INDEX "VendorBill_tenantId_supplierPartyId_billNumber_key" ON commerce."VendorBill" USING btree ("tenantId", "supplierPartyId", "billNumber");

CREATE INDEX "VendorBill_tenantId_supplierPartyId_idx" ON commerce."VendorBill" USING btree ("tenantId", "supplierPartyId");

CREATE UNIQUE INDEX "kitchen_stations_tenantId_workspaceId_code_key" ON commerce.kitchen_stations USING btree ("tenantId", "workspaceId", code);

CREATE UNIQUE INDEX "kitchen_stations_tenantId_workspaceId_name_key" ON commerce.kitchen_stations USING btree ("tenantId", "workspaceId", name);

CREATE INDEX "kitchen_ticket_items_tenantId_workspaceId_orderItemId_idx" ON commerce.kitchen_ticket_items USING btree ("tenantId", "workspaceId", "orderItemId");

CREATE INDEX "kitchen_ticket_items_tenantId_workspaceId_ticketId_idx" ON commerce.kitchen_ticket_items USING btree ("tenantId", "workspaceId", "ticketId");

CREATE INDEX "kitchen_tickets_tenantId_workspaceId_orderId_idx" ON commerce.kitchen_tickets USING btree ("tenantId", "workspaceId", "orderId");

CREATE UNIQUE INDEX "kitchen_tickets_tenantId_workspaceId_sendKey_stationId_key" ON commerce.kitchen_tickets USING btree ("tenantId", "workspaceId", "sendKey", "stationId");

CREATE INDEX "kitchen_tickets_tenantId_workspaceId_status_sentAt_idx" ON commerce.kitchen_tickets USING btree ("tenantId", "workspaceId", status, "sentAt");

CREATE UNIQUE INDEX payment_attempt_workspace_idempotency ON commerce.payment_attempts USING btree (workspace_id, idempotency_key);

CREATE UNIQUE INDEX payment_attempt_workspace_provider_ref ON commerce.payment_attempts USING btree (workspace_id, provider_kind, provider_ref);

CREATE INDEX payment_attempts_workspace_id_sale_id_idx ON commerce.payment_attempts USING btree (workspace_id, sale_id);

CREATE INDEX payment_attempts_workspace_id_status_updated_at_idx ON commerce.payment_attempts USING btree (workspace_id, status, updated_at);

CREATE INDEX pos_sale_idempotency_pos_sale_id_idx ON commerce.pos_sale_idempotency USING btree (pos_sale_id);

CREATE INDEX pos_sale_idempotency_workspace_id_idx ON commerce.pos_sale_idempotency USING btree (workspace_id);

CREATE INDEX pos_sale_records_workspace_id_receipt_number_idx ON commerce.pos_sale_records USING btree (workspace_id, receipt_number);

CREATE INDEX pos_sale_records_workspace_id_register_id_sale_date_idx ON commerce.pos_sale_records USING btree (workspace_id, register_id, sale_date);

CREATE INDEX pos_sale_records_workspace_id_sale_date_status_idx ON commerce.pos_sale_records USING btree (workspace_id, sale_date, status);

CREATE UNIQUE INDEX pos_sale_records_workspace_idempotency ON commerce.pos_sale_records USING btree (workspace_id, idempotency_key);

CREATE UNIQUE INDEX registers_workspace_id_name_key ON commerce.registers USING btree (workspace_id, name);

CREATE INDEX registers_workspace_id_status_idx ON commerce.registers USING btree (workspace_id, status);

CREATE INDEX "restaurant_approval_requests_tenantId_workspaceId_orderId_s_idx" ON commerce.restaurant_approval_requests USING btree ("tenantId", "workspaceId", "orderId", status);

CREATE INDEX "restaurant_approval_requests_tenantId_workspaceId_workflowI_idx" ON commerce.restaurant_approval_requests USING btree ("tenantId", "workspaceId", "workflowInstanceId");

CREATE UNIQUE INDEX "restaurant_dining_rooms_tenantId_workspaceId_name_key" ON commerce.restaurant_dining_rooms USING btree ("tenantId", "workspaceId", name);

CREATE INDEX "restaurant_dining_rooms_tenantId_workspaceId_sortOrder_idx" ON commerce.restaurant_dining_rooms USING btree ("tenantId", "workspaceId", "sortOrder");

CREATE INDEX "restaurant_menu_item_modifier_groups_tenantId_workspaceId_c_idx" ON commerce.restaurant_menu_item_modifier_groups USING btree ("tenantId", "workspaceId", "catalogItemId", "sortOrder");

CREATE UNIQUE INDEX "restaurant_menu_item_modifier_groups_tenantId_workspaceId_c_key" ON commerce.restaurant_menu_item_modifier_groups USING btree ("tenantId", "workspaceId", "catalogItemId", "modifierGroupId");

CREATE UNIQUE INDEX "restaurant_modifier_groups_tenantId_workspaceId_name_key" ON commerce.restaurant_modifier_groups USING btree ("tenantId", "workspaceId", name);

CREATE INDEX "restaurant_modifier_groups_tenantId_workspaceId_sortOrder_idx" ON commerce.restaurant_modifier_groups USING btree ("tenantId", "workspaceId", "sortOrder");

CREATE INDEX "restaurant_modifier_options_tenantId_workspaceId_modifierGr_idx" ON commerce.restaurant_modifier_options USING btree ("tenantId", "workspaceId", "modifierGroupId", "sortOrder");

CREATE UNIQUE INDEX "restaurant_modifier_options_tenantId_workspaceId_modifierGr_key" ON commerce.restaurant_modifier_options USING btree ("tenantId", "workspaceId", "modifierGroupId", name);

CREATE INDEX "restaurant_order_item_modifiers_tenantId_workspaceId_orderI_idx" ON commerce.restaurant_order_item_modifiers USING btree ("tenantId", "workspaceId", "orderItemId");

CREATE INDEX "restaurant_order_items_tenantId_workspaceId_catalogItemId_idx" ON commerce.restaurant_order_items USING btree ("tenantId", "workspaceId", "catalogItemId");

CREATE INDEX "restaurant_order_items_tenantId_workspaceId_orderId_idx" ON commerce.restaurant_order_items USING btree ("tenantId", "workspaceId", "orderId");

CREATE INDEX "restaurant_order_payments_tenantId_workspaceId_orderId_idx" ON commerce.restaurant_order_payments USING btree ("tenantId", "workspaceId", "orderId");

CREATE INDEX "restaurant_orders_tenantId_workspaceId_tableId_status_idx" ON commerce.restaurant_orders USING btree ("tenantId", "workspaceId", "tableId", status);

CREATE INDEX "restaurant_orders_tenantId_workspaceId_tableSessionId_idx" ON commerce.restaurant_orders USING btree ("tenantId", "workspaceId", "tableSessionId");

CREATE INDEX "restaurant_table_sessions_tenantId_workspaceId_status_opene_idx" ON commerce.restaurant_table_sessions USING btree ("tenantId", "workspaceId", status, "openedAt");

CREATE INDEX "restaurant_table_sessions_tenantId_workspaceId_tableId_stat_idx" ON commerce.restaurant_table_sessions USING btree ("tenantId", "workspaceId", "tableId", status);

CREATE INDEX "restaurant_tables_tenantId_workspaceId_availabilityStatus_idx" ON commerce.restaurant_tables USING btree ("tenantId", "workspaceId", "availabilityStatus");

CREATE INDEX "restaurant_tables_tenantId_workspaceId_diningRoomId_idx" ON commerce.restaurant_tables USING btree ("tenantId", "workspaceId", "diningRoomId");

CREATE UNIQUE INDEX "restaurant_tables_tenantId_workspaceId_diningRoomId_name_key" ON commerce.restaurant_tables USING btree ("tenantId", "workspaceId", "diningRoomId", name);

CREATE INDEX shift_sessions_workspace_id_register_id_status_idx ON commerce.shift_sessions USING btree (workspace_id, register_id, status);

CREATE INDEX shift_sessions_workspace_id_status_closed_at_idx ON commerce.shift_sessions USING btree (workspace_id, status, closed_at);

CREATE INDEX "CmsComment_postId_status_idx" ON content."CmsComment" USING btree ("postId", status);

CREATE INDEX "CmsComment_tenantId_idx" ON content."CmsComment" USING btree ("tenantId");

CREATE INDEX "CmsComment_tenantId_postId_idx" ON content."CmsComment" USING btree ("tenantId", "postId");

CREATE INDEX "CmsComment_tenantId_status_idx" ON content."CmsComment" USING btree ("tenantId", status);

CREATE INDEX "CmsComment_tenantId_workspaceId_idx" ON content."CmsComment" USING btree ("tenantId", "workspaceId");

CREATE INDEX "CmsPost_tenantId_idx" ON content."CmsPost" USING btree ("tenantId");

CREATE UNIQUE INDEX "CmsPost_tenantId_slug_key" ON content."CmsPost" USING btree ("tenantId", slug);

CREATE INDEX "CmsPost_tenantId_status_publishedAt_idx" ON content."CmsPost" USING btree ("tenantId", status, "publishedAt");

CREATE INDEX "CmsPost_tenantId_workspaceId_idx" ON content."CmsPost" USING btree ("tenantId", "workspaceId");

CREATE UNIQUE INDEX "CmsReader_tenantId_email_key" ON content."CmsReader" USING btree ("tenantId", email);

CREATE INDEX "CmsReader_tenantId_idx" ON content."CmsReader" USING btree ("tenantId");

CREATE INDEX "CmsReader_tenantId_workspaceId_idx" ON content."CmsReader" USING btree ("tenantId", "workspaceId");

CREATE INDEX "DirectoryLead_tenantId_workspaceId_createdAt_idx" ON content."DirectoryLead" USING btree ("tenantId", "workspaceId", "createdAt");

CREATE INDEX "DirectoryLead_tenantId_workspaceId_restaurantId_status_idx" ON content."DirectoryLead" USING btree ("tenantId", "workspaceId", "restaurantId", status);

CREATE INDEX "DirectoryRestaurant_tenantId_workspaceId_createdAt_idx" ON content."DirectoryRestaurant" USING btree ("tenantId", "workspaceId", "createdAt");

CREATE INDEX "DirectoryRestaurant_tenantId_workspaceId_name_idx" ON content."DirectoryRestaurant" USING btree ("tenantId", "workspaceId", name);

CREATE UNIQUE INDEX "DirectoryRestaurant_tenantId_workspaceId_slug_key" ON content."DirectoryRestaurant" USING btree ("tenantId", "workspaceId", slug);

CREATE INDEX "DirectoryRestaurant_tenantId_workspaceId_status_neighborhoo_idx" ON content."DirectoryRestaurant" USING btree ("tenantId", "workspaceId", status, "neighborhoodSlug");

CREATE INDEX "PortfolioClient_showcaseId_featured_idx" ON content."PortfolioClient" USING btree ("showcaseId", featured);

CREATE UNIQUE INDEX "PortfolioClient_showcaseId_slug_key" ON content."PortfolioClient" USING btree ("showcaseId", slug);

CREATE INDEX "PortfolioClient_tenantId_workspaceId_idx" ON content."PortfolioClient" USING btree ("tenantId", "workspaceId");

CREATE UNIQUE INDEX "PortfolioProfile_showcaseId_key" ON content."PortfolioProfile" USING btree ("showcaseId");

CREATE INDEX "PortfolioProfile_tenantId_workspaceId_idx" ON content."PortfolioProfile" USING btree ("tenantId", "workspaceId");

CREATE INDEX "PortfolioProjectClient_tenantId_workspaceId_idx" ON content."PortfolioProjectClient" USING btree ("tenantId", "workspaceId");

CREATE UNIQUE INDEX "PortfolioProject_showcaseId_slug_key" ON content."PortfolioProject" USING btree ("showcaseId", slug);

CREATE INDEX "PortfolioProject_showcaseId_status_idx" ON content."PortfolioProject" USING btree ("showcaseId", status);

CREATE INDEX "PortfolioProject_tenantId_workspaceId_idx" ON content."PortfolioProject" USING btree ("tenantId", "workspaceId");

CREATE UNIQUE INDEX "PortfolioService_showcaseId_slug_key" ON content."PortfolioService" USING btree ("showcaseId", slug);

CREATE INDEX "PortfolioService_showcaseId_status_idx" ON content."PortfolioService" USING btree ("showcaseId", status);

CREATE INDEX "PortfolioService_tenantId_workspaceId_idx" ON content."PortfolioService" USING btree ("tenantId", "workspaceId");

CREATE INDEX "PortfolioShowcase_tenantId_workspaceId_idx" ON content."PortfolioShowcase" USING btree ("tenantId", "workspaceId");

CREATE INDEX "PortfolioShowcase_tenantId_workspaceId_isPublished_idx" ON content."PortfolioShowcase" USING btree ("tenantId", "workspaceId", "isPublished");

CREATE UNIQUE INDEX "PortfolioShowcase_tenantId_workspaceId_slug_key" ON content."PortfolioShowcase" USING btree ("tenantId", "workspaceId", slug);

CREATE INDEX "PortfolioTeamMember_showcaseId_status_idx" ON content."PortfolioTeamMember" USING btree ("showcaseId", status);

CREATE INDEX "PortfolioTeamMember_tenantId_workspaceId_idx" ON content."PortfolioTeamMember" USING btree ("tenantId", "workspaceId");

CREATE INDEX "RentalAvailabilityRange_propertyId_startDate_endDate_idx" ON content."RentalAvailabilityRange" USING btree ("propertyId", "startDate", "endDate");

CREATE INDEX "RentalAvailabilityRange_tenantId_workspaceId_idx" ON content."RentalAvailabilityRange" USING btree ("tenantId", "workspaceId");

CREATE INDEX "RentalCategory_tenantId_workspaceId_idx" ON content."RentalCategory" USING btree ("tenantId", "workspaceId");

CREATE UNIQUE INDEX "RentalCategory_tenantId_workspaceId_name_key" ON content."RentalCategory" USING btree ("tenantId", "workspaceId", name);

CREATE UNIQUE INDEX "RentalCategory_tenantId_workspaceId_slug_key" ON content."RentalCategory" USING btree ("tenantId", "workspaceId", slug);

CREATE INDEX "RentalPropertyImage_propertyId_sortOrder_idx" ON content."RentalPropertyImage" USING btree ("propertyId", "sortOrder");

CREATE INDEX "RentalPropertyImage_tenantId_workspaceId_idx" ON content."RentalPropertyImage" USING btree ("tenantId", "workspaceId");

CREATE INDEX "RentalProperty_tenantId_workspaceId_idx" ON content."RentalProperty" USING btree ("tenantId", "workspaceId");

CREATE UNIQUE INDEX "RentalProperty_tenantId_workspaceId_slug_key" ON content."RentalProperty" USING btree ("tenantId", "workspaceId", slug);

CREATE INDEX "RentalProperty_tenantId_workspaceId_status_publishedAt_idx" ON content."RentalProperty" USING btree ("tenantId", "workspaceId", status, "publishedAt");

CREATE UNIQUE INDEX "WebsiteDomain_tenantId_hostname_key" ON content."WebsiteDomain" USING btree ("tenantId", hostname);

CREATE INDEX "WebsiteDomain_tenantId_idx" ON content."WebsiteDomain" USING btree ("tenantId");

CREATE INDEX "WebsiteDomain_tenantId_siteId_idx" ON content."WebsiteDomain" USING btree ("tenantId", "siteId");

CREATE INDEX "WebsiteFeedbackImage_tenantId_feedbackId_idx" ON content."WebsiteFeedbackImage" USING btree ("tenantId", "feedbackId");

CREATE INDEX "WebsiteFeedbackImage_tenantId_fileId_idx" ON content."WebsiteFeedbackImage" USING btree ("tenantId", "fileId");

CREATE INDEX "WebsiteFeedback_tenantId_pageId_createdAt_idx" ON content."WebsiteFeedback" USING btree ("tenantId", "pageId", "createdAt");

CREATE INDEX "WebsiteFeedback_tenantId_siteId_createdAt_idx" ON content."WebsiteFeedback" USING btree ("tenantId", "siteId", "createdAt");

CREATE INDEX "WebsiteMenu_tenantId_idx" ON content."WebsiteMenu" USING btree ("tenantId");

CREATE INDEX "WebsiteMenu_tenantId_siteId_idx" ON content."WebsiteMenu" USING btree ("tenantId", "siteId");

CREATE UNIQUE INDEX "WebsiteMenu_tenantId_siteId_name_locale_key" ON content."WebsiteMenu" USING btree ("tenantId", "siteId", name, locale);

CREATE INDEX "WebsitePageSnapshot_pageId_version_idx" ON content."WebsitePageSnapshot" USING btree ("pageId", version);

CREATE INDEX "WebsitePageSnapshot_tenantId_idx" ON content."WebsitePageSnapshot" USING btree ("tenantId");

CREATE UNIQUE INDEX "WebsitePageSnapshot_tenantId_pageId_version_key" ON content."WebsitePageSnapshot" USING btree ("tenantId", "pageId", version);

CREATE INDEX "WebsitePageSnapshot_tenantId_siteId_idx" ON content."WebsitePageSnapshot" USING btree ("tenantId", "siteId");

CREATE INDEX "WebsitePage_tenantId_idx" ON content."WebsitePage" USING btree ("tenantId");

CREATE INDEX "WebsitePage_tenantId_siteId_idx" ON content."WebsitePage" USING btree ("tenantId", "siteId");

CREATE UNIQUE INDEX "WebsitePage_tenantId_siteId_path_locale_key" ON content."WebsitePage" USING btree ("tenantId", "siteId", path, locale);

CREATE INDEX "WebsitePage_tenantId_siteId_status_idx" ON content."WebsitePage" USING btree ("tenantId", "siteId", status);

CREATE INDEX "WebsiteQa_tenantId_siteId_locale_status_order_idx" ON content."WebsiteQa" USING btree ("tenantId", "siteId", locale, status, "order");

CREATE INDEX "WebsiteQa_tenantId_siteId_pageId_locale_status_order_idx" ON content."WebsiteQa" USING btree ("tenantId", "siteId", "pageId", locale, status, "order");

CREATE INDEX "WebsiteSite_tenantId_idx" ON content."WebsiteSite" USING btree ("tenantId");

CREATE INDEX "WebsiteSite_tenantId_isDefault_idx" ON content."WebsiteSite" USING btree ("tenantId", "isDefault");

CREATE UNIQUE INDEX "WebsiteSite_tenantId_slug_key" ON content."WebsiteSite" USING btree ("tenantId", slug);

CREATE INDEX "WebsiteWallOfLoveItemImage_tenantId_fileId_idx" ON content."WebsiteWallOfLoveItemImage" USING btree ("tenantId", "fileId");

CREATE INDEX "WebsiteWallOfLoveItemImage_tenantId_itemId_order_idx" ON content."WebsiteWallOfLoveItemImage" USING btree ("tenantId", "itemId", "order");

CREATE INDEX "WebsiteWallOfLoveItem_tenantId_siteId_order_idx" ON content."WebsiteWallOfLoveItem" USING btree ("tenantId", "siteId", "order");

CREATE INDEX "WebsiteWallOfLoveItem_tenantId_siteId_status_order_idx" ON content."WebsiteWallOfLoveItem" USING btree ("tenantId", "siteId", status, "order");

CREATE INDEX "Activity_tenantId_activityDate_idx" ON crm."Activity" USING btree ("tenantId", "activityDate");

CREATE INDEX "Activity_tenantId_assignedToUserId_status_idx" ON crm."Activity" USING btree ("tenantId", "assignedToUserId", status);

CREATE INDEX "Activity_tenantId_channelKey_direction_communicationStatus_idx" ON crm."Activity" USING btree ("tenantId", "channelKey", direction, "communicationStatus");

CREATE INDEX "Activity_tenantId_createdAt_idx" ON crm."Activity" USING btree ("tenantId", "createdAt");

CREATE INDEX "Activity_tenantId_dealId_createdAt_idx" ON crm."Activity" USING btree ("tenantId", "dealId", "createdAt");

CREATE INDEX "Activity_tenantId_externalMessageId_idx" ON crm."Activity" USING btree ("tenantId", "externalMessageId");

CREATE INDEX "Activity_tenantId_leadId_createdAt_idx" ON crm."Activity" USING btree ("tenantId", "leadId", "createdAt");

CREATE INDEX "Activity_tenantId_partyId_createdAt_idx" ON crm."Activity" USING btree ("tenantId", "partyId", "createdAt");

CREATE UNIQUE INDEX "Address_tenantId_partyId_type_key" ON crm."Address" USING btree ("tenantId", "partyId", type);

CREATE INDEX "Address_tenantId_type_idx" ON crm."Address" USING btree ("tenantId", type);

CREATE INDEX "CheckInEvent_tenantId_customerPartyId_checkedInAt_idx" ON crm."CheckInEvent" USING btree ("tenantId", "customerPartyId", "checkedInAt");

CREATE INDEX "CheckInEvent_tenantId_registerId_checkedInAt_idx" ON crm."CheckInEvent" USING btree ("tenantId", "registerId", "checkedInAt");

CREATE INDEX "CheckInEvent_tenantId_status_idx" ON crm."CheckInEvent" USING btree ("tenantId", status);

CREATE INDEX "ClassAttendance_tenantId_enrollmentId_idx" ON crm."ClassAttendance" USING btree ("tenantId", "enrollmentId");

CREATE UNIQUE INDEX "ClassAttendance_tenantId_sessionId_enrollmentId_key" ON crm."ClassAttendance" USING btree ("tenantId", "sessionId", "enrollmentId");

CREATE INDEX "ClassAttendance_tenantId_sessionId_idx" ON crm."ClassAttendance" USING btree ("tenantId", "sessionId");

CREATE INDEX "ClassBillingInvoiceLink_tenantId_billingRunId_idx" ON crm."ClassBillingInvoiceLink" USING btree ("tenantId", "billingRunId");

CREATE UNIQUE INDEX "ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_key" ON crm."ClassBillingInvoiceLink" USING btree ("tenantId", "billingRunId", "payerClientId", "classGroupId");

CREATE INDEX "ClassBillingInvoiceLink_tenantId_classGroupId_idx" ON crm."ClassBillingInvoiceLink" USING btree ("tenantId", "classGroupId");

CREATE INDEX "ClassBillingInvoiceLink_tenantId_enrollmentId_idx" ON crm."ClassBillingInvoiceLink" USING btree ("tenantId", "enrollmentId");

CREATE UNIQUE INDEX "ClassBillingInvoiceLink_tenantId_idempotencyKey_key" ON crm."ClassBillingInvoiceLink" USING btree ("tenantId", "idempotencyKey");

CREATE INDEX "ClassBillingInvoiceLink_tenantId_payerClientId_idx" ON crm."ClassBillingInvoiceLink" USING btree ("tenantId", "payerClientId");

CREATE UNIQUE INDEX "ClassEnrollmentBillingPlan_enrollmentId_key" ON crm."ClassEnrollmentBillingPlan" USING btree ("enrollmentId");

CREATE INDEX "ClassEnrollmentBillingPlan_tenantId_type_idx" ON crm."ClassEnrollmentBillingPlan" USING btree ("tenantId", type);

CREATE INDEX "ClassEnrollmentBillingPlan_tenantId_workspaceId_idx" ON crm."ClassEnrollmentBillingPlan" USING btree ("tenantId", "workspaceId");

CREATE INDEX "ClassEnrollment_tenantId_classGroupId_idx" ON crm."ClassEnrollment" USING btree ("tenantId", "classGroupId");

CREATE UNIQUE INDEX "ClassEnrollment_tenantId_classGroupId_studentClientId_key" ON crm."ClassEnrollment" USING btree ("tenantId", "classGroupId", "studentClientId");

CREATE INDEX "ClassEnrollment_tenantId_isActive_idx" ON crm."ClassEnrollment" USING btree ("tenantId", "isActive");

CREATE INDEX "ClassEnrollment_tenantId_payerClientId_idx" ON crm."ClassEnrollment" USING btree ("tenantId", "payerClientId");

CREATE INDEX "ClassEnrollment_tenantId_payerPartyId_idx" ON crm."ClassEnrollment" USING btree ("tenantId", "payerPartyId");

CREATE INDEX "ClassEnrollment_tenantId_status_idx" ON crm."ClassEnrollment" USING btree ("tenantId", status);

CREATE INDEX "ClassGroupInstructor_tenantId_classGroupId_idx" ON crm."ClassGroupInstructor" USING btree ("tenantId", "classGroupId");

CREATE UNIQUE INDEX "ClassGroupInstructor_tenantId_classGroupId_partyId_role_key" ON crm."ClassGroupInstructor" USING btree ("tenantId", "classGroupId", "partyId", role);

CREATE INDEX "ClassGroupInstructor_tenantId_partyId_idx" ON crm."ClassGroupInstructor" USING btree ("tenantId", "partyId");

CREATE INDEX "ClassGroupResource_tenantId_classGroupId_sortOrder_idx" ON crm."ClassGroupResource" USING btree ("tenantId", "classGroupId", "sortOrder");

CREATE INDEX "ClassGroupResource_tenantId_documentId_idx" ON crm."ClassGroupResource" USING btree ("tenantId", "documentId");

CREATE INDEX "ClassGroup_tenantId_kind_idx" ON crm."ClassGroup" USING btree ("tenantId", kind);

CREATE INDEX "ClassGroup_tenantId_lifecycle_idx" ON crm."ClassGroup" USING btree ("tenantId", lifecycle);

CREATE INDEX "ClassGroup_tenantId_programId_idx" ON crm."ClassGroup" USING btree ("tenantId", "programId");

CREATE INDEX "ClassGroup_tenantId_startAt_idx" ON crm."ClassGroup" USING btree ("tenantId", "startAt");

CREATE INDEX "ClassGroup_tenantId_status_idx" ON crm."ClassGroup" USING btree ("tenantId", status);

CREATE INDEX "ClassGroup_tenantId_workspaceId_idx" ON crm."ClassGroup" USING btree ("tenantId", "workspaceId");

CREATE INDEX "ClassMilestoneCompletion_tenantId_enrollmentId_idx" ON crm."ClassMilestoneCompletion" USING btree ("tenantId", "enrollmentId");

CREATE UNIQUE INDEX "ClassMilestoneCompletion_tenantId_milestoneId_enrollmentId_key" ON crm."ClassMilestoneCompletion" USING btree ("tenantId", "milestoneId", "enrollmentId");

CREATE INDEX "ClassMilestone_tenantId_classGroupId_idx" ON crm."ClassMilestone" USING btree ("tenantId", "classGroupId");

CREATE INDEX "ClassMilestone_tenantId_dueAt_idx" ON crm."ClassMilestone" USING btree ("tenantId", "dueAt");

CREATE UNIQUE INDEX "ClassMonthlyBillingRun_tenantId_month_key" ON crm."ClassMonthlyBillingRun" USING btree ("tenantId", month);

CREATE INDEX "ClassMonthlyBillingRun_tenantId_status_idx" ON crm."ClassMonthlyBillingRun" USING btree ("tenantId", status);

CREATE INDEX "ClassProgramMilestoneTemplate_tenantId_programId_idx" ON crm."ClassProgramMilestoneTemplate" USING btree ("tenantId", "programId");

CREATE UNIQUE INDEX "ClassProgramMilestoneTemplate_tenantId_programId_index_key" ON crm."ClassProgramMilestoneTemplate" USING btree ("tenantId", "programId", index);

CREATE INDEX "ClassProgramSessionTemplate_tenantId_programId_idx" ON crm."ClassProgramSessionTemplate" USING btree ("tenantId", "programId");

CREATE UNIQUE INDEX "ClassProgramSessionTemplate_tenantId_programId_index_key" ON crm."ClassProgramSessionTemplate" USING btree ("tenantId", "programId", index);

CREATE INDEX "ClassProgram_tenantId_levelTag_idx" ON crm."ClassProgram" USING btree ("tenantId", "levelTag");

CREATE INDEX "ClassProgram_tenantId_workspaceId_idx" ON crm."ClassProgram" USING btree ("tenantId", "workspaceId");

CREATE INDEX "ClassSession_tenantId_classGroupId_idx" ON crm."ClassSession" USING btree ("tenantId", "classGroupId");

CREATE UNIQUE INDEX "ClassSession_tenantId_classGroupId_startsAt_key" ON crm."ClassSession" USING btree ("tenantId", "classGroupId", "startsAt");

CREATE INDEX "ClassSession_tenantId_workspaceId_startsAt_idx" ON crm."ClassSession" USING btree ("tenantId", "workspaceId", "startsAt");

CREATE UNIQUE INDEX "Client_tenantId_email_key" ON crm."Client" USING btree ("tenantId", email);

CREATE INDEX "Client_tenantId_idx" ON crm."Client" USING btree ("tenantId");

CREATE INDEX "CoachingArtifactBundle_tenantId_engagementId_requestedAt_idx" ON crm."CoachingArtifactBundle" USING btree ("tenantId", "engagementId", "requestedAt");

CREATE INDEX "CoachingBookingHold_tenantId_coachUserId_status_expiresAt_idx" ON crm."CoachingBookingHold" USING btree ("tenantId", "coachUserId", status, "expiresAt");

CREATE INDEX "CoachingBookingHold_tenantId_offerId_startAt_idx" ON crm."CoachingBookingHold" USING btree ("tenantId", "offerId", "startAt");

CREATE INDEX "CoachingContractRequest_tenantId_engagementId_requestedAt_idx" ON crm."CoachingContractRequest" USING btree ("tenantId", "engagementId", "requestedAt");

CREATE INDEX "CoachingContractRequest_tenantId_recipientEmail_requestedAt_idx" ON crm."CoachingContractRequest" USING btree ("tenantId", "recipientEmail", "requestedAt");

CREATE UNIQUE INDEX "CoachingContractRequest_tenantId_requestTokenHash_key" ON crm."CoachingContractRequest" USING btree ("tenantId", "requestTokenHash");

CREATE UNIQUE INDEX "CoachingContractRequest_tenantId_requestToken_key" ON crm."CoachingContractRequest" USING btree ("tenantId", "requestToken");

CREATE INDEX "CoachingEngagementEvent_tenantId_engagementId_occurredAt_idx" ON crm."CoachingEngagementEvent" USING btree ("tenantId", "engagementId", "occurredAt");

CREATE INDEX "CoachingEngagement_tenantId_clientPartyId_idx" ON crm."CoachingEngagement" USING btree ("tenantId", "clientPartyId");

CREATE INDEX "CoachingEngagement_tenantId_coachUserId_idx" ON crm."CoachingEngagement" USING btree ("tenantId", "coachUserId");

CREATE INDEX "CoachingEngagement_tenantId_contractAccessTokenHash_idx" ON crm."CoachingEngagement" USING btree ("tenantId", "contractAccessTokenHash");

CREATE UNIQUE INDEX "CoachingEngagement_tenantId_stripeCheckoutSessionId_key" ON crm."CoachingEngagement" USING btree ("tenantId", "stripeCheckoutSessionId");

CREATE INDEX "CoachingEngagement_tenantId_workspaceId_status_createdAt_idx" ON crm."CoachingEngagement" USING btree ("tenantId", "workspaceId", status, "createdAt");

CREATE INDEX "CoachingOffer_tenantId_workspaceId_archivedAt_createdAt_idx" ON crm."CoachingOffer" USING btree ("tenantId", "workspaceId", "archivedAt", "createdAt");

CREATE INDEX "CoachingPaymentProviderEvent_tenantId_engagementId_processe_idx" ON crm."CoachingPaymentProviderEvent" USING btree ("tenantId", "engagementId", "processedAt");

CREATE UNIQUE INDEX "CoachingPaymentProviderEvent_tenantId_provider_providerEven_key" ON crm."CoachingPaymentProviderEvent" USING btree ("tenantId", provider, "providerEventId");

CREATE INDEX "CoachingPayment_tenantId_engagementId_createdAt_idx" ON crm."CoachingPayment" USING btree ("tenantId", "engagementId", "createdAt");

CREATE UNIQUE INDEX "CoachingPayment_tenantId_provider_providerCheckoutSessionId_key" ON crm."CoachingPayment" USING btree ("tenantId", provider, "providerCheckoutSessionId");

CREATE INDEX "CoachingPayment_tenantId_provider_providerPaymentRef_idx" ON crm."CoachingPayment" USING btree ("tenantId", provider, "providerPaymentRef");

CREATE INDEX "CoachingSession_tenantId_debriefAccessTokenHash_idx" ON crm."CoachingSession" USING btree ("tenantId", "debriefAccessTokenHash");

CREATE INDEX "CoachingSession_tenantId_engagementId_sequenceNo_idx" ON crm."CoachingSession" USING btree ("tenantId", "engagementId", "sequenceNo");

CREATE INDEX "CoachingSession_tenantId_prepAccessTokenHash_idx" ON crm."CoachingSession" USING btree ("tenantId", "prepAccessTokenHash");

CREATE INDEX "CoachingSession_tenantId_workspaceId_startAt_idx" ON crm."CoachingSession" USING btree ("tenantId", "workspaceId", "startAt");

CREATE INDEX "CommunicationWebhookEvent_tenantId_externalMessageId_eventT_idx" ON crm."CommunicationWebhookEvent" USING btree ("tenantId", "externalMessageId", "eventTimestamp");

CREATE INDEX "CommunicationWebhookEvent_tenantId_providerKey_channelKey_idx" ON crm."CommunicationWebhookEvent" USING btree ("tenantId", "providerKey", "channelKey");

CREATE INDEX "ContactPoint_tenantId_partyId_type_isPrimary_idx" ON crm."ContactPoint" USING btree ("tenantId", "partyId", type, "isPrimary");

CREATE UNIQUE INDEX "CrmAccountProfile_partyId_key" ON crm."CrmAccountProfile" USING btree ("partyId");

CREATE INDEX "CrmAccountProfile_tenantId_accountType_idx" ON crm."CrmAccountProfile" USING btree ("tenantId", "accountType");

CREATE INDEX "CrmAccountProfile_tenantId_idx" ON crm."CrmAccountProfile" USING btree ("tenantId");

CREATE INDEX "CrmAccountProfile_tenantId_ownerUserId_idx" ON crm."CrmAccountProfile" USING btree ("tenantId", "ownerUserId");

CREATE UNIQUE INDEX "CrmAccountProfile_tenantId_partyId_key" ON crm."CrmAccountProfile" USING btree ("tenantId", "partyId");

CREATE INDEX "CrmAccountProfile_tenantId_status_idx" ON crm."CrmAccountProfile" USING btree ("tenantId", status);

CREATE INDEX "CrmMailMessage_tenantId_workspaceId_received_at_idx" ON crm."CrmMailMessage" USING btree ("tenantId", "workspaceId", received_at);

CREATE INDEX "CrmMailMessage_tenantId_workspaceId_sent_at_idx" ON crm."CrmMailMessage" USING btree ("tenantId", "workspaceId", sent_at);

CREATE INDEX "CrmMailThread_tenantId_workspaceId_last_message_at_idx" ON crm."CrmMailThread" USING btree ("tenantId", "workspaceId", last_message_at);

CREATE INDEX "CrmMailbox_integrationConnectionId_idx" ON crm."CrmMailbox" USING btree ("integrationConnectionId");

CREATE INDEX "CrmMailbox_tenantId_workspaceId_status_idx" ON crm."CrmMailbox" USING btree ("tenantId", "workspaceId", status);

CREATE INDEX "CustomerPackage_tenantId_customerPartyId_status_idx" ON crm."CustomerPackage" USING btree ("tenantId", "customerPartyId", status);

CREATE INDEX "CustomerPackage_tenantId_expiresOn_idx" ON crm."CustomerPackage" USING btree ("tenantId", "expiresOn");

CREATE INDEX "DealAiSnapshot_tenantId_workspaceId_dealId_kind_generatedAt_idx" ON crm."DealAiSnapshot" USING btree ("tenantId", "workspaceId", "dealId", kind, "generatedAt" DESC);

CREATE INDEX "DealAiSnapshot_tenantId_workspaceId_kind_ttlExpiresAt_idx" ON crm."DealAiSnapshot" USING btree ("tenantId", "workspaceId", kind, "ttlExpiresAt");

CREATE INDEX "DealStageTransition_tenantId_dealId_transitionedAt_idx" ON crm."DealStageTransition" USING btree ("tenantId", "dealId", "transitionedAt");

CREATE INDEX "Deal_tenantId_createdAt_idx" ON crm."Deal" USING btree ("tenantId", "createdAt");

CREATE INDEX "Deal_tenantId_ownerUserId_idx" ON crm."Deal" USING btree ("tenantId", "ownerUserId");

CREATE INDEX "Deal_tenantId_partyId_idx" ON crm."Deal" USING btree ("tenantId", "partyId");

CREATE INDEX "Deal_tenantId_stageId_idx" ON crm."Deal" USING btree ("tenantId", "stageId");

CREATE INDEX "Deal_tenantId_status_idx" ON crm."Deal" USING btree ("tenantId", status);

CREATE UNIQUE INDEX "EngagementSettings_tenantId_key" ON crm."EngagementSettings" USING btree ("tenantId");

CREATE INDEX "IssueActivity_tenantId_issueId_createdAt_idx" ON crm."IssueActivity" USING btree ("tenantId", "issueId", "createdAt");

CREATE INDEX "IssueAttachment_tenantId_commentId_idx" ON crm."IssueAttachment" USING btree ("tenantId", "commentId");

CREATE INDEX "IssueAttachment_tenantId_documentId_idx" ON crm."IssueAttachment" USING btree ("tenantId", "documentId");

CREATE INDEX "IssueAttachment_tenantId_issueId_idx" ON crm."IssueAttachment" USING btree ("tenantId", "issueId");

CREATE INDEX "IssueComment_tenantId_issueId_createdAt_idx" ON crm."IssueComment" USING btree ("tenantId", "issueId", "createdAt");

CREATE INDEX "Issue_tenantId_assigneeUserId_idx" ON crm."Issue" USING btree ("tenantId", "assigneeUserId");

CREATE INDEX "Issue_tenantId_createdAt_idx" ON crm."Issue" USING btree ("tenantId", "createdAt");

CREATE INDEX "Issue_tenantId_siteType_idx" ON crm."Issue" USING btree ("tenantId", "siteType");

CREATE INDEX "Issue_tenantId_status_idx" ON crm."Issue" USING btree ("tenantId", status);

CREATE INDEX "Issue_tenantId_workspaceId_reporterUserId_idx" ON crm."Issue" USING btree ("tenantId", "workspaceId", "reporterUserId");

CREATE INDEX "Lead_tenantId_email_idx" ON crm."Lead" USING btree ("tenantId", email);

CREATE INDEX "Lead_tenantId_lastRepliedAt_idx" ON crm."Lead" USING btree ("tenantId", "lastRepliedAt");

CREATE UNIQUE INDEX "LoyaltyAccount_tenantId_customerPartyId_key" ON crm."LoyaltyAccount" USING btree ("tenantId", "customerPartyId");

CREATE INDEX "LoyaltyAccount_tenantId_status_idx" ON crm."LoyaltyAccount" USING btree ("tenantId", status);

CREATE INDEX "LoyaltyLedgerEntry_tenantId_customerPartyId_createdAt_idx" ON crm."LoyaltyLedgerEntry" USING btree ("tenantId", "customerPartyId", "createdAt");

CREATE INDEX "LoyaltyLedgerEntry_tenantId_entryType_idx" ON crm."LoyaltyLedgerEntry" USING btree ("tenantId", "entryType");

CREATE UNIQUE INDEX "LoyaltyLedgerEntry_tenantId_sourceType_sourceId_reasonCode_key" ON crm."LoyaltyLedgerEntry" USING btree ("tenantId", "sourceType", "sourceId", "reasonCode");

CREATE INDEX "PackageUsage_tenantId_customerPackageId_usedAt_idx" ON crm."PackageUsage" USING btree ("tenantId", "customerPackageId", "usedAt");

CREATE INDEX "PackageUsage_tenantId_customerPartyId_usedAt_idx" ON crm."PackageUsage" USING btree ("tenantId", "customerPartyId", "usedAt");

CREATE UNIQUE INDEX "PackageUsage_tenantId_sourceType_sourceId_key" ON crm."PackageUsage" USING btree ("tenantId", "sourceType", "sourceId");

CREATE INDEX "PartyLifecycleTransition_tenantId_partyId_changedAt_idx" ON crm."PartyLifecycleTransition" USING btree ("tenantId", "partyId", "changedAt");

CREATE INDEX "PartyRelationship_tenantId_fromPartyId_idx" ON crm."PartyRelationship" USING btree ("tenantId", "fromPartyId");

CREATE UNIQUE INDEX "PartyRelationship_tenantId_fromPartyId_toPartyId_type_key" ON crm."PartyRelationship" USING btree ("tenantId", "fromPartyId", "toPartyId", type);

CREATE INDEX "PartyRelationship_tenantId_toPartyId_idx" ON crm."PartyRelationship" USING btree ("tenantId", "toPartyId");

CREATE UNIQUE INDEX "PartyRole_tenantId_partyId_role_key" ON crm."PartyRole" USING btree ("tenantId", "partyId", role);

CREATE INDEX "PartyRole_tenantId_role_idx" ON crm."PartyRole" USING btree ("tenantId", role);

CREATE INDEX "Party_tenantId_archivedAt_idx" ON crm."Party" USING btree ("tenantId", "archivedAt");

CREATE INDEX "Party_tenantId_birthday_idx" ON crm."Party" USING btree ("tenantId", birthday);

CREATE INDEX "Party_tenantId_displayName_idx" ON crm."Party" USING btree ("tenantId", "displayName");

CREATE INDEX "Party_tenantId_idx" ON crm."Party" USING btree ("tenantId");

CREATE UNIQUE INDEX "PipelineConfig_tenantId_key" ON crm."PipelineConfig" USING btree ("tenantId");

CREATE INDEX "SequenceEnrollment_tenantId_dealId_idx" ON crm."SequenceEnrollment" USING btree ("tenantId", "dealId");

CREATE INDEX "SequenceEnrollment_tenantId_leadId_idx" ON crm."SequenceEnrollment" USING btree ("tenantId", "leadId");

CREATE INDEX "SequenceEnrollment_tenantId_nextExecutionAt_idx" ON crm."SequenceEnrollment" USING btree ("tenantId", "nextExecutionAt");

CREATE INDEX "SequenceEnrollment_tenantId_partyId_idx" ON crm."SequenceEnrollment" USING btree ("tenantId", "partyId");

CREATE INDEX "SequenceEnrollment_tenantId_sequenceId_idx" ON crm."SequenceEnrollment" USING btree ("tenantId", "sequenceId");

CREATE INDEX "SequenceStep_tenantId_sequenceId_idx" ON crm."SequenceStep" USING btree ("tenantId", "sequenceId");

CREATE INDEX "Sequence_tenantId_idx" ON crm."Sequence" USING btree ("tenantId");

CREATE INDEX crm_channel_template_tenant_workspace_channel_updated_idx ON crm."ChannelTemplate" USING btree ("tenantId", "workspaceId", "channelKey", "updatedAt");

CREATE UNIQUE INDEX crm_channel_template_workspace_channel_name_key ON crm."ChannelTemplate" USING btree ("tenantId", "workspaceId", "channelKey", name);

CREATE UNIQUE INDEX crm_mail_message_mailbox_external ON crm."CrmMailMessage" USING btree ("mailboxId", external_message_id);

CREATE UNIQUE INDEX crm_mail_thread_mailbox_external ON crm."CrmMailThread" USING btree ("mailboxId", external_thread_id);

CREATE UNIQUE INDEX crm_mailbox_tenant_workspace_address ON crm."CrmMailbox" USING btree ("tenantId", "workspaceId", address);

CREATE UNIQUE INDEX crm_seq_enrollment_lead_deal_unique ON crm."SequenceEnrollment" USING btree ("tenantId", "sequenceId", "leadId", "dealId");

CREATE UNIQUE INDEX crm_webhook_event_dedupe ON crm."CommunicationWebhookEvent" USING btree ("tenantId", "providerKey", "externalMessageId", "eventType", "eventTimestamp");

CREATE INDEX "ExtEntityAttr_tenantId_entityType_entityId_idx" ON ext."ExtEntityAttr" USING btree ("tenantId", "entityType", "entityId");

CREATE UNIQUE INDEX "ExtEntityAttr_tenantId_moduleId_entityType_entityId_attrKey_key" ON ext."ExtEntityAttr" USING btree ("tenantId", "moduleId", "entityType", "entityId", "attrKey");

CREATE INDEX "ExtEntityAttr_tenantId_moduleId_idx" ON ext."ExtEntityAttr" USING btree ("tenantId", "moduleId");

CREATE INDEX "ExtEntityLink_tenantId_fromEntityType_fromEntityId_idx" ON ext."ExtEntityLink" USING btree ("tenantId", "fromEntityType", "fromEntityId");

CREATE UNIQUE INDEX "ExtEntityLink_tenantId_moduleId_fromEntityType_fromEntityId_key" ON ext."ExtEntityLink" USING btree ("tenantId", "moduleId", "fromEntityType", "fromEntityId", "toEntityType", "toEntityId", "linkType");

CREATE INDEX "ExtEntityLink_tenantId_moduleId_linkType_idx" ON ext."ExtEntityLink" USING btree ("tenantId", "moduleId", "linkType");

CREATE INDEX "ExtEntityLink_tenantId_toEntityType_toEntityId_idx" ON ext."ExtEntityLink" USING btree ("tenantId", "toEntityType", "toEntityId");

CREATE INDEX "ExtKv_tenantId_moduleId_idx" ON ext."ExtKv" USING btree ("tenantId", "moduleId");

CREATE UNIQUE INDEX "ExtKv_tenantId_moduleId_scope_key_key" ON ext."ExtKv" USING btree ("tenantId", "moduleId", scope, key);

CREATE INDEX "ApiKey_keyHash_idx" ON identity."ApiKey" USING btree ("keyHash");

CREATE INDEX "ApiKey_tenantId_idx" ON identity."ApiKey" USING btree ("tenantId");

CREATE UNIQUE INDEX "ApiKey_tenantId_name_key" ON identity."ApiKey" USING btree ("tenantId", name);

CREATE INDEX "Membership_roleId_idx" ON identity."Membership" USING btree ("roleId");

CREATE INDEX "Membership_tenantId_createdAt_idx" ON identity."Membership" USING btree ("tenantId", "createdAt");

CREATE INDEX "Membership_tenantId_idx" ON identity."Membership" USING btree ("tenantId");

CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON identity."Membership" USING btree ("tenantId", "userId");

CREATE INDEX "Membership_userId_idx" ON identity."Membership" USING btree ("userId");

CREATE INDEX "PasswordResetToken_tokenHash_idx" ON identity."PasswordResetToken" USING btree ("tokenHash");

CREATE INDEX "PasswordResetToken_userId_createdAt_idx" ON identity."PasswordResetToken" USING btree ("userId", "createdAt");

CREATE INDEX "Permission_key_idx" ON identity."Permission" USING btree (key);

CREATE UNIQUE INDEX "Permission_key_key" ON identity."Permission" USING btree (key);

CREATE INDEX "PortalOtpCode_expiresAt_idx" ON identity."PortalOtpCode" USING btree ("expiresAt");

CREATE INDEX "PortalOtpCode_tenantId_workspaceId_emailNormalized_expiresA_idx" ON identity."PortalOtpCode" USING btree ("tenantId", "workspaceId", "emailNormalized", "expiresAt");

CREATE INDEX "PortalOtpCode_tenantId_workspaceId_emailNormalized_idx" ON identity."PortalOtpCode" USING btree ("tenantId", "workspaceId", "emailNormalized");

CREATE INDEX "PortalSession_expiresAt_idx" ON identity."PortalSession" USING btree ("expiresAt");

CREATE INDEX "PortalSession_refreshTokenHash_idx" ON identity."PortalSession" USING btree ("refreshTokenHash");

CREATE INDEX "PortalSession_tenantId_workspaceId_userId_idx" ON identity."PortalSession" USING btree ("tenantId", "workspaceId", "userId");

CREATE INDEX "PrivacyRequest_tenantId_status_createdAt_idx" ON identity."PrivacyRequest" USING btree ("tenantId", status, "createdAt");

CREATE INDEX "PrivacyRequest_tenantId_subjectUserId_createdAt_idx" ON identity."PrivacyRequest" USING btree ("tenantId", "subjectUserId", "createdAt");

CREATE INDEX "RefreshToken_tenantId_idx" ON identity."RefreshToken" USING btree ("tenantId");

CREATE INDEX "RefreshToken_tokenHash_idx" ON identity."RefreshToken" USING btree ("tokenHash");

CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON identity."RefreshToken" USING btree ("userId", "expiresAt");

CREATE INDEX "RefreshToken_userId_idx" ON identity."RefreshToken" USING btree ("userId");

CREATE INDEX "RolePermissionGrant_permissionKey_idx" ON identity."RolePermissionGrant" USING btree ("permissionKey");

CREATE INDEX "RolePermissionGrant_tenantId_roleId_idx" ON identity."RolePermissionGrant" USING btree ("tenantId", "roleId");

CREATE UNIQUE INDEX "RolePermissionGrant_tenantId_roleId_permissionKey_key" ON identity."RolePermissionGrant" USING btree ("tenantId", "roleId", "permissionKey");

CREATE INDEX "RolePermission_permissionId_idx" ON identity."RolePermission" USING btree ("permissionId");

CREATE INDEX "RolePermission_roleId_idx" ON identity."RolePermission" USING btree ("roleId");

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON identity."RolePermission" USING btree ("roleId", "permissionId");

CREATE INDEX "Role_tenantId_idx" ON identity."Role" USING btree ("tenantId");

CREATE UNIQUE INDEX "Role_tenantId_name_key" ON identity."Role" USING btree ("tenantId", name);

CREATE INDEX "Role_tenantId_systemKey_idx" ON identity."Role" USING btree ("tenantId", "systemKey");

CREATE UNIQUE INDEX "Role_tenantId_systemKey_key" ON identity."Role" USING btree ("tenantId", "systemKey");

CREATE INDEX "SsoAppSession_environment_userId_idx" ON identity."SsoAppSession" USING btree (environment, "userId");

CREATE INDEX "SsoAppSession_expiresAt_idx" ON identity."SsoAppSession" USING btree ("expiresAt");

CREATE INDEX "SsoAppSession_familyId_idx" ON identity."SsoAppSession" USING btree ("familyId");

CREATE UNIQUE INDEX "SsoAppSession_handleHash_key" ON identity."SsoAppSession" USING btree ("handleHash");

CREATE INDEX "SsoAttemptBudget_expiresAt_idx" ON identity."SsoAttemptBudget" USING btree ("expiresAt");

CREATE INDEX "SsoCentralSession_environment_userId_idx" ON identity."SsoCentralSession" USING btree (environment, "userId");

CREATE INDEX "SsoCentralSession_expiresAt_idx" ON identity."SsoCentralSession" USING btree ("expiresAt");

CREATE UNIQUE INDEX "SsoCentralSession_handleHash_key" ON identity."SsoCentralSession" USING btree ("handleHash");

CREATE INDEX "SsoEmailChallenge_expiresAt_idx" ON identity."SsoEmailChallenge" USING btree ("expiresAt");

CREATE UNIQUE INDEX "SsoEmailChallenge_transactionId_key" ON identity."SsoEmailChallenge" USING btree ("transactionId");

CREATE UNIQUE INDEX "SsoLoginTransaction_codeHash_key" ON identity."SsoLoginTransaction" USING btree ("codeHash");

CREATE INDEX "SsoLoginTransaction_expiresAt_idx" ON identity."SsoLoginTransaction" USING btree ("expiresAt");

CREATE INDEX "SsoLoginTransaction_familyId_idx" ON identity."SsoLoginTransaction" USING btree ("familyId");

CREATE INDEX "Tenant_createdAt_idx" ON identity."Tenant" USING btree ("createdAt");

CREATE UNIQUE INDEX "Tenant_slug_key" ON identity."Tenant" USING btree (slug);

CREATE INDEX "User_createdAt_idx" ON identity."User" USING btree ("createdAt");

CREATE INDEX "User_email_idx" ON identity."User" USING btree (email);

CREATE UNIQUE INDEX "User_email_key" ON identity."User" USING btree (email);

CREATE INDEX "User_partyId_idx" ON identity."User" USING btree ("partyId");

CREATE INDEX "AgentRun_tenantId_createdAt_idx" ON platform."AgentRun" USING btree ("tenantId", "createdAt");

CREATE INDEX "AgentRun_tenantId_createdByUserId_createdAt_idx" ON platform."AgentRun" USING btree ("tenantId", "createdByUserId", "createdAt" DESC);

CREATE INDEX "AgentRun_tenantId_createdByUserId_lastMessageAt_idx" ON platform."AgentRun" USING btree ("tenantId", "createdByUserId", "lastMessageAt" DESC);

CREATE INDEX "AppCatalog_tier_idx" ON platform."AppCatalog" USING btree (tier);

CREATE INDEX "AppCatalog_updatedAt_idx" ON platform."AppCatalog" USING btree ("updatedAt");

CREATE INDEX "CustomFieldDefinition_tenantId_entityType_idx" ON platform."CustomFieldDefinition" USING btree ("tenantId", "entityType");

CREATE UNIQUE INDEX "CustomFieldDefinition_tenantId_entityType_key_key" ON platform."CustomFieldDefinition" USING btree ("tenantId", "entityType", key);

CREATE UNIQUE INDEX "CustomFieldIndex_tenantId_entityType_entityId_fieldId_key" ON platform."CustomFieldIndex" USING btree ("tenantId", "entityType", "entityId", "fieldId");

CREATE INDEX "CustomFieldIndex_tenantId_entityType_fieldId_idx" ON platform."CustomFieldIndex" USING btree ("tenantId", "entityType", "fieldId");

CREATE INDEX "CustomFieldIndex_tenantId_entityType_fieldKey_idx" ON platform."CustomFieldIndex" USING btree ("tenantId", "entityType", "fieldKey");

CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueBool_idx" ON platform."CustomFieldIndex" USING btree ("tenantId", "entityType", "valueBool");

CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueDate_idx" ON platform."CustomFieldIndex" USING btree ("tenantId", "entityType", "valueDate");

CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueNumber_idx" ON platform."CustomFieldIndex" USING btree ("tenantId", "entityType", "valueNumber");

CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueText_idx" ON platform."CustomFieldIndex" USING btree ("tenantId", "entityType", "valueText");

CREATE UNIQUE INDEX "DimensionType_tenantId_code_key" ON platform."DimensionType" USING btree ("tenantId", code);

CREATE INDEX "DimensionType_tenantId_isActive_sortOrder_idx" ON platform."DimensionType" USING btree ("tenantId", "isActive", "sortOrder");

CREATE UNIQUE INDEX "DimensionValue_tenantId_typeId_code_key" ON platform."DimensionValue" USING btree ("tenantId", "typeId", code);

CREATE INDEX "DimensionValue_tenantId_typeId_isActive_sortOrder_idx" ON platform."DimensionValue" USING btree ("tenantId", "typeId", "isActive", "sortOrder");

CREATE INDEX "DocumentLink_tenantId_entityType_entityId_idx" ON platform."DocumentLink" USING btree ("tenantId", "entityType", "entityId");

CREATE INDEX "DocumentLink_tenantId_idx" ON platform."DocumentLink" USING btree ("tenantId");

CREATE INDEX "Document_tenantId_archivedAt_idx" ON platform."Document" USING btree ("tenantId", "archivedAt");

CREATE INDEX "Document_tenantId_idx" ON platform."Document" USING btree ("tenantId");

CREATE INDEX "Document_tenantId_type_idx" ON platform."Document" USING btree ("tenantId", type);

CREATE INDEX "EntityDimension_tenantId_entityType_entityId_idx" ON platform."EntityDimension" USING btree ("tenantId", "entityType", "entityId");

CREATE UNIQUE INDEX "EntityDimension_tenantId_entityType_entityId_typeId_valueId_key" ON platform."EntityDimension" USING btree ("tenantId", "entityType", "entityId", "typeId", "valueId");

CREATE INDEX "EntityDimension_tenantId_entityType_typeId_valueId_idx" ON platform."EntityDimension" USING btree ("tenantId", "entityType", "typeId", "valueId");

CREATE UNIQUE INDEX "EntityLayout_tenantId_entityType_key" ON platform."EntityLayout" USING btree ("tenantId", "entityType");

CREATE INDEX "File_objectKey_idx" ON platform."File" USING btree ("objectKey");

CREATE INDEX "File_tenantId_documentId_idx" ON platform."File" USING btree ("tenantId", "documentId");

CREATE INDEX "File_tenantId_idx" ON platform."File" USING btree ("tenantId");

CREATE UNIQUE INDEX "FormDefinition_publicId_key" ON platform."FormDefinition" USING btree ("publicId");

CREATE INDEX "FormDefinition_tenantId_archivedAt_idx" ON platform."FormDefinition" USING btree ("tenantId", "archivedAt");

CREATE INDEX "FormDefinition_tenantId_idx" ON platform."FormDefinition" USING btree ("tenantId");

CREATE UNIQUE INDEX "FormDefinition_tenantId_name_key" ON platform."FormDefinition" USING btree ("tenantId", name);

CREATE INDEX "FormDefinition_tenantId_status_idx" ON platform."FormDefinition" USING btree ("tenantId", status);

CREATE UNIQUE INDEX "FormField_formId_key_key" ON platform."FormField" USING btree ("formId", key);

CREATE INDEX "FormField_formId_order_idx" ON platform."FormField" USING btree ("formId", "order");

CREATE INDEX "FormField_tenantId_idx" ON platform."FormField" USING btree ("tenantId");

CREATE INDEX "FormSubmission_formId_submittedAt_idx" ON platform."FormSubmission" USING btree ("formId", "submittedAt");

CREATE INDEX "FormSubmission_tenantId_idx" ON platform."FormSubmission" USING btree ("tenantId");

CREATE INDEX "LegalEntity_tenantId_createdAt_idx" ON platform."LegalEntity" USING btree ("tenantId", "createdAt");

CREATE INDEX "LegalEntity_tenantId_idx" ON platform."LegalEntity" USING btree ("tenantId");

CREATE INDEX "LegalEntity_tenantId_kind_idx" ON platform."LegalEntity" USING btree ("tenantId", kind);

CREATE INDEX "Message_tenantId_createdAt_idx" ON platform."Message" USING btree ("tenantId", "createdAt" DESC);

CREATE INDEX "Message_tenantId_runId_createdAt_idx" ON platform."Message" USING btree ("tenantId", "runId", "createdAt");

CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON platform."NotificationRecipient" USING btree ("notificationId", "userId");

CREATE INDEX "NotificationRecipient_tenantId_workspaceId_userId_readAt_cr_idx" ON platform."NotificationRecipient" USING btree ("tenantId", "workspaceId", "userId", "readAt", "createdAt" DESC);

CREATE INDEX "Notification_tenantId_workspaceId_createdAt_idx" ON platform."Notification" USING btree ("tenantId", "workspaceId", "createdAt" DESC);

CREATE UNIQUE INDEX "Notification_tenantId_workspaceId_dedupeKey_key" ON platform."Notification" USING btree ("tenantId", "workspaceId", "dedupeKey");

CREATE INDEX "PackCatalog_updated_at_idx" ON platform."PackCatalog" USING btree (updated_at);

CREATE INDEX "SeededRecordMeta_tenant_id_source_template_id_idx" ON platform."SeededRecordMeta" USING btree (tenant_id, source_template_id);

CREATE INDEX "SeededRecordMeta_tenant_id_target_table_is_customized_idx" ON platform."SeededRecordMeta" USING btree (tenant_id, target_table, is_customized);

CREATE UNIQUE INDEX "SeededRecordMeta_tenant_id_target_table_target_id_key" ON platform."SeededRecordMeta" USING btree (tenant_id, target_table, target_id);

CREATE INDEX "SignCeremony_status_expiresAt_idx" ON platform."SignCeremony" USING btree (status, "expiresAt");

CREATE INDEX "SignRequestDraft_tenantId_workspaceId_actorId_requestId_idx" ON platform."SignRequestDraft" USING btree ("tenantId", "workspaceId", "actorId", "requestId");

CREATE INDEX "TemplateCatalog_category_idx" ON platform."TemplateCatalog" USING btree (category);

CREATE INDEX "TemplateCatalog_updated_at_idx" ON platform."TemplateCatalog" USING btree (updated_at);

CREATE UNIQUE INDEX "TenantAppInstall_tenant_id_app_id_key" ON platform."TenantAppInstall" USING btree (tenant_id, app_id);

CREATE INDEX "TenantAppInstall_tenant_id_created_at_idx" ON platform."TenantAppInstall" USING btree (tenant_id, created_at);

CREATE INDEX "TenantAppInstall_tenant_id_enabled_idx" ON platform."TenantAppInstall" USING btree (tenant_id, enabled);

CREATE UNIQUE INDEX "TenantFeatureOverride_tenant_id_feature_key_key" ON platform."TenantFeatureOverride" USING btree (tenant_id, feature_key);

CREATE INDEX "TenantFeatureOverride_tenant_id_idx" ON platform."TenantFeatureOverride" USING btree (tenant_id);

CREATE INDEX "TenantMenuOverride_tenant_id_idx" ON platform."TenantMenuOverride" USING btree (tenant_id);

CREATE UNIQUE INDEX "TenantMenuOverride_tenant_id_scope_key" ON platform."TenantMenuOverride" USING btree (tenant_id, scope);

CREATE INDEX "TenantPackInstall_tenant_id_created_at_idx" ON platform."TenantPackInstall" USING btree (tenant_id, created_at);

CREATE UNIQUE INDEX "TenantPackInstall_tenant_id_pack_id_version_key" ON platform."TenantPackInstall" USING btree (tenant_id, pack_id, version);

CREATE INDEX "TenantPackInstall_tenant_id_status_idx" ON platform."TenantPackInstall" USING btree (tenant_id, status);

CREATE INDEX "TenantTemplateInstall_tenant_id_created_at_idx" ON platform."TenantTemplateInstall" USING btree (tenant_id, created_at);

CREATE UNIQUE INDEX "TenantTemplateInstall_tenant_id_template_id_key" ON platform."TenantTemplateInstall" USING btree (tenant_id, template_id);

CREATE UNIQUE INDEX "ToolExecution_tenantId_runId_toolCallId_key" ON platform."ToolExecution" USING btree ("tenantId", "runId", "toolCallId");

CREATE UNIQUE INDEX "WorkspaceDomain_domain_key" ON platform."WorkspaceDomain" USING btree (domain);

CREATE INDEX "WorkspaceDomain_workspaceId_idx" ON platform."WorkspaceDomain" USING btree ("workspaceId");

CREATE INDEX "WorkspaceInvite_email_idx" ON platform."WorkspaceInvite" USING btree (email);

CREATE INDEX "WorkspaceInvite_status_expiresAt_idx" ON platform."WorkspaceInvite" USING btree (status, "expiresAt");

CREATE INDEX "WorkspaceInvite_token_idx" ON platform."WorkspaceInvite" USING btree (token);

CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON platform."WorkspaceInvite" USING btree (token);

CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON platform."WorkspaceInvite" USING btree ("workspaceId");

CREATE INDEX "WorkspaceInvite_workspaceId_status_idx" ON platform."WorkspaceInvite" USING btree ("workspaceId", status);

CREATE INDEX "WorkspaceMembership_userId_idx" ON platform."WorkspaceMembership" USING btree ("userId");

CREATE INDEX "WorkspaceMembership_userId_status_idx" ON platform."WorkspaceMembership" USING btree ("userId", status);

CREATE INDEX "WorkspaceMembership_workspaceId_idx" ON platform."WorkspaceMembership" USING btree ("workspaceId");

CREATE INDEX "WorkspaceMembership_workspaceId_status_idx" ON platform."WorkspaceMembership" USING btree ("workspaceId", status);

CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON platform."WorkspaceMembership" USING btree ("workspaceId", "userId");

CREATE INDEX "Workspace_deletedAt_idx" ON platform."Workspace" USING btree ("deletedAt");

CREATE INDEX "Workspace_legalEntityId_idx" ON platform."Workspace" USING btree ("legalEntityId");

CREATE UNIQUE INDEX "Workspace_slug_key" ON platform."Workspace" USING btree (slug);

CREATE INDEX "Workspace_tenantId_createdAt_idx" ON platform."Workspace" USING btree ("tenantId", "createdAt");

CREATE UNIQUE INDEX "Workspace_tenantId_id_key" ON platform."Workspace" USING btree ("tenantId", id);

CREATE INDEX "Workspace_tenantId_idx" ON platform."Workspace" USING btree ("tenantId");

CREATE UNIQUE INDEX "Workspace_tenantId_name_key" ON platform."Workspace" USING btree ("tenantId", name);

CREATE INDEX "Workspace_tenantId_onboardingStatus_idx" ON platform."Workspace" USING btree ("tenantId", "onboardingStatus");

CREATE INDEX integration_connections_tenant_id_workspace_id_idx ON platform.integration_connections USING btree (tenant_id, workspace_id);

CREATE INDEX integration_connections_workspace_id_kind_status_idx ON platform.integration_connections USING btree (workspace_id, kind, status);

CREATE INDEX sign_reminder_rate_idx ON platform."SignReminder" USING btree ("tenantId", "workspaceId", "requestId", "roleId", "createdAt");

CREATE UNIQUE INDEX sign_request_create_uq ON platform."SignRequestDraft" USING btree ("tenantId", "workspaceId", "actorId", "commandId");

CREATE UNIQUE INDEX sign_template_command_uq ON platform."SignTemplateRevision" USING btree ("tenantId", "workspaceId", "templateId", "actorId", "commandId");

CREATE INDEX "AuditLog_tenantId_action_idx" ON workflow."AuditLog" USING btree ("tenantId", action);

CREATE INDEX "AuditLog_tenantId_entity_entityId_idx" ON workflow."AuditLog" USING btree ("tenantId", entity, "entityId");

CREATE INDEX "DomainEvent_tenantId_eventType_idx" ON workflow."DomainEvent" USING btree ("tenantId", "eventType");

CREATE INDEX "IdempotencyKey_tenantId_actionKey_idx" ON workflow."IdempotencyKey" USING btree ("tenantId", "actionKey");

CREATE UNIQUE INDEX "IdempotencyKey_tenantId_actionKey_key_key" ON workflow."IdempotencyKey" USING btree ("tenantId", "actionKey", key);

CREATE INDEX "OutboxEvent_status_availableAt_lockedUntil_createdAt_idx" ON workflow."OutboxEvent" USING btree (status, "availableAt", "lockedUntil", "createdAt");

CREATE INDEX "OutboxEvent_tenantId_status_availableAt_idx" ON workflow."OutboxEvent" USING btree ("tenantId", status, "availableAt");

CREATE INDEX "Task_instanceId_status_idx" ON workflow."Task" USING btree ("instanceId", status);

CREATE INDEX "Task_runAt_status_idx" ON workflow."Task" USING btree ("runAt", status);

CREATE INDEX "Task_status_lockedAt_idx" ON workflow."Task" USING btree (status, "lockedAt");

CREATE INDEX "Task_tenantId_assigneePermissionKey_status_idx" ON workflow."Task" USING btree ("tenantId", "assigneePermissionKey", status);

CREATE INDEX "Task_tenantId_assigneeRoleId_status_idx" ON workflow."Task" USING btree ("tenantId", "assigneeRoleId", status);

CREATE INDEX "Task_tenantId_assigneeUserId_status_idx" ON workflow."Task" USING btree ("tenantId", "assigneeUserId", status);

CREATE INDEX "Task_tenantId_idempotencyKey_idx" ON workflow."Task" USING btree ("tenantId", "idempotencyKey");

CREATE INDEX "Task_tenantId_status_runAt_idx" ON workflow."Task" USING btree ("tenantId", status, "runAt");

CREATE INDEX "WorkflowDefinition_tenantId_key_idx" ON workflow."WorkflowDefinition" USING btree ("tenantId", key);

CREATE UNIQUE INDEX "WorkflowDefinition_tenantId_key_version_key" ON workflow."WorkflowDefinition" USING btree ("tenantId", key, version);

CREATE INDEX "WorkflowDefinition_tenantId_status_idx" ON workflow."WorkflowDefinition" USING btree ("tenantId", status);

CREATE INDEX "WorkflowEvent_instanceId_type_idx" ON workflow."WorkflowEvent" USING btree ("instanceId", type);

CREATE INDEX "WorkflowEvent_tenantId_instanceId_createdAt_idx" ON workflow."WorkflowEvent" USING btree ("tenantId", "instanceId", "createdAt");

CREATE INDEX "WorkflowEvent_tenantId_type_createdAt_idx" ON workflow."WorkflowEvent" USING btree ("tenantId", type, "createdAt");

CREATE INDEX "WorkflowInstance_status_updatedAt_idx" ON workflow."WorkflowInstance" USING btree (status, "updatedAt");

CREATE INDEX "WorkflowInstance_tenantId_businessKey_idx" ON workflow."WorkflowInstance" USING btree ("tenantId", "businessKey");

CREATE UNIQUE INDEX "WorkflowInstance_tenantId_definitionId_businessKey_key" ON workflow."WorkflowInstance" USING btree ("tenantId", "definitionId", "businessKey");

CREATE INDEX "WorkflowInstance_tenantId_status_idx" ON workflow."WorkflowInstance" USING btree ("tenantId", status);

ALTER TABLE ONLY accounting."JournalLine"
    ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES accounting."JournalEntry"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting."JournalLine"
    ADD CONSTRAINT "JournalLine_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES accounting."LedgerAccount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY accounting.cash_assistant_workspaces
    ADD CONSTRAINT "cash_assistant_workspaces_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_assistant_workspaces
    ADD CONSTRAINT "cash_assistant_workspaces_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_assistant_workspaces
    ADD CONSTRAINT "cash_assistant_workspaces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_close_count_lines
    ADD CONSTRAINT "cash_day_close_count_lines_dayCloseId_fkey" FOREIGN KEY ("dayCloseId") REFERENCES accounting.cash_day_closes(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_close_review_requirements
    ADD CONSTRAINT "cash_day_close_review_requirements_affectedDayCloseId_fkey" FOREIGN KEY ("affectedDayCloseId") REFERENCES accounting.cash_day_closes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY accounting.cash_day_close_review_requirements
    ADD CONSTRAINT "cash_day_close_review_requirements_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES accounting.cash_day_close_revisions(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_close_revisions
    ADD CONSTRAINT "cash_day_close_revisions_correctionEntryId_fkey" FOREIGN KEY ("correctionEntryId") REFERENCES accounting.cash_entries(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY accounting.cash_day_close_revisions
    ADD CONSTRAINT "cash_day_close_revisions_dayCloseId_fkey" FOREIGN KEY ("dayCloseId") REFERENCES accounting.cash_day_closes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY accounting.cash_day_closes
    ADD CONSTRAINT "cash_day_closes_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_closes
    ADD CONSTRAINT "cash_day_closes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_closes
    ADD CONSTRAINT "cash_day_closes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_confirmations
    ADD CONSTRAINT "cash_day_confirmations_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_confirmations
    ADD CONSTRAINT "cash_day_confirmations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_day_confirmations
    ADD CONSTRAINT "cash_day_confirmations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entries
    ADD CONSTRAINT "cash_entries_lockedByDayCloseId_fkey" FOREIGN KEY ("lockedByDayCloseId") REFERENCES accounting.cash_day_closes(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY accounting.cash_entries
    ADD CONSTRAINT "cash_entries_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entries
    ADD CONSTRAINT "cash_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entries
    ADD CONSTRAINT "cash_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entry_attachments
    ADD CONSTRAINT "cash_entry_attachments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES accounting.cash_entries(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entry_confirmations
    ADD CONSTRAINT "cash_entry_confirmations_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entry_confirmations
    ADD CONSTRAINT "cash_entry_confirmations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entry_confirmations
    ADD CONSTRAINT "cash_entry_confirmations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_entry_counters
    ADD CONSTRAINT "cash_entry_counters_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_export_artifacts
    ADD CONSTRAINT "cash_export_artifacts_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_location_transfers
    ADD CONSTRAINT "cash_location_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_location_transfers
    ADD CONSTRAINT "cash_location_transfers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_registers
    ADD CONSTRAINT "cash_registers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_registers
    ADD CONSTRAINT "cash_registers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_workspace_handoffs
    ADD CONSTRAINT "cash_workspace_handoffs_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES accounting.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_workspace_handoffs
    ADD CONSTRAINT "cash_workspace_handoffs_sourceWorkspaceId_fkey" FOREIGN KEY ("sourceWorkspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_workspace_handoffs
    ADD CONSTRAINT "cash_workspace_handoffs_targetWorkspaceId_fkey" FOREIGN KEY ("targetWorkspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY accounting.cash_workspace_handoffs
    ADD CONSTRAINT "cash_workspace_handoffs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BankAccount"
    ADD CONSTRAINT "BankAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES platform."LegalEntity"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BillingAccount"
    ADD CONSTRAINT "BillingAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BillingProviderEvent"
    ADD CONSTRAINT "BillingProviderEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES billing."BillingAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY billing."BillingProviderEvent"
    ADD CONSTRAINT "BillingProviderEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BillingSubscription"
    ADD CONSTRAINT "BillingSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES billing."BillingAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BillingSubscription"
    ADD CONSTRAINT "BillingSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BillingTrial"
    ADD CONSTRAINT "BillingTrial_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES billing."BillingAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BillingTrial"
    ADD CONSTRAINT "BillingTrial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."BillingUsageCounter"
    ADD CONSTRAINT "BillingUsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."ExpenseLine"
    ADD CONSTRAINT "ExpenseLine_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES billing."Expense"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."InvoiceLine"
    ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES billing."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."InvoicePayment"
    ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES billing."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."InvoiceReminderState"
    ADD CONSTRAINT "InvoiceReminderState_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES billing."Invoice"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."Invoice"
    ADD CONSTRAINT "Invoice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES platform."LegalEntity"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY billing."Invoice"
    ADD CONSTRAINT "Invoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES billing."PaymentMethod"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY billing."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES billing."BankAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY billing."PaymentMethod"
    ADD CONSTRAINT "PaymentMethod_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES platform."LegalEntity"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."TaxEricJob"
    ADD CONSTRAINT "TaxEricJob_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES billing."TaxReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."TaxRate"
    ADD CONSTRAINT "TaxRate_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES billing."TaxCode"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."TaxReportLine"
    ADD CONSTRAINT "TaxReportLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES billing."TaxReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY billing."TaxReportSection"
    ADD CONSTRAINT "TaxReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES billing."TaxReport"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."BillPayment"
    ADD CONSTRAINT "BillPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES commerce."VendorBill"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."BookingAllocation"
    ADD CONSTRAINT "BookingAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES commerce."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."BookingAllocation"
    ADD CONSTRAINT "BookingAllocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES commerce."BookingResource"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY commerce."BookingAvailabilityRule"
    ADD CONSTRAINT "BookingAvailabilityRule_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES commerce."BookingResource"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."BookingHold"
    ADD CONSTRAINT "BookingHold_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES commerce."BookingServiceOffering"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY commerce."Booking"
    ADD CONSTRAINT "Booking_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES commerce."BookingHold"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY commerce."Booking"
    ADD CONSTRAINT "Booking_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES commerce."BookingServiceOffering"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY commerce."CatalogCategory"
    ADD CONSTRAINT "CatalogCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES commerce."CatalogCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY commerce."CatalogItemCategory"
    ADD CONSTRAINT "CatalogItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES commerce."CatalogCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."CatalogItemCategory"
    ADD CONSTRAINT "CatalogItemCategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES commerce."CatalogItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."CatalogItem"
    ADD CONSTRAINT "CatalogItem_defaultUomId_fkey" FOREIGN KEY ("defaultUomId") REFERENCES commerce."CatalogUom"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY commerce."CatalogItem"
    ADD CONSTRAINT "CatalogItem_taxProfileId_fkey" FOREIGN KEY ("taxProfileId") REFERENCES commerce."CatalogTaxProfile"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY commerce."CatalogPrice"
    ADD CONSTRAINT "CatalogPrice_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES commerce."CatalogItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."CatalogPrice"
    ADD CONSTRAINT "CatalogPrice_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES commerce."CatalogPriceList"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."CatalogPrice"
    ADD CONSTRAINT "CatalogPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES commerce."CatalogVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."CatalogVariantBarcode"
    ADD CONSTRAINT "CatalogVariantBarcode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES commerce."CatalogVariant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."CatalogVariant"
    ADD CONSTRAINT "CatalogVariant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES commerce."CatalogItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."ImportShipmentDocument"
    ADD CONSTRAINT "ImportShipmentDocument_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES commerce."ImportShipment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."ImportShipmentLine"
    ADD CONSTRAINT "ImportShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES commerce."ImportShipment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."InventoryDocumentLine"
    ADD CONSTRAINT "InventoryDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES commerce."InventoryDocument"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."InventoryLocation"
    ADD CONSTRAINT "InventoryLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES commerce."InventoryWarehouse"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."PurchaseOrderLine"
    ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES commerce."PurchaseOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."SalesOrderLine"
    ADD CONSTRAINT "SalesOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES commerce."SalesOrder"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."SalesQuoteLine"
    ADD CONSTRAINT "SalesQuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES commerce."SalesQuote"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce."VendorBillLine"
    ADD CONSTRAINT "VendorBillLine_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES commerce."VendorBill"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.kitchen_ticket_items
    ADD CONSTRAINT "kitchen_ticket_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES commerce.restaurant_order_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY commerce.kitchen_ticket_items
    ADD CONSTRAINT "kitchen_ticket_items_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES commerce.kitchen_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.kitchen_tickets
    ADD CONSTRAINT "kitchen_tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES commerce.restaurant_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.kitchen_tickets
    ADD CONSTRAINT "kitchen_tickets_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES commerce.kitchen_stations(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY commerce.payment_attempts
    ADD CONSTRAINT payment_attempts_register_id_fkey FOREIGN KEY (register_id) REFERENCES commerce.registers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY commerce.payment_attempts
    ADD CONSTRAINT payment_attempts_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.pos_sale_idempotency
    ADD CONSTRAINT pos_sale_idempotency_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.pos_sale_records
    ADD CONSTRAINT pos_sale_records_register_id_fkey FOREIGN KEY (register_id) REFERENCES commerce.registers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY commerce.pos_sale_records
    ADD CONSTRAINT pos_sale_records_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.registers
    ADD CONSTRAINT registers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.restaurant_approval_requests
    ADD CONSTRAINT "restaurant_approval_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES commerce.restaurant_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.restaurant_approval_requests
    ADD CONSTRAINT "restaurant_approval_requests_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES commerce.restaurant_order_items(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY commerce.restaurant_menu_item_modifier_groups
    ADD CONSTRAINT "restaurant_menu_item_modifier_groups_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES commerce.restaurant_modifier_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.restaurant_modifier_options
    ADD CONSTRAINT "restaurant_modifier_options_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES commerce.restaurant_modifier_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.restaurant_order_item_modifiers
    ADD CONSTRAINT "restaurant_order_item_modifiers_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES commerce.restaurant_order_items(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.restaurant_order_items
    ADD CONSTRAINT "restaurant_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES commerce.restaurant_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.restaurant_order_payments
    ADD CONSTRAINT "restaurant_order_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES commerce.restaurant_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.restaurant_orders
    ADD CONSTRAINT "restaurant_orders_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES commerce.restaurant_table_sessions(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY commerce.restaurant_table_sessions
    ADD CONSTRAINT "restaurant_table_sessions_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES commerce.restaurant_tables(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY commerce.restaurant_tables
    ADD CONSTRAINT "restaurant_tables_diningRoomId_fkey" FOREIGN KEY ("diningRoomId") REFERENCES commerce.restaurant_dining_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.shift_sessions
    ADD CONSTRAINT shift_sessions_register_id_fkey FOREIGN KEY (register_id) REFERENCES commerce.registers(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY commerce.shift_sessions
    ADD CONSTRAINT shift_sessions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."CmsComment"
    ADD CONSTRAINT "CmsComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES content."CmsComment"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY content."CmsComment"
    ADD CONSTRAINT "CmsComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES content."CmsPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."CmsComment"
    ADD CONSTRAINT "CmsComment_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES content."CmsReader"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."CmsPost"
    ADD CONSTRAINT "CmsPost_coverImageFileId_fkey" FOREIGN KEY ("coverImageFileId") REFERENCES platform."File"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY content."DirectoryLead"
    ADD CONSTRAINT "DirectoryLead_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES content."DirectoryRestaurant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."PortfolioClient"
    ADD CONSTRAINT "PortfolioClient_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES content."PortfolioShowcase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."PortfolioProfile"
    ADD CONSTRAINT "PortfolioProfile_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES content."PortfolioShowcase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."PortfolioProjectClient"
    ADD CONSTRAINT "PortfolioProjectClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES content."PortfolioClient"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."PortfolioProjectClient"
    ADD CONSTRAINT "PortfolioProjectClient_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES content."PortfolioProject"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."PortfolioProject"
    ADD CONSTRAINT "PortfolioProject_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES content."PortfolioShowcase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."PortfolioService"
    ADD CONSTRAINT "PortfolioService_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES content."PortfolioShowcase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."PortfolioTeamMember"
    ADD CONSTRAINT "PortfolioTeamMember_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES content."PortfolioShowcase"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."RentalAvailabilityRange"
    ADD CONSTRAINT "RentalAvailabilityRange_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES content."RentalProperty"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."RentalPropertyCategory"
    ADD CONSTRAINT "RentalPropertyCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES content."RentalCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."RentalPropertyCategory"
    ADD CONSTRAINT "RentalPropertyCategory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES content."RentalProperty"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."RentalPropertyImage"
    ADD CONSTRAINT "RentalPropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES content."RentalProperty"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsiteDomain"
    ADD CONSTRAINT "WebsiteDomain_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES content."WebsiteSite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsiteFeedbackImage"
    ADD CONSTRAINT "WebsiteFeedbackImage_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES content."WebsiteFeedback"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsiteFeedback"
    ADD CONSTRAINT "WebsiteFeedback_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES content."WebsitePage"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY content."WebsiteFeedback"
    ADD CONSTRAINT "WebsiteFeedback_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES content."WebsiteSite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsiteMenu"
    ADD CONSTRAINT "WebsiteMenu_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES content."WebsiteSite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsitePageSnapshot"
    ADD CONSTRAINT "WebsitePageSnapshot_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES content."WebsitePage"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsitePageSnapshot"
    ADD CONSTRAINT "WebsitePageSnapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES content."WebsiteSite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsitePage"
    ADD CONSTRAINT "WebsitePage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES content."WebsiteSite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsiteQa"
    ADD CONSTRAINT "WebsiteQa_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES content."WebsitePage"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY content."WebsiteQa"
    ADD CONSTRAINT "WebsiteQa_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES content."WebsiteSite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsiteWallOfLoveItemImage"
    ADD CONSTRAINT "WebsiteWallOfLoveItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES content."WebsiteWallOfLoveItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY content."WebsiteWallOfLoveItem"
    ADD CONSTRAINT "WebsiteWallOfLoveItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES content."WebsiteSite"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."Activity"
    ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES crm."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."Activity"
    ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES crm."Lead"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."Activity"
    ADD CONSTRAINT "Activity_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."Address"
    ADD CONSTRAINT "Address_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ChannelTemplate"
    ADD CONSTRAINT "ChannelTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassAttendance"
    ADD CONSTRAINT "ClassAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES crm."ClassEnrollment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassAttendance"
    ADD CONSTRAINT "ClassAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES crm."ClassSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassBillingInvoiceLink"
    ADD CONSTRAINT "ClassBillingInvoiceLink_billingRunId_fkey" FOREIGN KEY ("billingRunId") REFERENCES crm."ClassMonthlyBillingRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassBillingInvoiceLink"
    ADD CONSTRAINT "ClassBillingInvoiceLink_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES crm."ClassEnrollment"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."ClassEnrollmentBillingPlan"
    ADD CONSTRAINT "ClassEnrollmentBillingPlan_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES crm."ClassEnrollment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassEnrollment"
    ADD CONSTRAINT "ClassEnrollment_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES crm."ClassGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassGroupInstructor"
    ADD CONSTRAINT "ClassGroupInstructor_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES crm."ClassGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassGroupResource"
    ADD CONSTRAINT "ClassGroupResource_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES crm."ClassGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassGroup"
    ADD CONSTRAINT "ClassGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES crm."ClassProgram"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."ClassMilestoneCompletion"
    ADD CONSTRAINT "ClassMilestoneCompletion_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES crm."ClassEnrollment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassMilestoneCompletion"
    ADD CONSTRAINT "ClassMilestoneCompletion_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES crm."ClassMilestone"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassMilestone"
    ADD CONSTRAINT "ClassMilestone_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES crm."ClassGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassMilestone"
    ADD CONSTRAINT "ClassMilestone_programMilestoneTemplateId_fkey" FOREIGN KEY ("programMilestoneTemplateId") REFERENCES crm."ClassProgramMilestoneTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."ClassProgramMilestoneTemplate"
    ADD CONSTRAINT "ClassProgramMilestoneTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES crm."ClassProgram"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassProgramSessionTemplate"
    ADD CONSTRAINT "ClassProgramSessionTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES crm."ClassProgram"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."ClassSession"
    ADD CONSTRAINT "ClassSession_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES crm."ClassGroup"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CoachingArtifactBundle"
    ADD CONSTRAINT "CoachingArtifactBundle_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES crm."CoachingEngagement"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CoachingBookingHold"
    ADD CONSTRAINT "CoachingBookingHold_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES crm."CoachingOffer"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CoachingContractRequest"
    ADD CONSTRAINT "CoachingContractRequest_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES crm."CoachingEngagement"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CoachingEngagementEvent"
    ADD CONSTRAINT "CoachingEngagementEvent_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES crm."CoachingEngagement"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CoachingEngagement"
    ADD CONSTRAINT "CoachingEngagement_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES crm."CoachingOffer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY crm."CoachingPayment"
    ADD CONSTRAINT "CoachingPayment_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES crm."CoachingEngagement"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CoachingSession"
    ADD CONSTRAINT "CoachingSession_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES crm."CoachingEngagement"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CommunicationWebhookEvent"
    ADD CONSTRAINT "CommunicationWebhookEvent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES crm."Activity"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."ContactPoint"
    ADD CONSTRAINT "ContactPoint_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CrmAccountProfile"
    ADD CONSTRAINT "CrmAccountProfile_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CrmMailMessage"
    ADD CONSTRAINT "CrmMailMessage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES crm."CrmMailbox"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CrmMailMessage"
    ADD CONSTRAINT "CrmMailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES crm."CrmMailThread"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CrmMailMessage"
    ADD CONSTRAINT "CrmMailMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CrmMailThread"
    ADD CONSTRAINT "CrmMailThread_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES crm."CrmMailbox"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CrmMailThread"
    ADD CONSTRAINT "CrmMailThread_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."CrmMailbox"
    ADD CONSTRAINT "CrmMailbox_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES platform.integration_connections(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY crm."CrmMailbox"
    ADD CONSTRAINT "CrmMailbox_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."DealAiSnapshot"
    ADD CONSTRAINT "DealAiSnapshot_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES crm."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."DealStageTransition"
    ADD CONSTRAINT "DealStageTransition_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES crm."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."Deal"
    ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."Deal"
    ADD CONSTRAINT "Deal_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."IssueActivity"
    ADD CONSTRAINT "IssueActivity_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES crm."Issue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."IssueAttachment"
    ADD CONSTRAINT "IssueAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES crm."IssueComment"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."IssueAttachment"
    ADD CONSTRAINT "IssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES crm."Issue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."IssueComment"
    ADD CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES crm."Issue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."LoyaltyLedgerEntry"
    ADD CONSTRAINT "LoyaltyLedgerEntry_tenantId_customerPartyId_fkey" FOREIGN KEY ("tenantId", "customerPartyId") REFERENCES crm."LoyaltyAccount"("tenantId", "customerPartyId") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."PackageUsage"
    ADD CONSTRAINT "PackageUsage_customerPackageId_fkey" FOREIGN KEY ("customerPackageId") REFERENCES crm."CustomerPackage"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."PartyLifecycleTransition"
    ADD CONSTRAINT "PartyLifecycleTransition_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."PartyRelationship"
    ADD CONSTRAINT "PartyRelationship_fromPartyId_fkey" FOREIGN KEY ("fromPartyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."PartyRelationship"
    ADD CONSTRAINT "PartyRelationship_toPartyId_fkey" FOREIGN KEY ("toPartyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."PartyRole"
    ADD CONSTRAINT "PartyRole_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."SequenceEnrollment"
    ADD CONSTRAINT "SequenceEnrollment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES crm."Deal"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."SequenceEnrollment"
    ADD CONSTRAINT "SequenceEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES crm."Lead"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."SequenceEnrollment"
    ADD CONSTRAINT "SequenceEnrollment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES crm."Party"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY crm."SequenceEnrollment"
    ADD CONSTRAINT "SequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES crm."Sequence"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY crm."SequenceStep"
    ADD CONSTRAINT "SequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES crm."Sequence"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."ApiKey"
    ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."Membership"
    ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES identity."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY identity."Membership"
    ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."Membership"
    ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES identity."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES identity."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."RefreshToken"
    ADD CONSTRAINT "RefreshToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES identity."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."RolePermissionGrant"
    ADD CONSTRAINT "RolePermissionGrant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES identity."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY identity."RolePermissionGrant"
    ADD CONSTRAINT "RolePermissionGrant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES identity."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."RolePermissionGrant"
    ADD CONSTRAINT "RolePermissionGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES identity."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES identity."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."Role"
    ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."SsoAppSession"
    ADD CONSTRAINT "SsoAppSession_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES identity."SsoCentralSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."SsoCentralSession"
    ADD CONSTRAINT "SsoCentralSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES identity."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."SsoEmailChallenge"
    ADD CONSTRAINT "SsoEmailChallenge_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES identity."SsoLoginTransaction"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY identity."SsoLoginTransaction"
    ADD CONSTRAINT "SsoLoginTransaction_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES identity."SsoCentralSession"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."DimensionValue"
    ADD CONSTRAINT "DimensionValue_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES platform."DimensionType"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."DocumentLink"
    ADD CONSTRAINT "DocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES platform."Document"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."EntityDimension"
    ADD CONSTRAINT "EntityDimension_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES platform."DimensionType"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."EntityDimension"
    ADD CONSTRAINT "EntityDimension_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES platform."DimensionValue"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."File"
    ADD CONSTRAINT "File_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES platform."Document"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."FormField"
    ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES platform."FormDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."FormSubmission"
    ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES platform."FormDefinition"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."LegalEntity"
    ADD CONSTRAINT "LegalEntity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."Message"
    ADD CONSTRAINT "Message_runId_fkey" FOREIGN KEY ("runId") REFERENCES platform."AgentRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."NotificationRecipient"
    ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES platform."Notification"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."SeededRecordMeta"
    ADD CONSTRAINT "SeededRecordMeta_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."SignCeremonyRecipient"
    ADD CONSTRAINT "SignCeremonyRecipient_tenantId_workspaceId_requestId_fkey" FOREIGN KEY ("tenantId", "workspaceId", "requestId") REFERENCES platform."SignCeremony"("tenantId", "workspaceId", "requestId") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY platform."SignCeremony"
    ADD CONSTRAINT "SignCeremony_tenantId_workspaceId_requestId_fkey" FOREIGN KEY ("tenantId", "workspaceId", "requestId") REFERENCES platform."SignRequestDraft"("tenantId", "workspaceId", "requestId") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY platform."SignReminder"
    ADD CONSTRAINT "SignReminder_tenantId_workspaceId_requestId_fkey" FOREIGN KEY ("tenantId", "workspaceId", "requestId") REFERENCES platform."SignCeremony"("tenantId", "workspaceId", "requestId") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY platform."SignRequestDraft"
    ADD CONSTRAINT "SignRequestDraft_tenantId_workspaceId_templateId_templateR_fkey" FOREIGN KEY ("tenantId", "workspaceId", "templateId", "templateRevision") REFERENCES platform."SignTemplatePublication"("tenantId", "workspaceId", "templateId", revision) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY platform."SignTemplatePublication"
    ADD CONSTRAINT "SignTemplatePublication_tenantId_workspaceId_templateId_re_fkey" FOREIGN KEY ("tenantId", "workspaceId", "templateId", revision) REFERENCES platform."SignTemplateRevision"("tenantId", "workspaceId", "templateId", revision) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY platform."SignTemplateRevision"
    ADD CONSTRAINT "SignTemplateRevision_tenantId_workspaceId_fkey" FOREIGN KEY ("tenantId", "workspaceId") REFERENCES platform."Workspace"("tenantId", id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY platform."TenantAppInstall"
    ADD CONSTRAINT "TenantAppInstall_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."TenantFeatureOverride"
    ADD CONSTRAINT "TenantFeatureOverride_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."TenantMenuOverride"
    ADD CONSTRAINT "TenantMenuOverride_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."TenantPackInstall"
    ADD CONSTRAINT "TenantPackInstall_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."TenantTemplateInstall"
    ADD CONSTRAINT "TenantTemplateInstall_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."ToolExecution"
    ADD CONSTRAINT "ToolExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES platform."AgentRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."WorkspaceDomain"
    ADD CONSTRAINT "WorkspaceDomain_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."WorkspaceInvite"
    ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."WorkspaceMembership"
    ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES identity."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."WorkspaceMembership"
    ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform."Workspace"
    ADD CONSTRAINT "Workspace_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES platform."LegalEntity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY platform."Workspace"
    ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES identity."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY platform.integration_connections
    ADD CONSTRAINT integration_connections_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES platform."Workspace"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY workflow."Task"
    ADD CONSTRAINT "Task_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES workflow."WorkflowInstance"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY workflow."WorkflowEvent"
    ADD CONSTRAINT "WorkflowEvent_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES workflow."WorkflowInstance"(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY workflow."WorkflowInstance"
    ADD CONSTRAINT "WorkflowInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES workflow."WorkflowDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;

COMMIT;
