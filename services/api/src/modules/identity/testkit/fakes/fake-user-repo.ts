import { type UserRepositoryPort } from "../../application/ports/user-repository.port";
import { type User } from "../../domain/entities/user.entity";

export class FakeUserRepository implements UserRepositoryPort {
  users: User[] = [];

  async create(user: User): Promise<User> {
    this.users.push(user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u.getId() === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.getEmail().getValue() === email) ?? null;
  }

  async emailExists(email: string): Promise<boolean> {
    return this.users.some((u) => u.getEmail().getValue() === email);
  }

  async update(user: User): Promise<User> {
    this.users = this.users.map((u) => (u.getId() === user.getId() ? user : u));
    return user;
  }
}
