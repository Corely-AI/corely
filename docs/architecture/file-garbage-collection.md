# File Garbage Collection Strategy

**Status:** Draft
**Date:** 2026-02-02
**Context:** Management of orphaned files in cloud storage (GCP).

---

## 1. Problem Statement

In the current architecture, files are uploaded directly to Google Cloud Storage (GCP) via signed URLs or backend proxies _before_ they are permanently linked to a domain entity (e.g., a Rental Property or Invoice).

This creates two scenarios where files become "orphaned" (unused):

1.  **Abandoned Uploads:** A user uploads a file (e.g., for a gallery) but cancels the operation or navigates away without saving the parent entity.
2.  **Disassociated Files:** A user edits an entity (e.g., removes an image from a gallery) and saves. The link database record is deleted, but the physical file remains in storage.

Over time, these orphaned files accumulate, increasing storage costs and clutter.

## 2. Proposed Solution: Asynchronous Garbage Collection

We will implement a **Scheduled Garbage Collection (GC) Worker** that runs periodically to identify and physically delete unused files. This "soft delete first, hard delete later" approach ensures data safety and keeps user operations (save/update) fast.

### Core Principles

- **Safety First:** Never delete a file immediately. Always allow a "grace period" (e.g., 24 hours) to account for in-progress uploads or transactions.
- **Reference Counting (Virtual):** A file is considered "in use" if it is referenced by any known entity table in the database.
- **Batch Processing:** Deletions happen in background batches to avoid overwhelming the database or storage API.

---

## 3. Implementation Details

### 3.1 New Worker Task: `PruneUnusedFiles`

A new Cron-triggered task will be added to the `services/worker` module.

**Schedule:** Daily (e.g., at 03:00 UTC).

#### Logic Flow:

1.  **Identify Candidates:**
    Query the `File` table for records created before the grace period (e.g., `createdAt < NOW() - 24 hours`).

2.  **Filter In-Use Files:**
    Check candidates against all known usage tables. A file is **KEEP** if:
    - It is referenced in `RentalProperty` (`coverImageFileId`).
    - It is referenced in `RentalPropertyImage` (`fileId`).
    - It is referenced in `Document` (`fileId`).
    - _Add future entity references here as the app grows._

    _Optimization:_ This can be done via a `LEFT JOIN` query in Prisma/SQL. If all check columns are `NULL`, the file is orphaned.

3.  **Execute Deletion:**
    For verified orphans:
    - **Step A (Storage):** Call `ObjectStoragePort.deleteObject({ key: file.objectKey })`.
    - **Step B (Database):** Call `FileRepo.delete(file.id)`.

### 3.2 Database Schema Impacts

No strict schema changes are required immediately, but for performance at scale, we might consider adding a `lastReferencedAt` or `isOrphaned` index if the volume becomes massive. For now, scanning based on `createdAt` is sufficient.

### 3.3 Safety & Auditing

- **Dry Run Mode:** The worker should support a `DRY_RUN=true` env flag to log what _would_ be deleted without taking action.
- **Logging:** All deletions must be logged to the application logger with `fileId`, `objectKey`, and `reason="garbage_collection"`.

---

## 4. Technical Specifications

### 4.1 SQL Query (Concept)

```sql
-- Find files older than 24h that are NOT referenced
SELECT f.id, f.object_key
FROM "File" f
LEFT JOIN "RentalProperty" rp ON rp."coverImageFileId" = f.id
LEFT JOIN "RentalPropertyImage" rpi ON rpi."fileId" = f.id
LEFT JOIN "Document" d ON d."fileId" = f.id
WHERE f."createdAt" < NOW() - INTERVAL '1 day'
  AND rp.id IS NULL
  AND rpi.id IS NULL
  AND d.id IS NULL
LIMIT 1000; -- Batch limitation
```

### 4.2 Use Case Interface

Location: `services/api/src/modules/documents/application/use-cases/prune-unused-files.usecase.ts`

```typescript
export class PruneUnusedFilesUseCase {
  constructor(
    private readonly fileRepo: FileRepoPort,
    private readonly storage: ObjectStoragePort,
    private readonly logger: LoggerPort
  ) {}

  async execute(input: { dryRun?: boolean }) {
    // 1. Get orphans
    const orphans = await this.fileRepo.findOrphans({ olderThanHours: 24, limit: 100 });

    for (const file of orphans) {
      if (!input.dryRun) {
        try {
          // 2. Delete from GCS
          await this.storage.deleteObject(file.objectKey);
          // 3. Delete from DB
          await this.fileRepo.delete(file.id);
          this.logger.info(`Deleted orphan file: ${file.id}`);
        } catch (error) {
          this.logger.error(`Failed to prune file ${file.id}`, error);
        }
      } else {
        this.logger.info(`[DryRun] Would delete: ${file.id}`);
      }
    }
  }
}
```

---

## 5. Next Steps

1.  **Create Use Case:** Implement `PruneUnusedFilesUseCase` in the Documents module.
2.  **Update Repositories:** Add `findOrphans` method to `PrismaFileRepoAdapter` implementing the conceptual SQL logic using Prisma ORM.
3.  **Configure Worker:** Register the use case in `services/worker` and schedule it using the existing task runner infrastructure.
