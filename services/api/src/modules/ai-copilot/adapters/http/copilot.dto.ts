import { IsArray, IsOptional, IsString } from "class-validator";
import { type CopilotUIMessage } from "../../domain/types/ui-message";

export class CopilotChatRequestDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  threadId?: string;

  @IsOptional()
  @IsArray()
  messages?: CopilotUIMessage[];

  @IsOptional()
  message?: CopilotUIMessage;

  @IsOptional()
  @IsString()
  trigger?: string;

  @IsOptional()
  @IsString()
  messageId?: string;

  requestData!: {
    tenantId: string;
    locale?: string;
    activeModule?: string;
    modelHint?: string;
  };
}
