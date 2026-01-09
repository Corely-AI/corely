/**
 * Password Value Object
 * Encapsulates password validation rules
 * Note: Actual hashing is handled by PasswordHasher port
 */
export class Password {
  private constructor(private readonly value: string) {}

  static create(password: string): Password {
    Password.validate(password);
    return new Password(password);
  }

  private static validate(password: string): void {
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return "***";
  }
}
