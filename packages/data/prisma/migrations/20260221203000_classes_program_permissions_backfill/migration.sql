INSERT INTO "identity"."RolePermissionGrant" (
  "id",
  "tenantId",
  "roleId",
  "permissionKey",
  "effect",
  "createdAt",
  "createdBy"
)
SELECT
  CONCAT('migr-', md5(rpg."tenantId" || ':' || rpg."roleId" || ':classes.programs.view')),
  rpg."tenantId",
  rpg."roleId",
  'classes.programs.view',
  'ALLOW'::"identity"."PermissionEffect",
  CURRENT_TIMESTAMP,
  NULL
FROM "identity"."RolePermissionGrant" rpg
LEFT JOIN "identity"."RolePermissionGrant" existing
  ON existing."tenantId" = rpg."tenantId"
  AND existing."roleId" = rpg."roleId"
  AND existing."permissionKey" = 'classes.programs.view'
WHERE rpg."permissionKey" = 'classes.cohort.manage'
  AND rpg."effect" = 'ALLOW'::"identity"."PermissionEffect"
  AND existing."id" IS NULL;

INSERT INTO "identity"."RolePermissionGrant" (
  "id",
  "tenantId",
  "roleId",
  "permissionKey",
  "effect",
  "createdAt",
  "createdBy"
)
SELECT
  CONCAT('migr-', md5(rpg."tenantId" || ':' || rpg."roleId" || ':classes.programs.manage')),
  rpg."tenantId",
  rpg."roleId",
  'classes.programs.manage',
  'ALLOW'::"identity"."PermissionEffect",
  CURRENT_TIMESTAMP,
  NULL
FROM "identity"."RolePermissionGrant" rpg
LEFT JOIN "identity"."RolePermissionGrant" existing
  ON existing."tenantId" = rpg."tenantId"
  AND existing."roleId" = rpg."roleId"
  AND existing."permissionKey" = 'classes.programs.manage'
WHERE rpg."permissionKey" = 'classes.cohort.manage'
  AND rpg."effect" = 'ALLOW'::"identity"."PermissionEffect"
  AND existing."id" IS NULL;
