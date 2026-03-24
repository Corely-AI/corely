import { Controller, Get, UseGuards } from "@nestjs/common";
import { ChannelCatalogService } from "../../application/channel-catalog.service";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "@/modules/identity/adapters/http/rbac.guard";

@Controller("crm/channels")
@UseGuards(AuthGuard, RbacGuard)
export class ChannelsHttpController {
  constructor(private readonly channelCatalog: ChannelCatalogService) {}

  @Get()
  @RequirePermission("crm.deals.read")
  async list() {
    const channels = await this.channelCatalog.getChannels();
    return { channels };
  }
}
