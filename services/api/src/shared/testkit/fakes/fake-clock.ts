import { ClockPort } from "../../ports/clock.port";

export class FakeClock implements ClockPort {
  private current: Date;

  constructor(start: Date = new Date()) {
    this.current = new Date(start);
  }

  now(): Date {
    return new Date(this.current);
  }

  nowMs(): number {
    return this.current.getTime();
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}
