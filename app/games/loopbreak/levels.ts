export interface LoopbreakLevel {
  name: string;
  route: number[];
  blocked: number[];
  checkpointIndexes: number[];
  moveSlack: number | null;
}

const routes = [
  [0, 1, 2, 7, 12, 13, 14, 19, 24],
  [0, 5, 10, 11, 6, 7, 12, 17, 18, 23, 24],
  [0, 1, 6, 11, 10, 15, 16, 21, 22, 23, 24],
  [0, 5, 6, 1, 2, 7, 8, 13, 12, 17, 18, 19, 24],
  [0, 1, 2, 3, 8, 7, 6, 11, 16, 17, 18, 23, 24],
  [0, 5, 10, 15, 16, 11, 6, 7, 12, 13, 18, 23, 24],
  [0, 1, 6, 7, 2, 3, 8, 13, 12, 17, 22, 23, 24],
  [0, 5, 6, 11, 10, 15, 20, 21, 16, 17, 22, 23, 24],
  [0, 1, 2, 7, 6, 11, 12, 13, 18, 17, 22, 23, 24],
  [0, 5, 10, 11, 12, 7, 8, 13, 14, 19, 24],
  [0, 1, 6, 11, 12, 17, 16, 21, 22, 23, 24],
  [0, 5, 6, 7, 12, 11, 16, 15, 20, 21, 22, 17, 18, 23, 24],
  [0, 1, 2, 7, 12, 17, 16, 15, 20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20, 21, 16, 11, 12, 13, 18, 19, 24],
  [0, 1, 6, 7, 8, 13, 18, 17, 16, 21, 22, 23, 24],
  [0, 5, 6, 11, 12, 13, 8, 3, 4, 9, 14, 19, 24],
  [0, 1, 2, 3, 8, 13, 12, 11, 16, 21, 22, 17, 18, 23, 24],
  [0, 5, 10, 11, 6, 1, 2, 7, 12, 13, 14, 19, 24],
  [0, 1, 6, 11, 16, 15, 20, 21, 22, 17, 18, 23, 24],
  [0, 5, 6, 1, 2, 3, 8, 13, 12, 17, 16, 21, 22, 23, 24],
];

const blockedCells = [
  [4, 9, 20],
  [2, 4, 14, 20],
  [3, 5, 8, 19],
  [3, 4, 10, 15],
  [4, 9, 10, 20],
  [2, 4, 8, 21],
  [4, 9, 10, 20],
  [1, 3, 8, 14],
  [4, 9, 14, 20],
  [2, 4, 15, 20],
  [3, 4, 8, 10],
  [1, 3, 8, 14],
  [3, 4, 8, 14],
  [1, 3, 6, 8],
  [3, 4, 9, 10],
  [1, 2, 10, 22],
  [4, 5, 9, 10],
  [3, 4, 8, 15],
  [2, 3, 4, 8],
  [4, 9, 10, 15],
];

export const LOOPBREAK_LEVELS: LoopbreakLevel[] = routes.map(
  (route, index) => {
    const checkpoints = [
      Math.floor(route.length * 0.38),
      Math.floor(route.length * 0.72),
    ];

    return {
      name: [
        "First spark",
        "The switchback",
        "Cross current",
        "Short circuit",
        "Pressure point",
        "Deep current",
        "Double bend",
        "Cold start",
        "The long way",
        "Tight window",
        "Bright idea",
        "Circuit breaker",
        "Hidden signal",
        "Live wire",
        "The detour",
        "Overload",
        "Night shift",
        "Crossfire",
        "Final current",
        "Loopbreak",
      ][index],
      route,
      blocked: blockedCells[index],
      checkpointIndexes: [...new Set(checkpoints)],
      moveSlack: index >= 4 ? 3 + Math.floor(index / 8) : null,
    };
  },
);

export const DIRECTIONS = [
  { bit: 1, opposite: 4, row: -1, col: 0 },
  { bit: 2, opposite: 8, row: 0, col: 1 },
  { bit: 4, opposite: 1, row: 1, col: 0 },
  { bit: 8, opposite: 2, row: 0, col: -1 },
] as const;

export function solutionMasks(level: LoopbreakLevel): number[] {
  const masks = Array<number>(25).fill(0);

  level.route.forEach((cell, index) => {
    const row = Math.floor(cell / 5);
    const col = cell % 5;
    const previous = level.route[index - 1];
    const next = level.route[index + 1];

    for (const direction of DIRECTIONS) {
      const neighbor = (row + direction.row) * 5 + col + direction.col;
      if (neighbor === previous || neighbor === next) {
        masks[cell] |= direction.bit;
      }
    }
  });

  return masks;
}

export function rotateMask(mask: number): number {
  return ((mask << 1) & 15) | ((mask >> 3) & 1);
}

export function clockwiseTurnsToMatch(mask: number, target: number): number {
  if (mask === target) return 0;

  let current = mask;

  for (let turns = 1; turns <= 3; turns += 1) {
    current = rotateMask(current);
    if (current === target) return turns;
  }

  return 0;
}
