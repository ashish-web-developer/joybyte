import type { Point, RoadSegment } from "./world";

export type MountainMarker = Point & {
  radius: number;
};

export type RockfallConfig = Point & {
  triggerRadius: number;
  impactRadius: number;
};

export type GuardrailSection = {
  points: Point[];
  damaged?: boolean;
};

export const MOUNTAIN_WIDTH = 2800;
export const MOUNTAIN_HEIGHT = 2400;

function road(points: Point[], width: number): RoadSegment[] {
  return points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
    width,
  }));
}

const entranceRoads = road(
  [
    { x: 170, y: 2200 },
    { x: 320, y: 2100 },
    { x: 450, y: 1940 },
    { x: 500, y: 1770 },
    { x: 360, y: 1630 },
    { x: 330, y: 1490 },
    { x: 500, y: 1370 },
    { x: 700, y: 1400 },
    { x: 830, y: 1540 },
    { x: 760, y: 1700 },
    { x: 560, y: 1750 },
    { x: 700, y: 1850 },
    { x: 860, y: 1810 },
    { x: 970, y: 1660 },
    { x: 920, y: 1460 },
  ],
  100,
);

const upperPassRoads = road(
  [
    { x: 920, y: 1460 },
    { x: 1070, y: 1320 },
    { x: 1080, y: 1110 },
    { x: 940, y: 1010 },
    { x: 760, y: 1020 },
    { x: 650, y: 870 },
    { x: 760, y: 700 },
    { x: 1010, y: 690 },
    { x: 1200, y: 810 },
    { x: 1370, y: 840 },
    { x: 1510, y: 720 },
    { x: 1700, y: 800 },
    { x: 1790, y: 970 },
    { x: 1850, y: 1070 },
  ],
  88,
);

const lowerServiceRoads = road(
  [
    { x: 920, y: 1460 },
    { x: 1080, y: 1550 },
    { x: 1270, y: 1580 },
    { x: 1450, y: 1700 },
    { x: 1630, y: 1610 },
    { x: 1750, y: 1440 },
    { x: 1790, y: 1250 },
    { x: 1850, y: 1070 },
  ],
  84,
);

const landslideRoute = road(
  [
    { x: 920, y: 1460 },
    { x: 1110, y: 1390 },
    { x: 1270, y: 1280 },
    { x: 1450, y: 1220 },
    { x: 1620, y: 1120 },
    { x: 1850, y: 1070 },
  ],
  94,
);

const summitRoads = road(
  [
    { x: 1850, y: 1070 },
    { x: 1940, y: 1070 },
    { x: 2210, y: 1070 },
    { x: 2350, y: 1000 },
    { x: 2440, y: 850 },
    { x: 2280, y: 760 },
    { x: 2220, y: 600 },
    { x: 2350, y: 470 },
    { x: 2550, y: 420 },
    { x: 2590, y: 250 },
  ],
  92,
);

const cacheTrail = road(
  [
    { x: 760, y: 1020 },
    { x: 620, y: 1080 },
    { x: 450, y: 1080 },
    { x: 370, y: 980 },
  ],
  72,
);

const viewpointTrail = road(
  [
    { x: 1370, y: 840 },
    { x: 1390, y: 640 },
    { x: 1540, y: 560 },
  ],
  74,
);

export const MOUNTAIN_ROADS: RoadSegment[] = [
  ...entranceRoads,
  ...upperPassRoads,
  ...lowerServiceRoads,
  ...landslideRoute,
  ...summitRoads,
  ...cacheTrail,
  ...viewpointTrail,
];

export const MOUNTAIN_START = {
  x: 170,
  y: 2200,
  angle: Math.atan2(-100, 150),
};
export const MOUNTAIN_EXIT: Point = { x: 2590, y: 250 };
export const POWER_SWITCH_A: MountainMarker = {
  x: 1010,
  y: 690,
  radius: 88,
};
export const POWER_SWITCH_B: MountainMarker = {
  x: 1450,
  y: 1700,
  radius: 88,
};
export const BRIDGE_PANEL: MountainMarker = {
  x: 1810,
  y: 1160,
  radius: 92,
};
export const BRIDGE_BARRIER = {
  x: 1970,
  y: 1070,
  width: 22,
  height: 150,
  angle: 0,
};
export const BRIDGE_SPAN = {
  x: 2075,
  y: 1070,
  width: 270,
  height: 94,
};
export const CHECKPOINTS: MountainMarker[] = [
  { x: 500, y: 1770, radius: 76 },
  { x: 920, y: 1460, radius: 84 },
];
export const HIDDEN_CACHE: MountainMarker = {
  x: 370,
  y: 980,
  radius: 72,
};
export const ROCKFALL_ZONES: RockfallConfig[] = [
  { x: 850, y: 1150, triggerRadius: 220, impactRadius: 48 },
  { x: 1500, y: 1790, triggerRadius: 230, impactRadius: 48 },
  { x: 1710, y: 850, triggerRadius: 220, impactRadius: 46 },
];
export const LANDSLIDE_ROCKS: MountainMarker[] = [
  { x: 1408, y: 1158, radius: 57 },
  { x: 1440, y: 1220, radius: 61 },
  { x: 1472, y: 1282, radius: 57 },
];
export const SLIPPERY_ROADS: RoadSegment[] = [
  ...road(
    [
      { x: 1080, y: 1550 },
      { x: 1270, y: 1580 },
      { x: 1450, y: 1700 },
    ],
    84,
  ),
  ...road(
    [
      { x: 1630, y: 1610 },
      { x: 1750, y: 1440 },
    ],
    84,
  ),
];
export const DAMAGED_GUARDRAILS: GuardrailSection[] = [
  {
    points: [
      { x: 1784, y: 920 },
      { x: 1830, y: 994 },
      { x: 1884, y: 1035 },
    ],
    damaged: true,
  },
  {
    points: [
      { x: 1840, y: 1280 },
      { x: 1888, y: 1178 },
      { x: 1916, y: 1090 },
    ],
  },
  {
    points: [
      { x: 2385, y: 1008 },
      { x: 2472, y: 866 },
    ],
    damaged: true,
  },
];

function distanceToSegment(point: Point, segment: RoadSegment) {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection =
    ((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) /
    lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return Math.hypot(
    point.x - (segment.from.x + t * dx),
    point.y - (segment.from.y + t * dy),
  );
}

export function isOnMountainRoad(point: Point) {
  return MOUNTAIN_ROADS.some(
    (segment) =>
      distanceToSegment(point, segment) <= segment.width / 2 + 8,
  );
}

export function isOnSlipperyRoad(point: Point) {
  return SLIPPERY_ROADS.some(
    (segment) =>
      distanceToSegment(point, segment) <= segment.width / 2 + 4,
  );
}

export function isMountainObstacle(point: Point) {
  return LANDSLIDE_ROCKS.some(
    (rock) =>
      Math.hypot(point.x - rock.x, point.y - rock.y) < rock.radius,
  );
}

export function getForestTrees(): Point[] {
  const trees: Point[] = [];
  let seed = 44321;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let index = 0; index < 620; index += 1) {
    const point = {
      x: 35 + random() * (MOUNTAIN_WIDTH - 70),
      y: 35 + random() * (MOUNTAIN_HEIGHT - 70),
    };
    if (MOUNTAIN_ROADS.some((segment) => distanceToSegment(point, segment) < 112)) {
      continue;
    }
    if (
      point.x > 1910 &&
      point.x < 2250 &&
      point.y > 770 &&
      point.y < 1390
    ) {
      continue;
    }
    trees.push(point);
  }
  return trees;
}
