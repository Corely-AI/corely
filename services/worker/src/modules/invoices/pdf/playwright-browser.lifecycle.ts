import { Inject, Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import type { Browser } from "playwright";

@Injectable()
export class PlaywrightBrowserLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger(PlaywrightBrowserLifecycle.name);

  constructor(@Inject("PLAYWRIGHT_BROWSER") private readonly browser: Browser) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.browser.close();
    } catch (error) {
      this.logger.warn(
        `Failed to close Playwright browser: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
