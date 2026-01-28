import { type LoggerPort } from "@corely/kernel";
import type { SupplierQueryPort } from "../ports/supplier-query.port";

export type SupplierDeps = {
  logger: LoggerPort;
  supplierQuery: SupplierQueryPort;
};
