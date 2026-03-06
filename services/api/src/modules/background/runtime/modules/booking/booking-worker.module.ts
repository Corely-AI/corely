import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { ExpireHoldsTask } from "./tasks/expire-holds.task";

@Module({
  imports: [DataModule],
  providers: [ExpireHoldsTask],
})
export class BookingWorkerModule {}
