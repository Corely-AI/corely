import { type PasswordHasherPort } from "../../application/ports/password-hasher.port";

export class MockPasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    return `hashed:${password}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return hash === `hashed:${password}`;
  }
}
