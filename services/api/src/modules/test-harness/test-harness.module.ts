import { Module, Global } from "@nestjs/common";
import { TestHarnessController } from "./test-harness.controller";
import { TestHarnessService } from "./test-harness.service";
import { WorkspacesModule } from "../workspaces/workspaces.module";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity/identity.module";

@Global()
@Module({
  imports: [DataModule, WorkspacesModule, IdentityModule],
  controllers: [TestHarnessController],
  providers: [
    TestHarnessService,
    {
      provide: "TEST_HARNESS_SERVICE",
      useExisting: TestHarnessService,
    },
  ],
  exports: ["TEST_HARNESS_SERVICE", TestHarnessService],
})
export class TestHarnessModule {}
