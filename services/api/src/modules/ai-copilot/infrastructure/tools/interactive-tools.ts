import { tool } from "ai";
import {
  CollectInputsToolInputSchema,
  type CollectInputsToolInput,
  type CollectInputsToolOutput,
  CollectInputsToolOutputSchema,
} from "@corely/contracts";

/**
 * Client-handled tool that asks the user to provide structured inputs.
 * No execute handler is provided so the client must respond via addToolResult.
 */
export const buildCollectInputsTool = (description: string) =>
  tool<CollectInputsToolInput, CollectInputsToolOutput>({
    description,
    inputSchema: CollectInputsToolInputSchema,
    outputSchema: CollectInputsToolOutputSchema,
  });
