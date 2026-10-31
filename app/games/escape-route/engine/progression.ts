export type LevelProgress = {
  completedLevels: number[];
  bestTimes: Record<number, number>;
  highestStars: Record<number, number>;
  unlockedThrough: number;
};

export type CompletionResult = {
  stars: number;
  isNewBestTime: boolean;
};

export const CURRENT_LEVEL = 1;
export const NEXT_LEVEL = CURRENT_LEVEL + 1;
export const PROGRESSION_STORAGE_KEY = "escape-route.progress.v1";

export const EMPTY_PROGRESS: LevelProgress = {
  completedLevels: [],
  bestTimes: {},
  highestStars: {},
  unlockedThrough: CURRENT_LEVEL,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumberRecord(value: unknown, maximum: number) {
  if (!isRecord(value)) {
    throw new Error("Saved ESCAPE ROUTE progress contains invalid level data.");
  }

  return Object.fromEntries(
    Object.entries(value).map(([level, score]) => {
      const parsedLevel = Number(level);
      if (
        !Number.isInteger(parsedLevel) ||
        parsedLevel < 1 ||
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > maximum
      ) {
        throw new Error("Saved ESCAPE ROUTE progress contains invalid scores.");
      }
      return [parsedLevel, score];
    }),
  );
}

export function loadProgress(storage: Pick<Storage, "getItem">): LevelProgress {
  const saved = storage.getItem(PROGRESSION_STORAGE_KEY);
  if (saved === null) return { ...EMPTY_PROGRESS };

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch (error) {
    throw new Error("Saved ESCAPE ROUTE progress could not be read.", {
      cause: error,
    });
  }

  if (!isRecord(parsed)) {
    throw new Error("Saved ESCAPE ROUTE progress has an invalid format.");
  }

  const completedLevels = parsed.completedLevels;
  const unlockedThrough = parsed.unlockedThrough;
  if (
    !Array.isArray(completedLevels) ||
    typeof unlockedThrough !== "number" ||
    !Number.isInteger(unlockedThrough) ||
    unlockedThrough < CURRENT_LEVEL
  ) {
    throw new Error("Saved ESCAPE ROUTE progress has invalid level status.");
  }

  const completedLevelIds = completedLevels.map((level: unknown) => {
    if (
      typeof level !== "number" ||
      !Number.isInteger(level) ||
      level < CURRENT_LEVEL
    ) {
      throw new Error("Saved ESCAPE ROUTE progress has invalid level status.");
    }
    return level;
  });

  return {
    completedLevels: [...new Set(completedLevelIds)],
    bestTimes: readNumberRecord(parsed.bestTimes, Number.MAX_SAFE_INTEGER),
    highestStars: readNumberRecord(parsed.highestStars, 3),
    unlockedThrough,
  };
}

export function saveProgress(
  storage: Pick<Storage, "setItem">,
  progress: LevelProgress,
) {
  storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(progress));
}

export function getCompletionStars(seconds: number, collisions: number) {
  if (seconds <= 150 && collisions === 0) return 3;
  if (seconds <= 300 && collisions <= 3) return 2;
  return 1;
}

export function recordCompletion(
  progress: LevelProgress,
  level: number,
  seconds: number,
  collisions: number,
): { progress: LevelProgress; result: CompletionResult } {
  if (
    !Number.isInteger(level) ||
    level < CURRENT_LEVEL ||
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    !Number.isInteger(collisions) ||
    collisions < 0
  ) {
    throw new Error("Cannot save an invalid ESCAPE ROUTE completion.");
  }

  const stars = getCompletionStars(seconds, collisions);
  const previousBest = progress.bestTimes[level];

  return {
    progress: {
      completedLevels: [...new Set([...progress.completedLevels, level])],
      bestTimes: {
        ...progress.bestTimes,
        [level]:
          previousBest === undefined
            ? seconds
            : Math.min(previousBest, seconds),
      },
      highestStars: {
        ...progress.highestStars,
        [level]: Math.max(progress.highestStars[level] ?? 0, stars),
      },
      unlockedThrough: Math.max(progress.unlockedThrough, level + 1),
    },
    result: {
      stars,
      isNewBestTime: previousBest === undefined || seconds < previousBest,
    },
  };
}

export function isLevelUnlocked(progress: LevelProgress, level: number) {
  return level >= CURRENT_LEVEL && level <= progress.unlockedThrough;
}
