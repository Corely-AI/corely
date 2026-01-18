import { BadRequestException } from "@nestjs/common";

export class TenantMismatchError extends BadRequestException {
  constructor(expected: string, received?: string) {
    super(`TENANT_MISMATCH: expected ${expected}, received ${received ?? "none"}`);
  }
}

export class TenantNotResolvedError extends BadRequestException {
  constructor(message = "TENANT_NOT_RESOLVED") {
    super(message);
  }
}
