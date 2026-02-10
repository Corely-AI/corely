import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { PartyAggregate } from "../../domain/party.aggregate";
import type { PartyRepoPort } from "../ports/party-repository.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import { type LinkGuardianToStudentUseCase } from "./student-guardians/link-guardian-to-student.usecase";

export interface CreateTutoringLeadInput {
  submissionId: string;
  formId: string;
  payload: Record<string, any>;
}

export interface CreateTutoringLeadOutput {
  guardianId: string;
  guardianName: string;
  studentId?: string;
  studentName?: string;
}

export class CreateTutoringLeadUseCase extends BaseUseCase<
  CreateTutoringLeadInput,
  CreateTutoringLeadOutput
> {
  constructor(
    private readonly useCaseDeps: {
      logger: LoggerPort;
      partyRepo: PartyRepoPort;
      idGenerator: IdGeneratorPort;
      clock: ClockPort;
      audit: AuditPort;
      linkGuardianToStudent: LinkGuardianToStudentUseCase;
    }
  ) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: CreateTutoringLeadInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateTutoringLeadOutput, UseCaseError>> {
    const { tenantId } = ctx;
    if (!tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const { payload } = input;
    const parentEmail = payload.parentEmail || payload.email;
    const parentFirstName = payload.parentFirstName || payload.firstName;
    const parentLastName = payload.parentLastName || payload.lastName;
    const studentFirstName = payload.studentFirstName;
    const studentLastName = payload.studentLastName;

    if (!parentEmail) {
      return err(new ValidationError("Parent email is required for tutoring lead"));
    }

    // 1. Create/Update Guardian
    let guardian = await this.useCaseDeps.partyRepo.findPartyByEmail(tenantId, parentEmail);
    const now = this.useCaseDeps.clock.now();

    if (!guardian) {
      guardian = PartyAggregate.createParty({
        id: this.useCaseDeps.idGenerator.newId(),
        tenantId,
        displayName: `${parentFirstName} ${parentLastName}`.trim() || parentEmail,
        roles: ["GUARDIAN"],
        email: parentEmail,
        createdAt: now,
        generateId: () => this.useCaseDeps.idGenerator.newId(),
        lifecycleStatus: "LEAD",
      });
      await this.useCaseDeps.partyRepo.createCustomer(tenantId, guardian);
    } else {
      guardian.addRole("GUARDIAN", now);
      await this.useCaseDeps.partyRepo.updateCustomer(tenantId, guardian);
    }

    // 2. Create/Update Student (if provided)
    let studentId: string | undefined = undefined;
    if (studentFirstName) {
      // For student, we might not have an email, so we might create a new one or search by name
      // For now, let's create a new one for each submission if not easily identifiable
      const student = PartyAggregate.createParty({
        id: this.useCaseDeps.idGenerator.newId(),
        tenantId,
        displayName: `${studentFirstName} ${studentLastName || ""}`.trim(),
        roles: ["STUDENT"],
        createdAt: now,
        generateId: () => this.useCaseDeps.idGenerator.newId(),
        lifecycleStatus: "LEAD",
      });
      await this.useCaseDeps.partyRepo.createCustomer(tenantId, student);
      studentId = student.id;

      // 3. Link Guardian to Student
      await this.useCaseDeps.linkGuardianToStudent.execute(
        {
          studentId: student.id,
          guardianClientId: guardian.id,
          isPrimaryPayer: true,
          isPrimaryContact: true,
        },
        ctx
      );
    }

    await this.useCaseDeps.audit.log({
      tenantId,
      userId: "system",
      action: "party.lead.created",
      entityType: "Party",
      entityId: guardian.id,
      metadata: {
        submissionId: input.submissionId,
        formId: input.formId,
        studentId,
      },
    });

    return ok({
      guardianId: guardian.id,
      guardianName: guardian.displayName,
      studentId,
      studentName: studentFirstName
        ? `${studentFirstName} ${studentLastName || ""}`.trim()
        : undefined,
    });
  }
}
