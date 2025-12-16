import { IMembershipRepository } from '../ports/membership.repo.port';
import { ITokenService } from '../ports/token-service.port';
import { IUserRepository } from '../ports/user.repo.port';
import { IRefreshTokenRepository } from '../ports/refresh-token.repo.port';
import { IOutboxPort } from '../ports/outbox.port';
import { IAuditPort } from '../ports/audit.port';
import { IClock } from '../ports/clock.port';
import { TenantSwitchedEvent } from '../../domain/events/identity.events';
import { randomUUID } from 'crypto';

export interface SwitchTenantInput {
  userId: string;
  fromTenantId: string;
  toTenantId: string;
}

export interface SwitchTenantOutput {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
}

/**
 * Switch Tenant Use Case
 * Allows user to switch active tenant
 */
export class SwitchTenantUseCase {
  constructor(
    private readonly membershipRepo: IMembershipRepository,
    private readonly tokenService: ITokenService,
    private readonly userRepo: IUserRepository,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly outbox: IOutboxPort,
    private readonly audit: IAuditPort,
    private readonly clock: IClock
  ) {}

  async execute(input: SwitchTenantInput): Promise<SwitchTenantOutput> {
    // 1. Verify user has membership in target tenant
    const membership = await this.membershipRepo.findByTenantAndUser(
      input.toTenantId,
      input.userId
    );

    if (!membership) {
      throw new Error('User is not a member of the target tenant');
    }

    // 2. Get user info
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 3. Generate new tokens for new tenant
    const accessToken = this.tokenService.generateAccessToken({
      userId: input.userId,
      email: user.getEmail().getValue(),
      tenantId: input.toTenantId
    });

    const refreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();

    // 4. Store new refresh token
    const refreshTokenId = randomUUID();
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);

    await this.refreshTokenRepo.create({
      id: refreshTokenId,
      userId: input.userId,
      tenantId: input.toTenantId,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(this.clock.nowMs() + refreshTokenExpiresInMs)
    });

    // 5. Emit event
    const event = new TenantSwitchedEvent(
      input.userId,
      input.fromTenantId,
      input.toTenantId
    );
    await this.outbox.enqueue({
      tenantId: input.toTenantId,
      eventType: event.eventType,
      payloadJson: JSON.stringify(event)
    });

    // 6. Audit log
    await this.audit.write({
      tenantId: input.toTenantId,
      actorUserId: input.userId,
      action: 'user.tenant_switched',
      targetType: 'Tenant',
      targetId: input.toTenantId,
      metadataJson: JSON.stringify({ fromTenantId: input.fromTenantId })
    });

    return {
      accessToken,
      refreshToken,
      tenantId: input.toTenantId
    };
  }

  private async hashRefreshToken(token: string): Promise<string> {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }
}
