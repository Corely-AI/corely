export type StatusPhase = "initial" | "short" | "long" | "tool";
export type StatusTone = "calm" | "playful";

export type StatusTextConfig = {
  [phase in StatusPhase]: {
    calm: readonly string[];
    playful?: readonly string[];
  };
};

export const STATUS_TEXTS: StatusTextConfig = {
  initial: {
    calm: ["Thinking…"],
  },
  short: {
    calm: [
      "Thinking…",
      "Working on it…",
      "Putting this together…",
      "Drafting a response…",
      "Checking the details…",
      "Almost there…",
      "One moment…",
      "Finalizing…",
      "Preparing your result…",
    ],
    playful: [
      "Connecting the dots…",
      "Crunching the numbers…",
      "Assembling the pieces…",
      "Polishing the output…",
    ],
  },
  long: {
    calm: [
      "This one needs a bit of thinking—hang tight.",
      "Making sure everything matches your setup.",
      "Double-checking edge cases so it doesn’t break later.",
      "Preparing a structured answer you can plug in directly.",
    ],
  },
  tool: {
    calm: ["Calling tools…", "Fetching context…", "Validating inputs…", "Formatting output…"],
  },
};

export const getStatusMessages = (phase: StatusPhase, tone: StatusTone): readonly string[] => {
  const messages = STATUS_TEXTS[phase][tone];
  if (messages && messages.length > 0) {
    return messages;
  }
  return STATUS_TEXTS[phase].calm;
};
