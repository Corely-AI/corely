import { Email } from "../value-objects/email.vo";

/**
 * User Entity
 * Represents a user in the system
 * Framework-free domain logic
 */
export class User {
  private constructor(
    private readonly id: string,
    private readonly email: Email,
    private readonly passwordHash: string,
    private readonly name: string | null,
    private readonly status: string,
    private readonly createdAt: Date,
    private readonly partyId: string | null = null
  ) {}

  static create(
    id: string,
    email: Email,
    passwordHash: string,
    name: string | null = null,
    status: string = "ACTIVE",
    createdAt: Date = new Date(),
    partyId: string | null = null
  ): User {
    return new User(id, email, passwordHash, name, status, createdAt, partyId);
  }

  static restore(data: any): User {
    return new User(
      data.id,
      Email.create(data.email),
      data.passwordHash,
      data.name,
      data.status,
      data.createdAt,
      data.partyId ?? null
    );
  }

  getId(): string {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getName(): string | null {
    return this.name;
  }

  getStatus(): string {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getPartyId(): string | null {
    return this.partyId;
  }

  isActive(): boolean {
    return this.status === "ACTIVE";
  }
}
