import { User } from '../../domain/entities/user.entity';

/**
 * User Repository Port (Interface)
 * Abstracts data persistence for User entity
 */
export interface IUserRepository {
  /**
   * Create a new user
   */
  create(user: User): Promise<User>;

  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Check if user with email exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Update user (status, name, etc.)
   */
  update(user: User): Promise<User>;
}

export const USER_REPOSITORY_TOKEN = Symbol('USER_REPOSITORY');
