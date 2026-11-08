import { StaffAbsenceSchema } from "@corely/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { StaffAbsenceUseCase } from "../application/staff-absence.usecase";
import { absenceTestFixture, absenceTestsEnabled } from "./staff-absence-fixture";
import { OpenBukStudioUseCase } from "../../booking/application/use-cases/openbuk-studio.usecase";
import { PrismaOpenBukRepositoryAdapter } from "../../booking/infrastructure/adapters/prisma-openbuk-repository.adapter";
import { PrismaExtKvAdapter, PrismaUnitOfWork } from "@corely/data";
import { studioFixture } from "../../booking/__tests__/openbuk-fixtures";
describe.skipIf(!absenceTestsEnabled)(
  "Persisted absence lifecycle and neutral Booking effects",
  () => {
    const fixture = absenceTestFixture();
    let { prisma, f, now, staffId, storage, base, get, post, fields, create, grant, upload } =
      fixture.current;
    beforeEach(() => {
      ({ prisma, f, now, staffId, storage, base, get, post, fields, create, grant, upload } =
        fixture.current);
    });
    it("persists private revisions separately and allowlists neutral HTTP, directory, audit and events", async () => {
      const absence = await create();
      expect((await get()).body.items).toEqual([absence]);
      const records = await prisma.extKv.findMany({
        where: {
          tenantId: f.tenantA,
          moduleId: "people",
          scope: `workspace:${f.workspaceA}:absences`,
        },
      });
      expect(JSON.stringify(records)).toContain("synthetic-private-reason");
      expect((await get(base(), "staff")).status).toBe(403);
      const neutral = await get(
        `/people/staff/${staffId}/unavailability?from=2026-11-09T00:00:00Z&to=2026-11-10T00:00:00Z`,
        "staff"
      );
      expect(neutral.status).toBe(200);
      expect(neutral.headers["cache-control"]).toBe("private, no-store");
      expect(neutral.body.items).toEqual([
        expect.objectContaining({
          absenceId: absence.id,
          startAt: "2026-11-09T09:00:00.000Z",
          endAt: "2026-11-09T10:00:00.000Z",
          version: 1,
          status: "unavailable",
        }),
      ]);
      const projections = [
        neutral.body,
        (await get(`/people/staff/${staffId}`, "staff")).body,
        await f.availability.detail(staffId, f.ctx),
        await prisma.outboxEvent.findMany({
          where: { tenantId: f.tenantA, eventType: "people.absence.changed" },
        }),
        await prisma.auditLog.findMany({ where: { tenantId: f.tenantA, entityId: absence.id } }),
      ];
      expect(JSON.stringify(projections)).not.toMatch(
        /synthetic-private|reason|notes|documentId|filename|base64/
      );
      expect((await get(base())).headers["cache-control"]).toBe("private, no-store");
    });
    it("validates ranges, strict selectors, full days, overlapping creation/correction and touching endpoints", async () => {
      expect((await post(base(), { ...fields(), tenantId: f.tenantB })).status).toBe(400);
      expect(
        (await post(base(), fields("2026-11-09T10:00:00Z", "2026-11-09T09:00:00Z"))).status
      ).toBe(400);
      expect(
        (await post(base(), fields("2026-11-07T09:00:00Z", "2026-11-07T10:00:00Z"))).status
      ).toBe(400);
      const first = await create();
      expect((await post(base(), fields())).status).toBe(409);
      const second = await create(fields("2026-11-09T10:00:00Z", "2026-11-09T11:00:00Z"));
      const corrected = await request(f.app.getHttpServer())
        .patch(`${base()}/${second.id}`)
        .set("Authorization", "Bearer manager")
        .set("x-workspace-id", f.workspaceA)
        .set("X-Idempotency-Key", randomUUID())
        .send({ ...fields(), version: 1 });
      expect(corrected.status).toBe(409);
      const full = await post(base(), {
        reason: "synthetic-private-reason",
        range: {
          kind: "full-day",
          timezone: "Europe/Berlin",
          startDate: "2026-11-16",
          endDate: "2026-11-17",
        },
      });
      expect(full.status).toBe(201);
      expect(full.body.revisions[0]).toMatchObject({
        startAt: "2026-11-15T23:00:00.000Z",
        endAt: "2026-11-16T23:00:00.000Z",
      });
      expect(first.revisions).toHaveLength(1);
    });
    it("scopes actual records to two tenants/multiple workspaces and denies guessed subjects", async () => {
      const absence = await create();
      expect((await get(base(), "manager", f.workspaceA2)).status).toBe(404);
      expect((await get(base(), "outsider", f.workspaceB)).status).toBe(404);
      expect((await get(base(), "outsider", f.workspaceA)).status).toBe(403);
      expect(
        (
          await post(
            `${base()}/${absence.id}/cancel`,
            { version: 1 },
            randomUUID(),
            "manager",
            f.workspaceA2
          )
        ).status
      ).toBe(404);
      const other = await f.usecase.command(
        "create",
        null,
        { displayName: "Other subject" },
        randomUUID(),
        f.ctx
      );
      expect(
        (await get(`/people/staff/${other.id}/absences/${absence.id}/attachments`)).status
      ).toBe(404);
      await expect(
        f.absenceUseCase.list(staffId, { ...f.ctx, workspaceId: undefined })
      ).rejects.toThrow("Workspace membership");
    });
    it("replays commands once, rejects key reuse and races overlapping writes under the People lock", async () => {
      const key = randomUUID();
      const first = await post(base(), fields(), key),
        replay = await post(base(), fields(), key);
      expect(first.status).toBe(201);
      expect(replay.body.id).toBe(first.body.id);
      expect((await post(base(), { ...fields(), reason: "different" }, key)).status).toBe(409);
      expect(
        await prisma.outboxEvent.count({
          where: { tenantId: f.tenantA, eventType: "people.absence.changed" },
        })
      ).toBe(1);
      const raced = await Promise.all([
        post(base(), fields("2026-11-16T09:00:00Z", "2026-11-16T10:00:00Z")),
        post(base(), fields("2026-11-16T09:30:00Z", "2026-11-16T10:30:00Z")),
      ]);
      expect(raced.map((r) => r.status).sort()).toEqual([201, 409]);
      const cancellations = await Promise.all([
        post(`${base()}/${first.body.id}/cancel`, { version: 1 }),
        post(`${base()}/${first.body.id}/cancel`, { version: 1 }),
      ]);
      expect(cancellations.map((r) => r.status).sort()).toEqual([201, 409]);
    });
    it("preserves elapsed blocks, immutable revisions and future availability after correction/cancellation", async () => {
      const absence = await create(fields("2026-11-09T08:00:00Z", "2026-11-09T12:00:00Z"));
      const scope = { tenantId: f.tenantA, workspaceId: f.workspaceA };
      await expect(
        f.constraint.assertAvailable(
          scope,
          f.resource.id,
          new Date("2026-11-09T09:00:00Z"),
          new Date("2026-11-09T10:00:00Z")
        )
      ).rejects.toThrow("StaffUnavailable");
      now = new Date("2026-11-09T10:00:00Z");
      fixture.setClock(now);
      const corrected = await f.absenceUseCase.command(
        "correct",
        staffId,
        absence.id,
        { ...fields("2026-11-09T11:00:00Z", "2026-11-09T12:00:00Z"), version: 1 },
        randomUUID(),
        f.ctx
      );
      expect(corrected.revisions[0]).toEqual(absence.revisions[0]);
      await expect(
        f.constraint.assertAvailable(
          scope,
          f.resource.id,
          new Date("2026-11-09T09:00:00Z"),
          new Date("2026-11-09T10:00:00Z")
        )
      ).rejects.toThrow("StaffUnavailable");
      await f.constraint.assertAvailable(
        scope,
        f.resource.id,
        new Date("2026-11-09T10:00:00Z"),
        new Date("2026-11-09T11:00:00Z")
      );
      const cancelled = await f.absenceUseCase.command(
        "cancel",
        staffId,
        absence.id,
        { version: 2 },
        randomUUID(),
        f.ctx
      );
      expect(cancelled.revisions).toHaveLength(3);
      expect(cancelled.revisions[1]).toEqual(corrected.revisions[1]);
      await f.constraint.assertAvailable(
        scope,
        f.resource.id,
        new Date("2026-11-09T11:00:00Z"),
        new Date("2026-11-09T12:00:00Z")
      );
      await expect(
        f.absenceUseCase.command(
          "correct",
          staffId,
          absence.id,
          { ...fields(), version: 3 },
          randomUUID(),
          f.ctx
        )
      ).rejects.toThrow("Absence changed");
    });
    it("reserves capacity for cancellation when active revision history reaches its limit", async () => {
      const record = StaffAbsenceSchema.parse(await create());
      const first = record.revisions[0];
      record.revisions = Array.from({ length: 255 }, (_, index) => ({
        ...first,
        version: index + 1,
      }));
      await f.repo.transaction({ tenantId: f.tenantA, workspaceId: f.workspaceA }, (tx) =>
        f.absences.save({ tenantId: f.tenantA, workspaceId: f.workspaceA }, record, tx)
      );
      await expect(
        f.absenceUseCase.command(
          "correct",
          staffId,
          record.id,
          { ...fields(), version: 255 },
          randomUUID(),
          f.ctx
        )
      ).rejects.toThrow("Absence history limit");
      const cancelled = await f.absenceUseCase.command(
        "cancel",
        staffId,
        record.id,
        { version: 255 },
        randomUUID(),
        f.ctx
      );
      expect(cancelled.revisions).toHaveLength(256);
      expect(cancelled.revisions[255].status).toBe("cancelled");
      expect(
        (
          await f.absenceUseCase.neutral(
            staffId,
            { from: "2026-11-09T00:00:00Z", to: "2026-11-10T00:00:00Z" },
            f.ctx
          )
        ).items
      ).toEqual([]);
    });
    it("rolls back absence, replay, audit and event together on outbox or audit failure", async () => {
      const failing = new StaffAbsenceUseCase(
        f.repo,
        f.absences,
        f.permissions,
        f.platformEntitlements,
        f.booking,
        f.documents,
        f.audit,
        {
          enqueue: async () => {
            throw new Error("synthetic outbox failure");
          },
        },
        { now: () => now }
      );
      const key = randomUUID();
      const before = await prisma.auditLog.count({ where: { tenantId: f.tenantA } });
      await expect(failing.command("record", staffId, null, fields(), key, f.ctx)).rejects.toThrow(
        "synthetic outbox"
      );
      expect((await f.absenceUseCase.list(staffId, f.ctx)).items).toEqual([]);
      expect(await prisma.auditLog.count({ where: { tenantId: f.tenantA } })).toBe(before);
      expect(
        await prisma.extKv.count({
          where: { tenantId: f.tenantA, scope: `workspace:${f.workspaceA}:absence-commands` },
        })
      ).toBe(0);
      expect((await post(base(), fields(), key)).status).toBe(201);
      const failingAudit = new StaffAbsenceUseCase(
        f.repo,
        f.absences,
        f.permissions,
        f.platformEntitlements,
        f.booking,
        f.documents,
        {
          log: async () => {
            throw new Error("synthetic audit failure");
          },
        },
        f.outbox,
        { now: () => now }
      );
      await expect(
        failingAudit.command(
          "record",
          staffId,
          null,
          fields("2026-11-16T09:00:00Z", "2026-11-16T10:00:00Z"),
          randomUUID(),
          f.ctx
        )
      ).rejects.toThrow("synthetic audit");
      expect((await f.absenceUseCase.list(staffId, f.ctx)).items).toHaveLength(1);
    });
    it("constrains public slots and new writes, reports committed impacts, and never changes customer appointments", async () => {
      const openbuk = new OpenBukStudioUseCase(
        new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma)),
        new PrismaUnitOfWork(prisma),
        f.audit,
        f.outbox,
        { now: () => now },
        { execute: async () => ({ slug: "test-studio", name: "Studio" }) },
        { publish: async () => {} },
        f.constraint
      );
      const {
        serviceId: unusedService,
        staffId: unusedStaff,
        slug: unusedSlug,
        ...setup
      } = studioFixture();
      const studio = (await openbuk.configure(setup, f.ctx)).studio;
      const profile = await f.usecase.managementDetail(staffId, f.ctx);
      await f.usecase.command(
        "update",
        staffId,
        { ...profileFields(profile), resourceId: studio.staffId, version: profile.version },
        randomUUID(),
        f.ctx
      );
      const publicCtx = {
        ...f.ctx,
        userId: undefined,
        metadata: {
          public: {
            workspaceSlug: "test-studio",
            resolutionMethod: "path",
            publicEnabled: true,
            publicModules: { booking: true },
          },
        },
      };
      const bookingInput = {
        serviceId: studio.serviceId,
        staffId: studio.staffId,
        startAt: "2026-11-09T09:00:00.000Z",
        customer: { name: "Synthetic visitor", email: "visitor@example.invalid" },
        consentAccepted: true,
      };
      await openbuk.book(bookingInput, randomUUID(), publicCtx);
      const before = await prisma.booking.findMany({ where: { tenantId: f.tenantA } });
      const absence = await create(fields("2026-11-09T08:00:00Z", "2026-11-09T12:00:00Z"));
      const impacts = await f.availability.detail(staffId, f.ctx);
      expect(impacts.affectedCommitments.map((c) => c.id)).toContain(before[0].id);
      expect(
        (await openbuk.availability("2026-11-09", publicCtx)).slots.every(
          (slot) => slot.startAt >= "2026-11-09T12:00:00.000Z"
        )
      ).toBe(true);
      await expect(
        openbuk.book(
          { ...bookingInput, startAt: "2026-11-09T10:00:00.000Z" },
          randomUUID(),
          publicCtx
        )
      ).rejects.toThrow("SlotUnavailable");
      expect(await prisma.booking.findMany({ where: { tenantId: f.tenantA } })).toEqual(before);
      await f.absenceUseCase.command(
        "cancel",
        staffId,
        absence.id,
        { version: 1 },
        randomUUID(),
        f.ctx
      );
      expect(
        (await openbuk.availability("2026-11-09", publicCtx)).slots.some(
          (slot) => slot.startAt === "2026-11-09T10:00:00.000Z"
        )
      ).toBe(true);
      expect(await prisma.booking.findMany({ where: { tenantId: f.tenantA } })).toEqual(before);
    });
    it("serializes absence publication with Booking commits: reject the slot or report its impact", async () => {
      const openbuk = new OpenBukStudioUseCase(
        new PrismaOpenBukRepositoryAdapter(prisma, new PrismaExtKvAdapter(prisma)),
        new PrismaUnitOfWork(prisma),
        f.audit,
        f.outbox,
        { now: () => now },
        { execute: async () => ({ slug: "test-studio", name: "Studio" }) },
        { publish: async () => {} },
        f.constraint
      );
      const {
        serviceId: unusedService,
        staffId: unusedStaff,
        slug: unusedSlug,
        ...setup
      } = studioFixture();
      const studio = (await openbuk.configure(setup, f.ctx)).studio;
      const profile = await f.usecase.managementDetail(staffId, f.ctx);
      await f.usecase.command(
        "update",
        staffId,
        { ...profileFields(profile), resourceId: studio.staffId, version: profile.version },
        randomUUID(),
        f.ctx
      );
      const publicCtx = {
        ...f.ctx,
        userId: undefined,
        metadata: {
          public: {
            workspaceSlug: "test-studio",
            resolutionMethod: "path",
            publicEnabled: true,
            publicModules: { booking: true },
          },
        },
      };
      const results = await Promise.allSettled([
        create(fields("2026-11-09T08:00:00Z", "2026-11-09T12:00:00Z")),
        openbuk.book(
          {
            serviceId: studio.serviceId,
            staffId: studio.staffId,
            startAt: "2026-11-09T09:00:00.000Z",
            customer: { name: "Synthetic race", email: "race@example.invalid" },
            consentAccepted: true,
          },
          randomUUID(),
          publicCtx
        ),
      ]);
      expect(results[0].status).toBe("fulfilled");
      const bookings = await prisma.booking.findMany({ where: { tenantId: f.tenantA } });
      if (results[1].status === "fulfilled")
        expect(
          (await f.availability.detail(staffId, f.ctx)).affectedCommitments.map((c) => c.id)
        ).toContain(bookings[0].id);
      else {
        expect(bookings).toEqual([]);
        expect(String(results[1].reason)).toContain("SlotUnavailable");
      }
    });
  }
);
function profileFields(profile: {
  displayName: string;
  jobTitle: string | null;
  team: string | null;
  location: string | null;
  managerStaffId: string | null;
  accountId: string | null;
  partyId: string | null;
  resourceId: string | null;
}) {
  return {
    displayName: profile.displayName,
    jobTitle: profile.jobTitle,
    team: profile.team,
    location: profile.location,
    managerStaffId: profile.managerStaffId,
    accountId: profile.accountId,
    partyId: profile.partyId,
    resourceId: profile.resourceId,
  };
}
