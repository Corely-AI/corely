import { IAuditPort } from "../../application/ports/audit.port";

export class MockAudit implements IAuditPort {
  entries: Array<Parameters<IAuditPort["write"]>[0]> = [];

  async write(data: Parameters<IAuditPort["write"]>[0]): Promise<void> {
    this.entries.push(data);
  }
}
