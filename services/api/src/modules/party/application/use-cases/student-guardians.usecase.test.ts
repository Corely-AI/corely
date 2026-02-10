import { beforeEach, describe, expect, it } from "vitest";
import {
  FakeIdGenerator,
  FixedClock,
  NoopLogger,
  NotFoundError,
  isErr,
  unwrap,
} from "@corely/kernel";
import type {
  EntityLink,
  EntityLinkCreateInput,
  EntityLinkDeleteInput,
  EntityLinkListInput,
  EntityLinkUpdateInput,
  ExtEntityLinkPort,
} from "@corely/data";
import { InMemoryPartyRepo } from "../../testkit/in-memory-party-repo";
import { MockAuditPort } from "../../../../shared/testkit/mocks/mock-audit-port";
import { MockIdempotencyStoragePort } from "../../../../shared/testkit/mocks/mock-idempotency-port";
import { CreateCustomerUseCase } from "./create-customer/create-customer.usecase";
import { GetStudentGuardiansUseCase } from "./student-guardians/get-student-guardians.usecase";
import { LinkGuardianToStudentUseCase } from "./student-guardians/link-guardian-to-student.usecase";

class InMemoryEntityLink implements ExtEntityLinkPort {
  private counter = 0;
  public links: EntityLink[] = [];

  async create(input: EntityLinkCreateInput): Promise<EntityLink> {
    const link: EntityLink = {
      id: `link-${this.counter++}`,
      tenantId: input.tenantId,
      moduleId: input.moduleId,
      fromEntityType: input.fromEntityType,
      fromEntityId: input.fromEntityId,
      toEntityType: input.toEntityType,
      toEntityId: input.toEntityId,
      linkType: input.linkType,
      metadata: input.metadata,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    };
    this.links.push(link);
    return link;
  }

  async update(input: EntityLinkUpdateInput): Promise<EntityLink> {
    const index = this.links.findIndex((link) => this.matches(link, input));
    if (index === -1) {
      throw new Error("Link not found");
    }
    const updated = {
      ...this.links[index],
      metadata: input.metadata,
    };
    this.links[index] = updated;
    return updated;
  }

  async delete(input: EntityLinkDeleteInput): Promise<void> {
    this.links = this.links.filter((link) => !this.matches(link, input));
  }

  async list(input: EntityLinkListInput): Promise<EntityLink[]> {
    return this.links.filter((link) => this.matches(link, input));
  }

  private matches(link: EntityLink, input: EntityLinkListInput): boolean {
    if (link.tenantId !== input.tenantId) {
      return false;
    }
    if (input.moduleId && link.moduleId !== input.moduleId) {
      return false;
    }
    if (input.fromEntityType && link.fromEntityType !== input.fromEntityType) {
      return false;
    }
    if (input.fromEntityId && link.fromEntityId !== input.fromEntityId) {
      return false;
    }
    if (input.toEntityType && link.toEntityType !== input.toEntityType) {
      return false;
    }
    if (input.toEntityId && link.toEntityId !== input.toEntityId) {
      return false;
    }
    if (input.linkType && link.linkType !== input.linkType) {
      return false;
    }
    return true;
  }
}

describe("Party student guardians", () => {
  const ctx = { tenantId: "tenant-1", userId: "user-1" };
  let repo: InMemoryPartyRepo;
  let idGenerator: FakeIdGenerator;
  let clock: FixedClock;
  let entityLink: InMemoryEntityLink;
  let audit: MockAuditPort;
  let idempotency: MockIdempotencyStoragePort;
  let createCustomer: CreateCustomerUseCase;
  let linkGuardian: LinkGuardianToStudentUseCase;
  let listGuardians: GetStudentGuardiansUseCase;

  beforeEach(() => {
    repo = new InMemoryPartyRepo();
    idGenerator = new FakeIdGenerator(["student-1", "guardian-1", "guardian-2"]);
    clock = new FixedClock(new Date("2025-01-01T00:00:00.000Z"));
    entityLink = new InMemoryEntityLink();
    audit = new MockAuditPort();
    idempotency = new MockIdempotencyStoragePort();

    createCustomer = new CreateCustomerUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
      idGenerator,
      clock,
    });

    linkGuardian = new LinkGuardianToStudentUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
      entityLink,
      idempotency,
      audit,
    });

    listGuardians = new GetStudentGuardiansUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
      entityLink,
    });
  });

  it("enforces a single primary payer per student", async () => {
    await createCustomer.execute({ displayName: "Student One", role: "STUDENT" }, ctx);
    await createCustomer.execute({ displayName: "Guardian One", role: "GUARDIAN" }, ctx);
    await createCustomer.execute({ displayName: "Guardian Two", role: "GUARDIAN" }, ctx);

    await linkGuardian.execute(
      { studentId: "student-1", guardianClientId: "guardian-1", isPrimaryPayer: true },
      ctx
    );
    await linkGuardian.execute(
      { studentId: "student-1", guardianClientId: "guardian-2", isPrimaryPayer: true },
      ctx
    );

    const result = unwrap(await listGuardians.execute({ studentId: "student-1" }, ctx));
    const primary = result.guardians.filter((guardian) => guardian.isPrimaryPayer);
    expect(primary).toHaveLength(1);
    expect(primary[0]?.guardian.id).toBe("guardian-2");

    const previous = result.guardians.find((guardian) => guardian.guardian.id === "guardian-1");
    expect(previous?.isPrimaryPayer).toBe(false);
  });

  it("requires the student to have STUDENT role", async () => {
    await createCustomer.execute({ displayName: "Not Student" }, ctx);
    await createCustomer.execute({ displayName: "Guardian", role: "GUARDIAN" }, ctx);

    const result = await linkGuardian.execute(
      { studentId: "student-1", guardianClientId: "guardian-1" },
      ctx
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });

  it("prevents cross-tenant guardian links", async () => {
    await createCustomer.execute({ displayName: "Student", role: "STUDENT" }, ctx);
    await createCustomer.execute(
      { displayName: "Guardian", role: "GUARDIAN" },
      { tenantId: "tenant-2", userId: "user-2" }
    );

    const result = await linkGuardian.execute(
      { studentId: "student-1", guardianClientId: "guardian-1" },
      ctx
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });

  it("is idempotent for repeated link requests", async () => {
    await createCustomer.execute({ displayName: "Student", role: "STUDENT" }, ctx);
    await createCustomer.execute({ displayName: "Guardian", role: "GUARDIAN" }, ctx);

    const input = {
      studentId: "student-1",
      guardianClientId: "guardian-1",
      isPrimaryPayer: true,
      idempotencyKey: "idem-1",
    };

    const first = unwrap(await linkGuardian.execute(input, ctx));
    const second = unwrap(await linkGuardian.execute(input, ctx));

    expect(entityLink.links).toHaveLength(1);
    expect(second.guardians).toEqual(first.guardians);
  });
});
