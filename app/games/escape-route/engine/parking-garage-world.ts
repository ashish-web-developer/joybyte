import type { Point, RoadSegment } from "./world";

export type GarageCar = Point & {
  angle: number;
  color: number;
};

export type GaragePillar = Point & {
  radius: number;
};

export type GarageBay = Point & {
  angle: number;
};

export const GARAGE_WIDTH = 1800;
export const GARAGE_HEIGHT = 1400;

export const GARAGE_ROADS: RoadSegment[] = [
  { from: { x: 250, y: 1300 }, to: { x: 250, y: 1070 }, width: 108 },
  { from: { x: 250, y: 1070 }, to: { x: 430, y: 900 }, width: 100 },
  { from: { x: 430, y: 900 }, to: { x: 900, y: 900 }, width: 96 },
  { from: { x: 900, y: 900 }, to: { x: 1110, y: 790 }, width: 88 },
  { from: { x: 1110, y: 790 }, to: { x: 1310, y: 790 }, width: 88 },
  { from: { x: 1310, y: 790 }, to: { x: 1480, y: 640 }, width: 82 },
  { from: { x: 1480, y: 640 }, to: { x: 1480, y: 460 }, width: 180 },
  { from: { x: 1480, y: 460 }, to: { x: 1300, y: 430 }, width: 78 },
  { from: { x: 1300, y: 430 }, to: { x: 1000, y: 430 }, width: 90 },
  { from: { x: 1000, y: 430 }, to: { x: 780, y: 430 }, width: 90 },
  { from: { x: 780, y: 430 }, to: { x: 570, y: 590 }, width: 88 },
  { from: { x: 570, y: 590 }, to: { x: 430, y: 720 }, width: 88 },
  { from: { x: 430, y: 720 }, to: { x: 430, y: 900 }, width: 96 },
  { from: { x: 1000, y: 430 }, to: { x: 1000, y: 790 }, width: 78 },
  { from: { x: 1000, y: 790 }, to: { x: 900, y: 900 }, width: 80 },
  { from: { x: 1000, y: 430 }, to: { x: 1000, y: 270 }, width: 100 },
  { from: { x: 1000, y: 270 }, to: { x: 1000, y: 120 }, width: 108 },
  { from: { x: 900, y: 900 }, to: { x: 900, y: 1110 }, width: 76 },
  { from: { x: 900, y: 1110 }, to: { x: 720, y: 1240 }, width: 72 },
  { from: { x: 720, y: 1240 }, to: { x: 440, y: 1240 }, width: 72 },
  { from: { x: 1480, y: 640 }, to: { x: 1640, y: 710 }, width: 66 },
];

export const GARAGE_START = {
  x: 250,
  y: 1280,
  angle: -Math.PI / 2,
};
export const GARAGE_DESTINATION: Point = { x: 1000, y: 106 };
export const TICKET_POINT: Point = { x: 1624, y: 704 };
export const TERMINAL_POINT: Point = { x: 1535, y: 492 };
export const TICKET_RADIUS = 92;
export const TERMINAL_RADIUS = 76;
export const GARAGE_BARRIER = {
  x: 1000,
  y: 196,
  width: 116,
  height: 22,
  angle: 0,
};
export const ONE_WAY_SEGMENT = GARAGE_ROADS[2];

export const GARAGE_PILLARS: GaragePillar[] = [
  { x: 690, y: 700, radius: 25 },
  { x: 850, y: 680, radius: 25 },
  { x: 1160, y: 620, radius: 24 },
  { x: 1330, y: 590, radius: 24 },
  { x: 650, y: 1030, radius: 25 },
  { x: 820, y: 1065, radius: 25 },
  { x: 1110, y: 1010, radius: 25 },
  { x: 1260, y: 1030, radius: 25 },
  { x: 1600, y: 930, radius: 25 },
  { x: 1580, y: 310, radius: 25 },
  { x: 720, y: 240, radius: 24 },
  { x: 400, y: 440, radius: 24 },
];

export const GARAGE_CARS: GarageCar[] = [
  { x: 675, y: 585, angle: Math.PI / 2, color: 0x7d7770 },
  { x: 845, y: 560, angle: Math.PI / 2, color: 0x596a70 },
  { x: 1160, y: 550, angle: Math.PI / 2, color: 0x9a6756 },
  { x: 1350, y: 565, angle: Math.PI / 2, color: 0xc3b99f },
  { x: 635, y: 1150, angle: 0, color: 0x6d7768 },
  { x: 820, y: 1160, angle: 0, color: 0x8c5c50 },
  { x: 1130, y: 1120, angle: 0, color: 0x61707a },
  { x: 1290, y: 1115, angle: 0, color: 0xa39b88 },
  { x: 1585, y: 1040, angle: Math.PI / 2, color: 0x77836f },
  { x: 1600, y: 385, angle: Math.PI / 2, color: 0x9a7552 },
  { x: 650, y: 330, angle: Math.PI / 2, color: 0x6b6660 },
  { x: 355, y: 480, angle: 0, color: 0x9b5148 },
];

export const GARAGE_BAYS: GarageBay[] = [
  { x: 650, y: 585, angle: Math.PI / 2 },
  { x: 720, y: 585, angle: Math.PI / 2 },
  { x: 820, y: 560, angle: Math.PI / 2 },
  { x: 890, y: 560, angle: Math.PI / 2 },
  { x: 1130, y: 550, angle: Math.PI / 2 },
  { x: 1200, y: 550, angle: Math.PI / 2 },
  { x: 1320, y: 565, angle: Math.PI / 2 },
  { x: 1390, y: 565, angle: Math.PI / 2 },
  { x: 635, y: 1150, angle: 0 },
  { x: 710, y: 1150, angle: 0 },
  { x: 820, y: 1160, angle: 0 },
  { x: 895, y: 1160, angle: 0 },
  { x: 1130, y: 1120, angle: 0 },
  { x: 1205, y: 1120, angle: 0 },
  { x: 1290, y: 1115, angle: 0 },
  { x: 1365, y: 1115, angle: 0 },
  { x: 1585, y: 1040, angle: Math.PI / 2 },
  { x: 1585, y: 970, angle: Math.PI / 2 },
  { x: 1600, y: 385, angle: Math.PI / 2 },
  { x: 1600, y: 315, angle: Math.PI / 2 },
  { x: 650, y: 330, angle: Math.PI / 2 },
  { x: 355, y: 480, angle: 0 },
];

export const ONE_WAY_ARROWS: Point[] = [
  { x: 545, y: 900 },
  { x: 690, y: 900 },
  { x: 830, y: 900 },
];

export function distanceToGarageSegment(point: Point, segment: RoadSegment) {
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

export function isOnGarageRoad(point: Point) {
  return GARAGE_ROADS.some(
    (road) => distanceToGarageSegment(point, road) <= road.width / 2 + 5,
  );
}

export function isAgainstOneWayLane(point: Point, angle: number, speed: number) {
  if (speed === 0 || distanceToGarageSegment(point, ONE_WAY_SEGMENT) > 42) {
    return false;
  }
  const travelDirection = angle + (speed < 0 ? Math.PI : 0);
  const laneDirection = Math.atan2(
    ONE_WAY_SEGMENT.to.y - ONE_WAY_SEGMENT.from.y,
    ONE_WAY_SEGMENT.to.x - ONE_WAY_SEGMENT.from.x,
  );
  return Math.cos(travelDirection - laneDirection) < -0.35;
}

export function isGarageObstacle(point: Point) {
  if (
    Math.hypot(
      point.x - TERMINAL_POINT.x,
      point.y - TERMINAL_POINT.y,
    ) < 18
  ) {
    return true;
  }

  if (
    GARAGE_PILLARS.some(
      (pillar) =>
        Math.hypot(point.x - pillar.x, point.y - pillar.y) < pillar.radius,
    )
  ) {
    return true;
  }

  return GARAGE_CARS.some((car) => {
    const dx = point.x - car.x;
    const dy = point.y - car.y;
    const cosine = Math.cos(car.angle);
    const sine = Math.sin(car.angle);
    const localX = dx * cosine + dy * sine;
    const localY = -dx * sine + dy * cosine;
    return Math.abs(localX) < 33 && Math.abs(localY) < 20;
  });
}
