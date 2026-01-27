import { BadRequestException } from "@nestjs/common";

export class TenantMismatchError extends BadRequestException {
  constructor(expectedOrMessage: string, received?: string) {
    // If received is undefined, treat expectedOrMessage as a custom message
    if (received === undefined) {
      super(expectedOrMessage);
    } else {
      super(`TENANT_MISMATCH: expected ${expectedOrMessage}, received ${received ?? "none"}`);
    }
  }
}

export class TenantNotResolvedError extends BadRequestException {
  constructor(message = "TENANT_NOT_RESOLVED") {
    super(message);
  }
}
