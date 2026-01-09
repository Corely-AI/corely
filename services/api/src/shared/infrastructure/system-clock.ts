import { Injectable } from "@nestjs/common";
import { ClockPort } from "../ports/clock.port";

@Injectable()
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
