import { useEffect, useRef, useState } from "react";
import { getStatusMessages, type StatusPhase, type StatusTone } from "./statusTexts";

type UseRotatingStatusTextOptions = {
  enabled: boolean;
  phase?: StatusPhase;
  tone?: StatusTone;
  minIntervalMs?: number;
  maxIntervalMs?: number;
  random?: () => number;
  now?: () => number;
};

type RotatingStatusState = {
  text: string | null;
  phase: StatusPhase | null;
};

const PHASE_2_DELAY_MS = 2000;
const PHASE_3_DELAY_MS = 6000;
const DEFAULT_MIN_INTERVAL_MS = 1500;
const DEFAULT_MAX_INTERVAL_MS = 2500;

const pickNextMessage = (
  messages: readonly string[],
  previous: string | null,
  random: () => number
) => {
  if (messages.length === 0) {
    return "";
  }
  if (messages.length === 1) {
    return messages[0];
  }
  const index = Math.floor(random() * messages.length);
  const candidate = messages[index];
  if (candidate !== previous) {
    return candidate;
  }
  return messages[(index + 1) % messages.length];
};

const getRandomInterval = (random: () => number, min: number, max: number) => {
  const lower = Math.max(0, Math.min(min, max));
  const upper = Math.max(lower, Math.max(min, max));
  return Math.floor(random() * (upper - lower + 1)) + lower;
};

export const useRotatingStatusText = ({
  enabled,
  phase,
  tone = "calm",
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
  maxIntervalMs = DEFAULT_MAX_INTERVAL_MS,
  random = Math.random,
  now = Date.now,
}: UseRotatingStatusTextOptions): RotatingStatusState => {
  const [activePhase, setActivePhase] = useState<StatusPhase | null>(null);
  const [text, setText] = useState<string | null>(null);
  const lastTextRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rotationTimerRef = useRef<number | null>(null);
  const phaseTimersRef = useRef<number[]>([]);
  const phaseOverrideRef = useRef<StatusPhase | undefined>(phase);
  const randomRef = useRef(random);
  const nowRef = useRef(now);

  const clearRotationTimer = () => {
    if (rotationTimerRef.current !== null) {
      window.clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
  };

  const clearPhaseTimers = () => {
    phaseTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    phaseTimersRef.current = [];
  };

  useEffect(() => {
    phaseOverrideRef.current = phase;
  }, [phase]);

  useEffect(() => {
    randomRef.current = random;
  }, [random]);

  useEffect(() => {
    nowRef.current = now;
  }, [now]);

  useEffect(() => {
    if (!enabled) {
      clearRotationTimer();
      clearPhaseTimers();
      setActivePhase(null);
      setText(null);
      startTimeRef.current = null;
      lastTextRef.current = null;
      return;
    }

    startTimeRef.current = nowRef.current();
    setActivePhase("initial");
    const initialMessages = getStatusMessages("initial", tone);
    const initialText = pickNextMessage(initialMessages, lastTextRef.current, randomRef.current);
    setText(initialText);
    lastTextRef.current = initialText;

    const toShort = window.setTimeout(() => {
      const override = phaseOverrideRef.current;
      setActivePhase(override ?? "short");
    }, PHASE_2_DELAY_MS);
    const toLong = window.setTimeout(() => {
      const override = phaseOverrideRef.current;
      setActivePhase(override ?? "long");
    }, PHASE_3_DELAY_MS);

    phaseTimersRef.current = [toShort, toLong];

    return () => {
      clearRotationTimer();
      clearPhaseTimers();
    };
  }, [enabled, tone]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (phase) {
      setActivePhase(phase);
      return;
    }
    const startedAt = startTimeRef.current;
    if (!startedAt) {
      return;
    }
    const elapsed = nowRef.current() - startedAt;
    if (elapsed >= PHASE_3_DELAY_MS) {
      setActivePhase("long");
    } else if (elapsed >= PHASE_2_DELAY_MS) {
      setActivePhase("short");
    } else {
      setActivePhase("initial");
    }
  }, [enabled, phase]);

  useEffect(() => {
    if (!enabled || !activePhase) {
      return;
    }

    clearRotationTimer();
    const messages = getStatusMessages(activePhase, tone);
    const nextText = pickNextMessage(messages, lastTextRef.current, randomRef.current);
    setText(nextText);
    lastTextRef.current = nextText;

    const scheduleNext = () => {
      rotationTimerRef.current = window.setTimeout(
        () => {
          const rotated = pickNextMessage(messages, lastTextRef.current, randomRef.current);
          setText(rotated);
          lastTextRef.current = rotated;
          scheduleNext();
        },
        getRandomInterval(randomRef.current, minIntervalMs, maxIntervalMs)
      );
    };

    scheduleNext();

    return clearRotationTimer;
  }, [activePhase, enabled, maxIntervalMs, minIntervalMs, tone]);

  return { text, phase: activePhase };
};
