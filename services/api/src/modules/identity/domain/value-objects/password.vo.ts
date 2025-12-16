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
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Additional complexity checks
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      throw new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    }
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return '***';
  }
}
