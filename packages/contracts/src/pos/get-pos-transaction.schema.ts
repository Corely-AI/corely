import { z } from "zod";
import { PosTransactionDetailSchema } from "./transaction.types";

export const GetPosTransactionInputSchema = z.object({
  transactionId: z.string().uuid(),
});

export const GetPosTransactionOutputSchema = z.object({
  transaction: PosTransactionDetailSchema,
});

export type GetPosTransactionInput = z.infer<typeof GetPosTransactionInputSchema>;
export type GetPosTransactionOutput = z.infer<typeof GetPosTransactionOutputSchema>;
