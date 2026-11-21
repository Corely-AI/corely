CREATE TABLE platform."SignReminder" ("tenantId" TEXT NOT NULL,"workspaceId" TEXT NOT NULL,"requestId" UUID NOT NULL,"commandId" UUID NOT NULL,"roleId" TEXT NOT NULL,
PRIMARY KEY("tenantId","workspaceId","requestId","commandId"),FOREIGN KEY("tenantId","workspaceId","requestId") REFERENCES platform."SignCeremony"("tenantId","workspaceId","requestId") ON DELETE RESTRICT ON UPDATE CASCADE);
