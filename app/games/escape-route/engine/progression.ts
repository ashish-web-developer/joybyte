export type LevelProgress = {
  completedLevels: number[];
  bestTimes: Record<number, number>;
  bestScores: Record<number, number>;
  highestStars: Record<number, number>;
  totalStars: number;
  unlockedThrough: number;
};

export type StarThreshold = {
  seconds: number;
  collisions: number;
};

export type LevelDefinition = {
  id: number;
  name: string;
  route: string;
  optionalCollectibleReward?: number;
  scoring: {
    completionReward: number;
    timeBonusMax: number;
    timeBonusWindowSeconds: number;
    collisionPenalty: number;
    cleanDrivingBonus: number;
  };
  stars: {
    three: StarThreshold;
    two: StarThreshold;
  };
};

export type CompletionResult = {
  stars: number;
  score: number;
  previousBestScore: number | null;
  isNewBestScore: boolean;
  isNewBestTime: boolean;
  isNewRecord: boolean;
};

export const CURRENT_LEVEL = 1;
export const NEXT_LEVEL = CURRENT_LEVEL + 1;
export const LEVEL_SELECT_ROUTE = "/games/escape-route/levels";
export const PROGRESSION_STORAGE_KEY = "escape-route.progress.v1";
export const MOUNTAIN_CACHE_BONUS = 250;

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    id: 1,
    name: "City Intersection",
    route: "/games/escape-route/level-01",
    scoring: {
      completionReward: 500,
      timeBonusMax: 300,
      timeBonusWindowSeconds: 180,
      collisionPenalty: 50,
      cleanDrivingBonus: 200,
    },
    stars: {
      three: { seconds: 90, collisions: 2 },
      two: { seconds: 150, collisions: 5 },
    },
  },
  {
    id: 2,
    name: "Underground Parking",
    route: "/games/escape-route/level-02",
    scoring: {
      completionReward: 500,
      timeBonusMax: 300,
      timeBonusWindowSeconds: 210,
      collisionPenalty: 50,
      cleanDrivingBonus: 200,
    },
    stars: {
      three: { seconds: 120, collisions: 2 },
      two: { seconds: 180, collisions: 5 },
    },
  },
  {
    id: 3,
    name: "The Last Summit",
    route: "/games/escape-route/level-03",
    optionalCollectibleReward: MOUNTAIN_CACHE_BONUS,
    scoring: {
      completionReward: 650,
      timeBonusMax: 500,
      timeBonusWindowSeconds: 480,
      collisionPenalty: 45,
      cleanDrivingBonus: 250,
    },
    stars: {
      three: { seconds: 300, collisions: 2 },
      two: { seconds: 420, collisions: 5 },
    },
  },
];

export const EMPTY_PROGRESS: LevelProgress = {
  completedLevels: [],
  bestTimes: {},
  bestScores: {},
  highestStars: {},
  totalStars: 0,
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
        !Number.isInteger(score) ||
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

  const bestTimes = readNumberRecord(
    parsed.bestTimes,
    Number.MAX_SAFE_INTEGER,
  );
  const bestScores = readNumberRecord(
    parsed.bestScores ?? {},
    Number.MAX_SAFE_INTEGER,
  );
  const highestStars = readNumberRecord(parsed.highestStars, 3);

  return {
    completedLevels: [...new Set(completedLevelIds)],
    bestTimes,
    bestScores,
    highestStars,
    totalStars: Object.values(highestStars).reduce(
      (total, stars) => total + stars,
      0,
    ),
    unlockedThrough,
  };
}

export function saveProgress(
  storage: Pick<Storage, "setItem">,
  progress: LevelProgress,
) {
  storage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(progress));
}

function getLevelDefinition(level: number) {
  const definition = LEVEL_DEFINITIONS.find((item) => item.id === level);
  if (!definition) {
    throw new Error(`ESCAPE ROUTE level ${level} has no scoring configuration.`);
  }
  return definition;
}

export function getCompletionScore(
  level: number,
  seconds: number,
  collisions: number,
  bonusPoints = 0,
) {
  const { scoring } = getLevelDefinition(level);
  const timeBonus = Math.max(
    0,
    Math.round(
      scoring.timeBonusMax *
        (1 - seconds / scoring.timeBonusWindowSeconds),
    ),
  );
  const cleanDrivingBonus =
    collisions === 0 ? scoring.cleanDrivingBonus : 0;
  return Math.max(
    0,
    scoring.completionReward +
      timeBonus +
    bonusPoints +
    cleanDrivingBonus -
      collisions * scoring.collisionPenalty,
  );
}

export function getCompletionStars(
  seconds: number,
  collisions: number,
  level = CURRENT_LEVEL,
) {
  const { stars } = getLevelDefinition(level);
  if (
    seconds < stars.three.seconds &&
    collisions <= stars.three.collisions
  ) {
    return 3;
  }
  if (
    seconds < stars.two.seconds &&
    collisions <= stars.two.collisions
  ) {
    return 2;
  }
  return 1;
}

export function recordCompletion(
  progress: LevelProgress,
  level: number,
  seconds: number,
  collisions: number,
  bonusPoints = 0,
): { progress: LevelProgress; result: CompletionResult } {
  if (
    !Number.isInteger(level) ||
    level < CURRENT_LEVEL ||
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    !Number.isInteger(collisions) ||
    collisions < 0 ||
    !Number.isInteger(bonusPoints) ||
    bonusPoints < 0
  ) {
    throw new Error("Cannot save an invalid ESCAPE ROUTE completion.");
  }

  const score = getCompletionScore(level, seconds, collisions, bonusPoints);
  const stars = getCompletionStars(seconds, collisions, level);
  const previousBestScore = progress.bestScores[level] ?? null;
  const previousBestTime = progress.bestTimes[level];
  const bestScores = {
    ...progress.bestScores,
    [level]:
      previousBestScore === null
        ? score
        : Math.max(previousBestScore, score),
  };
  const bestTimes = {
    ...progress.bestTimes,
    [level]:
      previousBestTime === undefined
        ? seconds
        : Math.min(previousBestTime, seconds),
  };
  const highestStars = {
    ...progress.highestStars,
    [level]: Math.max(progress.highestStars[level] ?? 0, stars),
  };

  return {
    progress: {
      completedLevels: [...new Set([...progress.completedLevels, level])],
      bestTimes,
      bestScores,
      highestStars,
      totalStars: Object.values(highestStars).reduce(
        (total, value) => total + value,
        0,
      ),
      unlockedThrough: Math.max(progress.unlockedThrough, level + 1),
    },
    result: {
      stars,
      score,
      previousBestScore,
      isNewBestScore: previousBestScore === null || score > previousBestScore,
      isNewBestTime:
        previousBestTime === undefined || seconds < previousBestTime,
      isNewRecord: previousBestScore === null || score > previousBestScore,
    },
  };
}

export function isLevelUnlocked(progress: LevelProgress, level: number) {
  return level >= CURRENT_LEVEL && level <= progress.unlockedThrough;
}
