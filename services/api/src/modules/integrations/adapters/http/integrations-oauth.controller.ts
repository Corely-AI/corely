import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

@Controller("integrations/oauth")
export class IntegrationsOauthController {
  @Get(":provider/callback")
  callbackGet(
    @Param("provider") provider: string,
    @Query() query: Record<string, string | string[] | undefined>
  ) {
    return {
      ok: true,
      provider,
      mode: "GET",
      query,
    };
  }

  @Post(":provider/callback")
  callbackPost(@Param("provider") provider: string, @Body() body: unknown) {
    return {
      ok: true,
      provider,
      mode: "POST",
      body,
    };
  }
}
