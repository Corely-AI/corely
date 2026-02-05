/**
 * Auth DTOs
 */

export class SignUpDto {
  email: string;
  password: string;
  tenantName?: string;
  userName?: string;
  idempotencyKey?: string;
}

export class SignInDto {
  email: string;
  password: string;
  tenantId?: string | null;
  idempotencyKey?: string;
}

export class RefreshTokenDto {
  refreshToken: string;
}

export class SwitchTenantDto {
  tenantId: string | null;
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
  tenantId: string | null;
  memberships?: Array<{
    tenantId: string | null;
    tenantName: string | null;
    roleId: string;
  }>;
}

export class CurrentUserResponseDto {
  userId: string;
  email: string;
  name: string | null;
  activeTenantId: string | null;
  memberships: Array<{
    tenantId: string | null;
    tenantName: string | null;
    roleId: string;
  }>;
}

export class SwitchTenantResponseDto {
  accessToken: string;
  refreshToken: string;
  tenantId: string | null;
}

export class MessageResponseDto {
  message: string;
}
