import { ClockPort } from "../ports/clock.port";

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
