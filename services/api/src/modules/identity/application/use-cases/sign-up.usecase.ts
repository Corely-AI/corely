import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { User } from '../../domain/entities/user.entity';
import { Tenant } from '../../domain/entities/tenant.entity';
import { Membership } from '../../domain/entities/membership.entity';
import { UserCreatedEvent, TenantCreatedEvent, MembershipCreatedEvent } from '../../domain/events/identity.events';
import { IUserRepository } from '../ports/user.repo.port';
import { ITenantRepository } from '../ports/tenant.repo.port';
import { IMembershipRepository } from '../ports/membership.repo.port';
import { IPasswordHasher } from '../ports/password-hasher.port';
import { ITokenService } from '../ports/token-service.port';
import { IOutboxPort } from '../ports/outbox.port';
import { IAuditPort } from '../ports/audit.port';
import { IClock } from '../ports/clock.port';
import { IRoleRepository } from '../ports/role.repo.port';
import { randomUUID } from 'crypto';

export interface SignUpInput {
  email: string;
  password: string;
  tenantName: string;
  userName?: string;
}

export interface SignUpOutput {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Sign Up Use Case
 * Idempotent by idempotency key in controller
 */
export class SignUpUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tenantRepo: ITenantRepository,
    private readonly membershipRepo: IMembershipRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly outbox: IOutboxPort,
    private readonly audit: IAuditPort,
    private readonly clock: IClock
  ) {}

  async execute(input: SignUpInput): Promise<SignUpOutput> {
    // 1. Validate inputs
    const email = Email.create(input.email);
    const password = Password.create(input.password);

    // 2. Check if user already exists
    const existingUser = await this.userRepo.findByEmail(email.getValue());
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // 3. Create tenant
    const tenantId = randomUUID();
    const slug = this.generateSlug(input.tenantName);

    const existingTenant = await this.tenantRepo.findBySlug(slug);
    if (existingTenant) {
      throw new Error('Tenant with this slug already exists');
    }

    const tenant = Tenant.create(tenantId, input.tenantName, slug);
    await this.tenantRepo.create(tenant);

    // 4. Create user
    const userId = randomUUID();
    const passwordHash = await this.passwordHasher.hash(password.getValue());
    const user = User.create(userId, email, passwordHash, input.userName || null);
    await this.userRepo.create(user);

    // 5. Create owner role for tenant (if not exists)
    const ownerRole = await this.roleRepo.findBySystemKey(tenantId, 'OWNER');
    let ownerRoleId = ownerRole?.id;

    if (!ownerRole) {
      ownerRoleId = randomUUID();
      await this.roleRepo.create({
        id: ownerRoleId,
        tenantId,
        name: 'Owner',
        systemKey: 'OWNER'
      });
    }

    // 6. Create membership (user as OWNER)
    const membershipId = randomUUID();
    const membership = Membership.create(membershipId, tenantId, userId, ownerRoleId!);
    await this.membershipRepo.create(membership);

    // 7. Generate tokens
    const accessToken = this.tokenService.generateAccessToken({
      userId,
      email: email.getValue(),
      tenantId
    });
    const refreshToken = this.tokenService.generateRefreshToken();

    // 8. Emit events to outbox
    const userCreatedEvent = new UserCreatedEvent(userId, email.getValue(), input.userName || null, null);
    await this.outbox.enqueue({
      tenantId,
      eventType: userCreatedEvent.eventType,
      payloadJson: JSON.stringify(userCreatedEvent)
    });

    const tenantCreatedEvent = new TenantCreatedEvent(tenantId, input.tenantName, slug);
    await this.outbox.enqueue({
      tenantId,
      eventType: tenantCreatedEvent.eventType,
      payloadJson: JSON.stringify(tenantCreatedEvent)
    });

    const membershipCreatedEvent = new MembershipCreatedEvent(membershipId, tenantId, userId, ownerRoleId!);
    await this.outbox.enqueue({
      tenantId,
      eventType: membershipCreatedEvent.eventType,
      payloadJson: JSON.stringify(membershipCreatedEvent)
    });

    // 9. Write audit log
    await this.audit.write({
      tenantId,
      actorUserId: userId,
      action: 'user.signup',
      targetType: 'User',
      targetId: userId
    });

    return {
      userId,
      email: email.getValue(),
      tenantId,
      tenantName: input.tenantName,
      membershipId,
      accessToken,
      refreshToken
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }
}
