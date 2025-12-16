import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Controllers
import { AuthController } from './presentation/http/auth.controller';

// Repositories
import { PrismaUserRepository } from './infrastructure/persistence/prisma.user.repo';
import { PrismaTenantRepository } from './infrastructure/persistence/prisma.tenant.repo';
import { PrismaMembershipRepository } from './infrastructure/persistence/prisma.membership.repo';
import { PrismaRefreshTokenRepository } from './infrastructure/persistence/prisma.refresh-token.repo';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma.role.repo';
import { PrismaAuditRepository } from './infrastructure/persistence/prisma.audit.repo';
import { PrismaOutboxAdapter } from './infrastructure/persistence/prisma.outbox.adapter';

// Security
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt.password-hasher';
import { JwtTokenService } from './infrastructure/security/jwt.token-service';

// Ports / Tokens
import { USER_REPOSITORY_TOKEN } from './application/ports/user.repo.port';
import { TENANT_REPOSITORY_TOKEN } from './application/ports/tenant.repo.port';
import { MEMBERSHIP_REPOSITORY_TOKEN } from './application/ports/membership.repo.port';
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from './application/ports/refresh-token.repo.port';
import { ROLE_REPOSITORY_TOKEN } from './application/ports/role.repo.port';
import { PASSWORD_HASHER_TOKEN } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE_TOKEN } from './application/ports/token-service.port';
import { OUTBOX_PORT_TOKEN } from './application/ports/outbox.port';
import { AUDIT_PORT_TOKEN } from './application/ports/audit.port';
import { CLOCK_TOKEN } from './application/ports/clock.port';

// Clock implementation
class SystemClock {
  now(): Date {
    return new Date();
  }

  nowMs(): number {
    return Date.now();
  }
}

@Module({
  controllers: [AuthController],
  providers: [
    // Repositories
    PrismaUserRepository,
    PrismaTenantRepository,
    PrismaMembershipRepository,
    PrismaRefreshTokenRepository,
    PrismaRoleRepository,
    PrismaAuditRepository,
    PrismaOutboxAdapter,

    // Security
    BcryptPasswordHasher,
    JwtTokenService,

    // System
    SystemClock,
    Reflector,

    // Token bindings for DI
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaUserRepository
    },
    {
      provide: TENANT_REPOSITORY_TOKEN,
      useClass: PrismaTenantRepository
    },
    {
      provide: MEMBERSHIP_REPOSITORY_TOKEN,
      useClass: PrismaMembershipRepository
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY_TOKEN,
      useClass: PrismaRefreshTokenRepository
    },
    {
      provide: ROLE_REPOSITORY_TOKEN,
      useClass: PrismaRoleRepository
    },
    {
      provide: PASSWORD_HASHER_TOKEN,
      useClass: BcryptPasswordHasher
    },
    {
      provide: TOKEN_SERVICE_TOKEN,
      useClass: JwtTokenService
    },
    {
      provide: OUTBOX_PORT_TOKEN,
      useClass: PrismaOutboxAdapter
    },
    {
      provide: AUDIT_PORT_TOKEN,
      useClass: PrismaAuditRepository
    },
    {
      provide: CLOCK_TOKEN,
      useClass: SystemClock
    }
  ],
  exports: [
    Reflector,
    USER_REPOSITORY_TOKEN,
    TENANT_REPOSITORY_TOKEN,
    MEMBERSHIP_REPOSITORY_TOKEN,
    REFRESH_TOKEN_REPOSITORY_TOKEN,
    ROLE_REPOSITORY_TOKEN,
    PASSWORD_HASHER_TOKEN,
    TOKEN_SERVICE_TOKEN,
    OUTBOX_PORT_TOKEN,
    AUDIT_PORT_TOKEN,
    CLOCK_TOKEN
  ]
})
export class IdentityModule {}