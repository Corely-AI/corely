import type {
  IntegrationAuthMethod,
  IntegrationConnectionDto,
  IntegrationConnectionStatus,
  IntegrationKind,
} from "@corely/contracts";

export interface IntegrationConnectionProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  kind: IntegrationKind;
  authMethod: IntegrationAuthMethod;
  status: IntegrationConnectionStatus;
  displayName?: string | null;
  config: Record<string, unknown>;
  secretEncrypted?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class IntegrationConnectionEntity {
  constructor(private props: IntegrationConnectionProps) {}

  toObject(): IntegrationConnectionProps {
    return { ...this.props };
  }

  update(input: {
    displayName?: string | null;
    config?: Record<string, unknown>;
    status?: IntegrationConnectionStatus;
    secretEncrypted?: string | null;
  }): void {
    this.props = {
      ...this.props,
      displayName: input.displayName ?? this.props.displayName,
      config: input.config ?? this.props.config,
      status: input.status ?? this.props.status,
      secretEncrypted: input.secretEncrypted ?? this.props.secretEncrypted,
      updatedAt: new Date(),
    };
  }

  toDto(): IntegrationConnectionDto {
    return {
      id: this.props.id,
      tenantId: this.props.tenantId,
      workspaceId: this.props.workspaceId,
      kind: this.props.kind,
      authMethod: this.props.authMethod,
      status: this.props.status,
      displayName: this.props.displayName ?? null,
      config: this.props.config,
      hasSecret: Boolean(this.props.secretEncrypted),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
