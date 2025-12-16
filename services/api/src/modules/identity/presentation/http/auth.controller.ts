import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Inject,
  BadRequestException,
  Headers
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

// Use cases
import { SignUpUseCase } from '../../application/use-cases/sign-up.usecase';
import { SignInUseCase } from '../../application/use-cases/sign-in.usecase';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.usecase';
import { SignOutUseCase } from '../../application/use-cases/sign-out.usecase';
import { SwitchTenantUseCase } from '../../application/use-cases/switch-tenant.usecase';

// Ports
import { IUserRepository, USER_REPOSITORY_TOKEN } from '../../application/ports/user.repo.port';
import { ITenantRepository, TENANT_REPOSITORY_TOKEN } from '../../application/ports/tenant.repo.port';
import { IMembershipRepository, MEMBERSHIP_REPOSITORY_TOKEN } from '../../application/ports/membership.repo.port';
import { IPasswordHasher, PASSWORD_HASHER_TOKEN } from '../../application/ports/password-hasher.port';
import { ITokenService, TOKEN_SERVICE_TOKEN } from '../../application/ports/token-service.port';
import { IRefreshTokenRepository, REFRESH_TOKEN_REPOSITORY_TOKEN } from '../../application/ports/refresh-token.repo.port';
import { IOutboxPort, OUTBOX_PORT_TOKEN } from '../../application/ports/outbox.port';
import { IAuditPort, AUDIT_PORT_TOKEN } from '../../application/ports/audit.port';
import { IClock, CLOCK_TOKEN } from '../../application/ports/clock.port';
import { IRoleRepository, ROLE_REPOSITORY_TOKEN } from '../../application/ports/role.repo.port';

// DTOs
import {
  SignUpDto,
  SignInDto,
  RefreshTokenDto,
  SwitchTenantDto,
  SignOutDto,
  SignUpResponseDto,
  SignInResponseDto,
  CurrentUserResponseDto,
  SwitchTenantResponseDto,
  MessageResponseDto
} from './auth.dto';

// Guards and decorators
import { AuthGuard } from './auth.guard';
import { CurrentUser, CurrentUserId, CurrentTenantId } from './current-user.decorator';

/**
 * Auth Controller
 * Public and authenticated endpoints for authentication
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private signUpUseCase: SignUpUseCase;
  private signInUseCase: SignInUseCase;
  private refreshTokenUseCase: RefreshTokenUseCase;
  private signOutUseCase: SignOutUseCase;
  private switchTenantUseCase: SwitchTenantUseCase;

  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: IUserRepository,
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: ITenantRepository,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly membershipRepo: IMembershipRepository,
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: IRoleRepository,
    @Inject(PASSWORD_HASHER_TOKEN) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN) private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject(OUTBOX_PORT_TOKEN) private readonly outbox: IOutboxPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: IAuditPort,
    @Inject(CLOCK_TOKEN) private readonly clock: IClock
  ) {
    this.initializeUseCases();
  }

  private initializeUseCases(): void {
    this.signUpUseCase = new SignUpUseCase(
      this.userRepo,
      this.tenantRepo,
      this.membershipRepo,
      this.roleRepo,
      this.passwordHasher,
      this.tokenService,
      this.outbox,
      this.audit,
      this.clock
    );

    this.signInUseCase = new SignInUseCase(
      this.userRepo,
      this.membershipRepo,
      this.passwordHasher,
      this.tokenService,
      this.refreshTokenRepo,
      this.outbox,
      this.audit,
      this.clock
    );

    this.refreshTokenUseCase = new RefreshTokenUseCase(
      this.refreshTokenRepo,
      this.tokenService,
      this.userRepo,
      this.audit,
      this.clock
    );

    this.signOutUseCase = new SignOutUseCase(
      this.refreshTokenRepo,
      this.outbox,
      this.audit
    );

    this.switchTenantUseCase = new SwitchTenantUseCase(
      this.membershipRepo,
      this.tokenService,
      this.userRepo,
      this.refreshTokenRepo,
      this.outbox,
      this.audit,
      this.clock
    );
  }

  /**
   * POST /auth/signup
   * Create new user and tenant
   */
  @Post('signup')
  async signup(
    @Body() input: SignUpDto,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ): Promise<SignUpResponseDto> {
    if (!input.email || !input.password || !input.tenantName) {
      throw new BadRequestException('Missing required fields');
    }

    const result = await this.signUpUseCase.execute(input);

    return {
      userId: result.userId,
      email: result.email,
      tenantId: result.tenantId,
      tenantName: result.tenantName,
      membershipId: result.membershipId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    };
  }

  /**
   * POST /auth/login
   */
  @Post('login')
  async login(@Body() input: SignInDto): Promise<SignInResponseDto> {
    if (!input.email || !input.password) {
      throw new BadRequestException('Missing required fields');
    }

    const result = await this.signInUseCase.execute(input);

    return {
      userId: result.userId,
      email: result.email,
      tenantId: result.tenantId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      memberships: result.memberships
    };
  }

  /**
   * POST /auth/refresh
   */
  @Post('refresh')
  async refresh(@Body() input: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    if (!input.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    return this.refreshTokenUseCase.execute(input);
  }

  /**
   * POST /auth/logout
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async logout(
    @CurrentUserId() userId: string,
    @CurrentTenantId() tenantId: string,
    @Body() input: SignOutDto
  ): Promise<MessageResponseDto> {
    if (!userId || !tenantId) {
      throw new BadRequestException('User or tenant not found');
    }

    await this.signOutUseCase.execute({
      userId,
      tenantId,
      refreshTokenHash: input.refreshToken
    });

    return { message: 'Successfully logged out' };
  }

  /**
   * GET /auth/me
   * Get current user info
   */
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async getMe(
    @CurrentUserId() userId: string,
    @CurrentTenantId() tenantId: string
  ): Promise<CurrentUserResponseDto> {
    if (!userId) {
      throw new BadRequestException('User not found');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Get all memberships
    const memberships = await this.membershipRepo.findByUserId(userId);

    const membershipDtos = await Promise.all(
      memberships.map(async (m) => {
        const tenant = await this.tenantRepo.findById(m.getTenantId());
        return {
          tenantId: m.getTenantId(),
          tenantName: tenant?.getName() || 'Unknown',
          roleId: m.getRoleId()
        };
      })
    );

    return {
      userId: user.getId(),
      email: user.getEmail().getValue(),
      name: user.getName(),
      activeTenantId: tenantId,
      memberships: membershipDtos
    };
  }

  /**
   * POST /auth/switch-tenant
   */
  @Post('switch-tenant')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async switchTenant(
    @CurrentUserId() userId: string,
    @CurrentTenantId() fromTenantId: string,
    @Body() input: SwitchTenantDto
  ): Promise<SwitchTenantResponseDto> {
    if (!userId || !fromTenantId || !input.tenantId) {
      throw new BadRequestException('Missing required fields');
    }

    const result = await this.switchTenantUseCase.execute({
      userId,
      fromTenantId,
      toTenantId: input.tenantId
    });

    return result;
  }
}
