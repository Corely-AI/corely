import { type AuditPort } from "../../application/ports/audit.port";

export class MockAudit implements AuditPort {
  entries: Array<Parameters<AuditPort["write"]>[0]> = [];

  async write(data: Parameters<AuditPort["write"]>[0]): Promise<void> {
    this.entries.push(data);
  }
}
