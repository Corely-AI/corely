export interface ClockPort {
  now(): Date;
  nowMs(): number;
}

export const CLOCK_PORT_TOKEN = Symbol("CLOCK_PORT_TOKEN");
