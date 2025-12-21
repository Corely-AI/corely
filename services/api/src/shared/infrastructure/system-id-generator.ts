import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { IdGeneratorPort } from "@kerniflow/kernel";

@Injectable()
export class SystemIdGenerator implements IdGeneratorPort {
  newId(): string {
    return randomUUID();
  }
}
