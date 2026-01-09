/**
 * Auth DTOs
 */

export class SignUpDto {
  email: string;
  password: string;
  tenantName: string;
  userName?: string;
  idempotencyKey?: string;
}

export class SignInDto {
  email: string;
  password: string;
  tenantId?: string;
  idempotencyKey?: string;
}

export class RefreshTokenDto {
  refreshToken: string;
}

export class SwitchTenantDto {
  tenantId: string;
}

export class SignOutDto {
  refreshToken?: string;
}

// Response DTOs

export class AuthTokensResponseDto {
  accessToken: string;
  refreshToken: string;
}

export class SignUpResponseDto extends AuthTokensResponseDto {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
}

export class SignInResponseDto extends AuthTokensResponseDto {
  userId: string;
  email: string;
  tenantId: string;
  memberships?: Array<{
    tenantId: string;
    tenantName: string;
    roleId: string;
  }>;
}

export class CurrentUserResponseDto {
  userId: string;
  email: string;
  name: string | null;
  activeTenantId: string;
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    roleId: string;
  }>;
}

export class SwitchTenantResponseDto {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
}

export class MessageResponseDto {
  message: string;
}
