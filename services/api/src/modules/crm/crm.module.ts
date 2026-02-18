import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { PromptModule } from "../../shared/prompts/prompt.module";
import { IdentityModule } from "../identity";
import { PartyModule } from "../party";
import { PlatformModule } from "../platform";
import { PlatformCustomAttributesModule } from "../platform-custom-attributes/platform-custom-attributes.module";
import { CrmApplication } from "./application/crm.application";
import { CRM_APPLICATION_PROVIDER } from "./crm-application.provider";
import { CRM_AI_PROVIDERS } from "./crm-ai.providers";
import { CRM_HTTP_CONTROLLERS } from "./crm.controllers";
import { CRM_CORE_PROVIDERS } from "./crm-core.providers";

@Module({
  imports: [
    DataModule,
    IdentityModule,
    KernelModule,
    PlatformModule,
    PartyModule,
    PlatformCustomAttributesModule,
    PromptModule,
  ],
  controllers: CRM_HTTP_CONTROLLERS,
  providers: [...CRM_CORE_PROVIDERS, ...CRM_AI_PROVIDERS, CRM_APPLICATION_PROVIDER],
  exports: [CrmApplication],
})
export class CrmModule {}
