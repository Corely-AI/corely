import { Email } from '../../domain/value-objects/email.vo';
import { UserLoggedInEvent } from '../../domain/events/identity.events';
import { IUserRepository } from '../ports/user.repo.port';
import { IMembershipRepository } from '../ports/membership.repo.port';
import { IPasswordHasher } from '../ports/password-hasher.port';
import { ITokenService } from '../ports/token-service.port';
import { IRefreshTokenRepository } from '../ports/refresh-token.repo.port';
import { IOutboxPort } from '../ports/outbox.port';
import { IAuditPort } from '../ports/audit.port';
import { IClock } from '../ports/clock.port';
import { randomUUID } from 'crypto';

export interface SignInInput {
  email: string;
  password: string;
  tenantId?: string;
}

export interface SignInOutput {
  userId: string;
  email: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  memberships?: Array<{
    tenantId: string;
    tenantName: string;
    roleId: string;
  }>;
}

/**
 * Sign In Use Case
 */
export class SignInUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly membershipRepo: IMembershipRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly outbox: IOutboxPort,
    private readonly audit: IAuditPort,
    private readonly clock: IClock
  ) {}

  async execute(input: SignInInput): Promise<SignInOutput> {
    // 1. Find user by email
    const email = Email.create(input.email);
    const user = await this.userRepo.findByEmail(email.getValue());

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 2. Verify password
    const passwordValid = await this.passwordHasher.verify(
      input.password,
      user.getPasswordHash()
    );

    if (!passwordValid) {
      throw new Error('Invalid email or password');
    }

    // 3. Get user's memberships
    const memberships = await this.membershipRepo.findByUserId(user.getId());

    if (memberships.length === 0) {
      throw new Error('User has no memberships');
    }

    // 4. Determine tenant (from input or first membership)
    let selectedTenantId = input.tenantId;

    if (!selectedTenantId) {
      if (memberships.length > 1) {
        // Return multiple memberships for user to choose
        return {
          userId: user.getId(),
          email: email.getValue(),
          tenantId: '', // Placeholder
          accessToken: '', // Placeholder
          refreshToken: '', // Placeholder
          memberships: memberships.map((m) => ({
            tenantId: m.getTenantId(),
            tenantName: '', // Would need to fetch tenant
            roleId: m.getRoleId()
          }))
        };
      }
      selectedTenantId = memberships[0].getTenantId();
    } else {
      // Verify user has membership in specified tenant
      const hasMembership = memberships.some(
        (m) => m.getTenantId() === selectedTenantId
      );
      if (!hasMembership) {
        throw new Error('User is not a member of the specified tenant');
      }
    }

    // 5. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId: user.getId(),
      email: email.getValue(),
      tenantId: selectedTenantId
    });

    const refreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();

    // 6. Store refresh token
    const refreshTokenId = randomUUID();
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);

    await this.refreshTokenRepo.create({
      id: refreshTokenId,
      userId: user.getId(),
      tenantId: selectedTenantId,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(this.clock.nowMs() + refreshTokenExpiresInMs)
    });

    // 7. Emit event
    const event = new UserLoggedInEvent(
      user.getId(),
      selectedTenantId,
      email.getValue()
    );
    await this.outbox.enqueue({
      tenantId: selectedTenantId,
      eventType: event.eventType,
      payloadJson: JSON.stringify(event)
    });

    // 8. Audit log
    await this.audit.write({
      tenantId: selectedTenantId,
      actorUserId: user.getId(),
      action: 'user.login',
      targetType: 'User',
      targetId: user.getId()
    });

    return {
      userId: user.getId(),
      email: email.getValue(),
      tenantId: selectedTenantId,
      accessToken,
      refreshToken
    };
  }

  private async hashRefreshToken(token: string): Promise<string> {
    // Simple hash - in production use a proper hasher
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
