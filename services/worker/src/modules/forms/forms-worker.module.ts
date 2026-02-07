import { Module } from "@nestjs/common";
import { FormsEventHandler } from "./forms-event.handler";

@Module({
  providers: [FormsEventHandler],
  exports: [FormsEventHandler],
})
export class FormsWorkerModule {}
