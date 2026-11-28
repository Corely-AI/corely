ALTER TABLE "platform"."SignRequestDraft"
  ADD COLUMN "configuration" JSONB,
  ADD COLUMN "replacesRequestId" UUID;

CREATE UNIQUE INDEX "sign_request_replacement_uq"
  ON "platform"."SignRequestDraft" ("tenantId", "workspaceId", "replacesRequestId");
