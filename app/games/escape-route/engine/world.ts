export type Point = {
  x: number;
  y: number;
};

export type RoadSegment = {
  from: Point;
  to: Point;
  width: number;
};

export type Building = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  roof: number;
};

export type ParkedCar = {
  x: number;
  y: number;
  angle: number;
  color: number;
};

export type StreetFixture = Point & {
  angle?: number;
};

export type SolidFixture = Point & {
  radius: number;
};

export type PuzzleSwitchConfig = Point & {
  interactionRadius: number;
};

export type BarrierConfig = Point & {
  width: number;
  height: number;
  angle: number;
};

export const MAP_WIDTH = 2800;
export const MAP_HEIGHT = 2200;
export const ROAD_SEGMENTS: RoadSegment[] = [
  { from: { x: 260, y: 260 }, to: { x: 2540, y: 260 }, width: 184 },
  { from: { x: 2540, y: 260 }, to: { x: 2540, y: 1940 }, width: 184 },
  { from: { x: 2540, y: 1940 }, to: { x: 260, y: 1940 }, width: 184 },
  { from: { x: 260, y: 1940 }, to: { x: 260, y: 260 }, width: 184 },
  { from: { x: 260, y: 820 }, to: { x: 2540, y: 820 }, width: 168 },
  { from: { x: 260, y: 1370 }, to: { x: 2540, y: 1370 }, width: 200 },
  { from: { x: 850, y: 260 }, to: { x: 850, y: 1940 }, width: 168 },
  { from: { x: 1450, y: 260 }, to: { x: 1450, y: 1940 }, width: 168 },
  { from: { x: 2050, y: 260 }, to: { x: 2050, y: 1940 }, width: 168 },
  { from: { x: 850, y: 1370 }, to: { x: 1050, y: 1190 }, width: 148 },
  { from: { x: 1050, y: 1190 }, to: { x: 1260, y: 1190 }, width: 148 },
  { from: { x: 1260, y: 1190 }, to: { x: 1450, y: 1370 }, width: 148 },
  { from: { x: 1450, y: 820 }, to: { x: 1700, y: 1050 }, width: 148 },
  { from: { x: 1700, y: 1050 }, to: { x: 1870, y: 1050 }, width: 148 },
  { from: { x: 1870, y: 1050 }, to: { x: 2050, y: 820 }, width: 148 },
  { from: { x: 2050, y: 1370 }, to: { x: 2260, y: 1570 }, width: 144 },
  { from: { x: 2260, y: 1570 }, to: { x: 2540, y: 1570 }, width: 144 },
  { from: { x: 850, y: 820 }, to: { x: 1040, y: 640 }, width: 144 },
  { from: { x: 1040, y: 640 }, to: { x: 1260, y: 640 }, width: 144 },
  { from: { x: 1260, y: 640 }, to: { x: 1450, y: 820 }, width: 144 },
  { from: { x: 850, y: 820 }, to: { x: 670, y: 650 }, width: 122 },
  { from: { x: 850, y: 1370 }, to: { x: 940, y: 1530 }, width: 116 },
  { from: { x: 1450, y: 1370 }, to: { x: 1650, y: 1570 }, width: 124 },
  { from: { x: 2050, y: 820 }, to: { x: 2200, y: 650 }, width: 120 },
];

export const ROUTE: Point[] = [
  { x: 260, y: 1810 },
  { x: 260, y: 1370 },
  { x: 2050, y: 1370 },
  { x: 2260, y: 1570 },
  { x: 2390, y: 1570 },
  { x: 2260, y: 1570 },
  { x: 2050, y: 1370 },
  { x: 1450, y: 1370 },
  { x: 1450, y: 820 },
  { x: 1450, y: 260 },
];

export const START = { x: 260, y: 1810, angle: -Math.PI / 2 };
export const DESTINATION = { x: 1450, y: 260 };
export const SWITCH: PuzzleSwitchConfig = {
  x: 2390,
  y: 1570,
  interactionRadius: 86,
};
export const BARRIER: BarrierConfig = {
  x: 1450,
  y: 535,
  width: 148,
  height: 22,
  angle: 0,
};

export const BUILDINGS: Building[] = [
  { x: 505, y: 505, width: 176, height: 190, color: 0x77766d, roof: 0xaaa18d },
  { x: 1160, y: 500, width: 220, height: 176, color: 0x6a716c, roof: 0x9ca49a },
  { x: 1760, y: 505, width: 196, height: 182, color: 0x81796f, roof: 0xb4a38d },
  { x: 2290, y: 505, width: 210, height: 168, color: 0x6d7476, roof: 0xa2aaa7 },
  { x: 500, y: 1090, width: 192, height: 184, color: 0x837b70, roof: 0xb5a991 },
  { x: 1140, y: 1005, width: 186, height: 160, color: 0x707975, roof: 0x9ca59a },
  { x: 1800, y: 1200, width: 180, height: 120, color: 0x77716b, roof: 0xa79b8d },
  { x: 2310, y: 1080, width: 190, height: 184, color: 0x687275, roof: 0x9da5a2 },
  { x: 505, y: 1650, width: 188, height: 168, color: 0x70766e, roof: 0xa5a58f },
  { x: 1140, y: 1660, width: 206, height: 180, color: 0x83796e, roof: 0xb1a28e },
  { x: 1750, y: 1690, width: 216, height: 164, color: 0x6c7476, roof: 0xa1a8a2 },
  { x: 2320, y: 1760, width: 190, height: 132, color: 0x82766c, roof: 0xb3a38e },
];

export const PARKED_CARS: ParkedCar[] = [
  { x: 560, y: 766, angle: 0, color: 0x9f5145 },
  { x: 1710, y: 874, angle: Math.PI, color: 0xc3b89f },
  { x: 1110, y: 1138, angle: 0, color: 0x4d6467 },
  { x: 2250, y: 875, angle: Math.PI, color: 0x7d8c65 },
  { x: 1880, y: 1560, angle: 0, color: 0x9f7857 },
];

export const PARKING_AREAS: Array<{
  x: number;
  y: number;
  width: number;
  height: number;
}> = [
  { x: 1110, y: 1138, width: 174, height: 74 },
  { x: 1880, y: 1560, width: 190, height: 82 },
  { x: 560, y: 766, width: 126, height: 72 },
];

export const TRAFFIC_CONES: SolidFixture[] = [
  { x: 666, y: 650, radius: 15 },
  { x: 941, y: 1531, radius: 14 },
  { x: 2202, y: 652, radius: 14 },
];

export const STREETLIGHTS: StreetFixture[] = [
  { x: 382, y: 1110 },
  { x: 740, y: 1050 },
  { x: 1600, y: 1150 },
  { x: 2200, y: 1240 },
  { x: 2430, y: 1830 },
  { x: 1320, y: 950 },
  { x: 1880, y: 700 },
];

export const ROAD_SIGNS: StreetFixture[] = [
  { x: 405, y: 1260, angle: -Math.PI / 2 },
  { x: 1960, y: 1220, angle: Math.PI / 2 },
  { x: 1350, y: 1120, angle: Math.PI / 2 },
  { x: 1220, y: 915, angle: 0 },
];

export const TREES: Point[] = [
  { x: 390, y: 390 }, { x: 690, y: 690 }, { x: 760, y: 460 },
  { x: 1030, y: 400 }, { x: 1310, y: 535 }, { x: 1580, y: 390 },
  { x: 1940, y: 690 }, { x: 2210, y: 405 }, { x: 2410, y: 650 },
  { x: 380, y: 1030 }, { x: 690, y: 1190 }, { x: 1020, y: 1050 },
  { x: 1330, y: 1080 }, { x: 1610, y: 1190 }, { x: 1930, y: 1190 },
  { x: 2370, y: 1200 }, { x: 390, y: 1580 }, { x: 690, y: 1810 },
  { x: 1010, y: 1550 }, { x: 1300, y: 1810 }, { x: 1630, y: 1580 },
  { x: 1950, y: 1790 }, { x: 2400, y: 1770 },
];

export function distanceToSegment(point: Point, segment: RoadSegment) {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection =
    ((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) /
    lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  const nearestX = segment.from.x + t * dx;
  const nearestY = segment.from.y + t * dy;
  return Math.hypot(point.x - nearestX, point.y - nearestY);
}

export function isOnRoad(point: Point) {
  return ROAD_SEGMENTS.some(
    (segment) => distanceToSegment(point, segment) <= segment.width / 2 + 14,
  );
}

export function isBlocked(point: Point) {
  if (
    BUILDINGS.some(
      (building) =>
        point.x >= building.x - building.width / 2 - 8 &&
        point.x <= building.x + building.width / 2 + 8 &&
        point.y >= building.y - building.height / 2 - 8 &&
        point.y <= building.y + building.height / 2 + 8,
    )
  ) {
    return true;
  }

  if (TREES.some((tree) => Math.hypot(point.x - tree.x, point.y - tree.y) < 27)) {
    return true;
  }

  if (
    TRAFFIC_CONES.some(
      (cone) => Math.hypot(point.x - cone.x, point.y - cone.y) < cone.radius,
    )
  ) {
    return true;
  }

  if (
    STREETLIGHTS.some(
      (light) => Math.hypot(point.x - light.x, point.y - light.y) < 12,
    ) ||
    ROAD_SIGNS.some(
      (sign) => Math.hypot(point.x - sign.x, point.y - sign.y) < 14,
    )
  ) {
    return true;
  }

  return PARKED_CARS.some((car) => {
    const dx = point.x - car.x;
    const dy = point.y - car.y;
    const cosine = Math.cos(car.angle);
    const sine = Math.sin(car.angle);
    const localX = dx * cosine + dy * sine;
    const localY = -dx * sine + dy * cosine;
    return Math.abs(localX) < 44 && Math.abs(localY) < 26;
  });
}
