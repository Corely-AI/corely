import { getGroupRank } from "./command-registry";
import type {
  Command,
  CommandGroupSection,
  CommandId,
  CommandUsage,
  RankedCommand,
  RecentsState,
} from "./types";

const WHITESPACE_PATTERN = /\s+/g;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENCY_WINDOW_MS = 14 * DAY_MS;
const RECENCY_MAX_BOOST = 1.5;

interface FieldScoreBoosts {
  exact: number;
  startsWith: number;
  tokenExact: number;
  tokenStartsWith: number;
  substring: number;
}

const TITLE_BOOSTS: FieldScoreBoosts = {
  exact: 6,
  startsWith: 4.5,
  tokenExact: 2.8,
  tokenStartsWith: 2.2,
  substring: 1.4,
};

const SUBTITLE_BOOSTS: FieldScoreBoosts = {
  exact: 2.2,
  startsWith: 1.8,
  tokenExact: 1.1,
  tokenStartsWith: 0.9,
  substring: 0.5,
};

const KEYWORD_BOOSTS: FieldScoreBoosts = {
  exact: 2.4,
  startsWith: 2.1,
  tokenExact: 1.2,
  tokenStartsWith: 1,
  substring: 0.6,
};

export const normalizeText = (value: string | undefined): string =>
  (value ?? "").toLowerCase().trim().replace(WHITESPACE_PATTERN, " ");

const tokenize = (value: string): string[] => value.split(" ").filter(Boolean);

const scoreField = (
  candidate: string,
  normalizedQuery: string,
  queryTokens: string[],
  boosts: FieldScoreBoosts
): { score: number; matched: boolean } => {
  if (!candidate) {
    return { score: 0, matched: false };
  }

  let score = 0;
  let matched = false;
  const candidateTokens = tokenize(candidate);

  if (candidate === normalizedQuery) {
    score += boosts.exact;
    matched = true;
  }

  if (candidate.startsWith(normalizedQuery)) {
    score += boosts.startsWith;
    matched = true;
  }

  for (const token of queryTokens) {
    if (!token) {
      continue;
    }

    if (candidateTokens.includes(token)) {
      score += boosts.tokenExact;
      matched = true;
      continue;
    }

    if (candidateTokens.some((candidateToken) => candidateToken.startsWith(token))) {
      score += boosts.tokenStartsWith;
      matched = true;
      continue;
    }

    if (candidate.includes(token)) {
      score += boosts.substring;
      matched = true;
    }
  }

  return { score, matched };
};

const getTextScore = (command: Command, normalizedQuery: string): number | null => {
  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = tokenize(normalizedQuery);
  const normalizedTitle = normalizeText(command.title);
  const normalizedSubtitle = normalizeText(command.subtitle);
  const keywordScores = (command.keywords ?? []).map((keyword) =>
    scoreField(normalizeText(keyword), normalizedQuery, queryTokens, KEYWORD_BOOSTS)
  );

  const titleScore = scoreField(normalizedTitle, normalizedQuery, queryTokens, TITLE_BOOSTS);
  const subtitleScore = scoreField(
    normalizedSubtitle,
    normalizedQuery,
    queryTokens,
    SUBTITLE_BOOSTS
  );
  const keywordScoreValue =
    keywordScores.reduce((total, current) => total + current.score, 0) * 0.45;

  const hasMatch =
    titleScore.matched || subtitleScore.matched || keywordScores.some((item) => item.matched);
  if (!hasMatch) {
    return null;
  }

  return titleScore.score + subtitleScore.score * 0.6 + keywordScoreValue;
};

export const getRecencyBoost = (
  lastUsedAt: string | undefined,
  nowMs: number = Date.now()
): number => {
  if (!lastUsedAt) {
    return 0;
  }

  const lastUsedAtMs = Date.parse(lastUsedAt);
  if (Number.isNaN(lastUsedAtMs)) {
    return 0;
  }

  const elapsedMs = Math.max(0, nowMs - lastUsedAtMs);
  if (elapsedMs <= DAY_MS) {
    return RECENCY_MAX_BOOST;
  }

  if (elapsedMs >= RECENCY_WINDOW_MS) {
    return 0;
  }

  const normalized = (elapsedMs - DAY_MS) / (RECENCY_WINDOW_MS - DAY_MS);
  return RECENCY_MAX_BOOST * (1 - normalized);
};

const getFrecencyScore = (usage: CommandUsage | undefined, nowMs: number): number => {
  if (!usage) {
    return 0;
  }

  const safeCount = Number.isFinite(usage.count) ? Math.max(usage.count, 0) : 0;
  return Math.log1p(safeCount) * 0.5 + getRecencyBoost(usage.lastUsedAt, nowMs);
};

export const rankCommands = ({
  commands,
  query,
  recentsState,
  nowMs = Date.now(),
}: {
  commands: Command[];
  query: string;
  recentsState: RecentsState;
  nowMs?: number;
}): RankedCommand[] => {
  const normalizedQuery = normalizeText(query);

  const ranked = commands
    .map((command, originalIndex) => {
      const textScore = getTextScore(command, normalizedQuery);
      if (textScore === null) {
        return null;
      }

      const frecencyScore = getFrecencyScore(recentsState.used[command.id], nowMs);

      return {
        command,
        score: textScore + frecencyScore,
        textScore,
        frecencyScore,
        originalIndex,
      };
    })
    .filter((command): command is RankedCommand & { originalIndex: number } => Boolean(command));

  ranked.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.textScore !== left.textScore) {
      return right.textScore - left.textScore;
    }

    if (right.frecencyScore !== left.frecencyScore) {
      return right.frecencyScore - left.frecencyScore;
    }

    const leftGroupRank = getGroupRank(left.command.group);
    const rightGroupRank = getGroupRank(right.command.group);
    if (leftGroupRank !== rightGroupRank) {
      return leftGroupRank - rightGroupRank;
    }

    if (left.originalIndex !== right.originalIndex) {
      return left.originalIndex - right.originalIndex;
    }

    return left.command.title.localeCompare(right.command.title);
  });

  return ranked.map(({ originalIndex: _originalIndex, ...rest }) => rest);
};

export const getRecentCommandIds = ({
  commands,
  recentsState,
  limit = 5,
}: {
  commands: Command[];
  recentsState: RecentsState;
  limit?: number;
}): CommandId[] => {
  return commands
    .map((command, originalIndex) => {
      const usage = recentsState.used[command.id];
      if (!usage || usage.count <= 0) {
        return null;
      }

      const lastUsedMs = Date.parse(usage.lastUsedAt);
      return {
        id: command.id,
        count: usage.count,
        lastUsedMs: Number.isNaN(lastUsedMs) ? 0 : lastUsedMs,
        originalIndex,
      };
    })
    .filter(
      (
        entry
      ): entry is { id: CommandId; count: number; lastUsedMs: number; originalIndex: number } =>
        Boolean(entry)
    )
    .sort((left, right) => {
      if (right.lastUsedMs !== left.lastUsedMs) {
        return right.lastUsedMs - left.lastUsedMs;
      }

      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.originalIndex - right.originalIndex;
    })
    .slice(0, limit)
    .map((entry) => entry.id);
};

const groupRankedCommands = (
  rankedCommands: RankedCommand[]
): CommandGroupSection<RankedCommand>[] => {
  const groups = new Map<string, RankedCommand[]>();

  for (const rankedCommand of rankedCommands) {
    const group = rankedCommand.command.group;
    const existing = groups.get(group) ?? [];
    existing.push(rankedCommand);
    groups.set(group, existing);
  }

  return Array.from(groups.entries())
    .sort((left, right) => {
      const leftGroupRank = getGroupRank(left[0]);
      const rightGroupRank = getGroupRank(right[0]);
      if (leftGroupRank !== rightGroupRank) {
        return leftGroupRank - rightGroupRank;
      }

      return left[0].localeCompare(right[0]);
    })
    .map(([group, commands]) => ({
      group,
      commands,
    }));
};

export const buildCommandSections = ({
  rankedCommands,
  query,
  recentCommandIds,
}: {
  rankedCommands: RankedCommand[];
  query: string;
  recentCommandIds: CommandId[];
}): CommandGroupSection<RankedCommand>[] => {
  const normalizedQuery = normalizeText(query);
  if (normalizedQuery) {
    return groupRankedCommands(rankedCommands);
  }

  const rankedById = new Map(rankedCommands.map((item) => [item.command.id, item]));
  const recentIds = new Set(recentCommandIds);
  const recentCommands = recentCommandIds
    .map((commandId) => rankedById.get(commandId))
    .filter((command): command is RankedCommand => Boolean(command));
  const remainingCommands = rankedCommands.filter((command) => !recentIds.has(command.command.id));

  const sections: CommandGroupSection<RankedCommand>[] = [];

  if (recentCommands.length > 0) {
    sections.push({
      group: "Recent",
      commands: recentCommands,
    });
  }

  return [...sections, ...groupRankedCommands(remainingCommands)];
};
