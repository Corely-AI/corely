import { randomUUID } from "crypto";
import { IdGeneratorPort } from "../ports/id-generator.port";

export class SystemIdGenerator implements IdGeneratorPort {
  next(): string {
    return randomUUID();
  }
}
