import * as Phaser from "phaser";
import type { Point, RoadSegment } from "./world";
import type { Vehicle } from "./vehicle-system";

type RoadNode = {
  point: Point;
  edges: number[];
};

export type RoadRenderPath = {
  points: Point[];
  widths: number[];
  width: number;
};

type RoadSurfaceStyle = {
  shoulderColor: number;
  shoulderWidth: number;
  asphaltColor: number;
  wornColor: number;
  edgeColor: number;
  centerMarkColor?: number;
};

type SkidMark = {
  from: Point;
  to: Point;
  life: number;
};

function pointKey(point: Point) {
  return `${point.x},${point.y}`;
}

function smoothCenterline(
  points: Point[],
  widths: number[],
): { points: Point[]; widths: number[] } {
  if (points.length < 3) return { points, widths };

  const result = [points[0]];
  const resultWidths = [widths[0]];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const incomingLength = Phaser.Math.Distance.Between(
      previous.x,
      previous.y,
      corner.x,
      corner.y,
    );
    const outgoingLength = Phaser.Math.Distance.Between(
      corner.x,
      corner.y,
      next.x,
      next.y,
    );
    if (incomingLength < 1 || outgoingLength < 1) continue;

    const incoming = {
      x: (corner.x - previous.x) / incomingLength,
      y: (corner.y - previous.y) / incomingLength,
    };
    const outgoing = {
      x: (next.x - corner.x) / outgoingLength,
      y: (next.y - corner.y) / outgoingLength,
    };
    if (incoming.x * outgoing.x + incoming.y * outgoing.y > 0.985) {
      result.push(corner);
      resultWidths.push(widths[index]);
      continue;
    }

    const trim = Math.min(
      Math.min(widths[index - 1], widths[index + 1]) * 0.28,
      incomingLength * 0.2,
      outgoingLength * 0.2,
      42,
    );
    const entryProgress = 1 - trim / incomingLength;
    const exitProgress = trim / outgoingLength;
    const entry = {
      x: corner.x - incoming.x * trim,
      y: corner.y - incoming.y * trim,
    };
    const exit = {
      x: corner.x + outgoing.x * trim,
      y: corner.y + outgoing.y * trim,
    };
    result.push(entry);
    resultWidths.push(
      Phaser.Math.Linear(widths[index - 1], widths[index], entryProgress),
    );
    for (let step = 1; step <= 8; step += 1) {
      const t = step / 8;
      const inverse = 1 - t;
      result.push({
        x:
          inverse * inverse * entry.x +
          2 * inverse * t * corner.x +
          t * t * exit.x,
        y:
          inverse * inverse * entry.y +
          2 * inverse * t * corner.y +
          t * t * exit.y,
      });
      resultWidths.push(
        Phaser.Math.Linear(
          resultWidths[resultWidths.length - 1],
          Phaser.Math.Linear(
            widths[index],
            widths[index + 1],
            exitProgress,
          ),
          1 / (9 - step),
        ),
      );
    }
  }
  result.push(points[points.length - 1]);
  resultWidths.push(widths[widths.length - 1]);
  return { points: result, widths: resultWidths };
}

export function buildRoadRenderPaths(segments: RoadSegment[]): RoadRenderPath[] {
  const nodes = new Map<string, RoadNode>();
  const getNode = (point: Point) => {
    const key = pointKey(point);
    let node = nodes.get(key);
    if (!node) {
      node = { point, edges: [] };
      nodes.set(key, node);
    }
    return node;
  };
  segments.forEach((segment, index) => {
    getNode(segment.from).edges.push(index);
    getNode(segment.to).edges.push(index);
  });

  const visited = new Set<number>();
  const paths: RoadRenderPath[] = [];
  const trace = (startKey: string, firstEdge: number) => {
    const points = [nodes.get(startKey)!.point];
    let currentKey = startKey;
    let edgeIndex = firstEdge;
    const widths = [segments[firstEdge].width];

    while (!visited.has(edgeIndex)) {
      visited.add(edgeIndex);
      const edge = segments[edgeIndex];
      const nextKey =
        pointKey(edge.from) === currentKey
          ? pointKey(edge.to)
          : pointKey(edge.from);
      points.push(nodes.get(nextKey)!.point);
      widths.push(edge.width);
      const nextNode = nodes.get(nextKey)!;
      if (nextNode.edges.length !== 2) break;
      const nextEdge = nextNode.edges.find((index) => !visited.has(index));
      if (nextEdge === undefined) break;
      widths[widths.length - 1] =
        (edge.width + segments[nextEdge].width) / 2;
      currentKey = nextKey;
      edgeIndex = nextEdge;
    }

    const smoothed = smoothCenterline(points, widths);
    paths.push({
      ...smoothed,
      width: widths.reduce((total, width) => total + width, 0) / widths.length,
    });
  };

  nodes.forEach((node, key) => {
    if (node.edges.length === 2) return;
    node.edges.forEach((edgeIndex) => {
      if (!visited.has(edgeIndex)) trace(key, edgeIndex);
    });
  });
  segments.forEach((_, index) => {
    if (!visited.has(index)) {
      const segment = segments[index];
      trace(pointKey(segment.from), index);
    }
  });
  return paths;
}

function offsetPolyline(points: Point[], offset: number | number[]): Point[] {
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const tangentLength = Math.hypot(dx, dy) || 1;
    const normalX = -dy / tangentLength;
    const normalY = dx / tangentLength;
    const previousDx = point.x - previous.x;
    const previousDy = point.y - previous.y;
    const nextDx = next.x - point.x;
    const nextDy = next.y - point.y;
    const previousLength = Math.hypot(previousDx, previousDy) || 1;
    const nextLength = Math.hypot(nextDx, nextDy) || 1;
    const previousNormal = {
      x: -previousDy / previousLength,
      y: previousDx / previousLength,
    };
    const nextNormal = {
      x: -nextDy / nextLength,
      y: nextDx / nextLength,
    };
    const miterX = previousNormal.x + nextNormal.x;
    const miterY = previousNormal.y + nextNormal.y;
    const miterLength = Math.hypot(miterX, miterY) || 1;
    const miterScale = Phaser.Math.Clamp(
      1 / Math.max(0.35, (miterX / miterLength) * normalX + (miterY / miterLength) * normalY),
      -2.2,
      2.2,
    );
    const pointOffset = Array.isArray(offset) ? offset[index] : offset;
    return {
      x: point.x + (miterX / miterLength) * pointOffset * miterScale,
      y: point.y + (miterY / miterLength) * pointOffset * miterScale,
    };
  });
}

function fillCorridor(
  graphics: Phaser.GameObjects.Graphics,
  points: Point[],
  widths: number[],
  widthAdjustment: number,
  color: number,
  alpha: number,
) {
  if (points.length < 2) return;
  graphics.fillStyle(color, alpha);
  graphics.fillPoints(
    [
      ...offsetPolyline(
        points,
        widths.map((width) => (width + widthAdjustment) / 2),
      ),
      ...offsetPolyline(
        points,
        widths.map((width) => -(width + widthAdjustment) / 2),
      ).reverse(),
    ],
    true,
  );
}

function fillJunctions(
  graphics: Phaser.GameObjects.Graphics,
  segments: RoadSegment[],
  widthAdjustment: number,
  color: number,
  alpha: number,
) {
  const nodes = new Map<string, RoadNode>();
  segments.forEach((segment, index) => {
    for (const point of [segment.from, segment.to]) {
      const key = pointKey(point);
      let node = nodes.get(key);
      if (!node) {
        node = { point, edges: [] };
        nodes.set(key, node);
      }
      node.edges.push(index);
    }
  });

  nodes.forEach((node) => {
    if (node.edges.length < 2) return;
    const points = node.edges.flatMap((edgeIndex) => {
      const edge = segments[edgeIndex];
      const other = pointKey(edge.from) === pointKey(node.point) ? edge.to : edge.from;
      const dx = other.x - node.point.x;
      const dy = other.y - node.point.y;
      const length = Math.hypot(dx, dy) || 1;
      const halfWidth = Math.max(1, edge.width + widthAdjustment) / 2;
      return [
        {
          x: node.point.x - (dy / length) * halfWidth,
          y: node.point.y + (dx / length) * halfWidth,
        },
        {
          x: node.point.x + (dy / length) * halfWidth,
          y: node.point.y - (dx / length) * halfWidth,
        },
      ];
    });
    points.sort(
      (a, b) =>
        Math.atan2(a.y - node.point.y, a.x - node.point.x) -
        Math.atan2(b.y - node.point.y, b.x - node.point.x),
    );
    graphics.fillStyle(color, alpha);
    graphics.fillPoints(points, true);
  });
}

function polylineLength(points: Point[]) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += Phaser.Math.Distance.Between(
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
    );
  }
  return length;
}

function pointAtDistance(points: Point[], distance: number): Point {
  let remaining = distance;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    if (remaining <= length || index === points.length - 1) {
      const progress = length ? Phaser.Math.Clamp(remaining / length, 0, 1) : 0;
      return {
        x: Phaser.Math.Linear(from.x, to.x, progress),
        y: Phaser.Math.Linear(from.y, to.y, progress),
      };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

function drawCenterMarkings(
  graphics: Phaser.GameObjects.Graphics,
  paths: RoadRenderPath[],
  color: number,
) {
  graphics.lineStyle(2, color, 0.66);
  paths.forEach(({ points, width }) => {
    if (width < 88) return;
    const length = polylineLength(points);
    for (let distance = 24; distance < length - 18; distance += 56) {
      const start = pointAtDistance(points, distance);
      const end = pointAtDistance(points, Math.min(distance + 25, length - 18));
      graphics.lineBetween(start.x, start.y, end.x, end.y);
    }
  });
}

export function drawRoadNetwork(
  graphics: Phaser.GameObjects.Graphics,
  segments: RoadSegment[],
  style: RoadSurfaceStyle,
) {
  const paths = buildRoadRenderPaths(segments);
  fillJunctions(
    graphics,
    segments,
    style.shoulderWidth,
    style.shoulderColor,
    0.92,
  );
  paths.forEach(({ points, widths }) =>
    fillCorridor(
      graphics,
      points,
      widths,
      style.shoulderWidth,
      style.shoulderColor,
      0.92,
    ),
  );
  fillJunctions(graphics, segments, 0, style.asphaltColor, 1);
  paths.forEach(({ points, widths }) => {
    fillCorridor(graphics, points, widths, 0, style.asphaltColor, 1);
    fillCorridor(graphics, points, widths, -16, style.wornColor, 0.22);
    if (style.edgeColor) {
      for (const side of [-1, 1]) {
        const edge = offsetPolyline(
          points,
          widths.map((width) => side * (width / 2 - 5)),
        );
        graphics.lineStyle(1.5, style.edgeColor, 0.34);
        graphics.beginPath();
        graphics.moveTo(edge[0].x, edge[0].y);
        edge.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
        graphics.strokePath();
      }
    }
  });
  fillJunctions(graphics, segments, -16, style.wornColor, 0.22);
  if (style.centerMarkColor !== undefined) {
    drawCenterMarkings(graphics, paths, style.centerMarkColor);
  }

  let seed = 75217;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  graphics.fillStyle(0xc3c7bb, 0.1);
  paths.forEach(({ points, width }) => {
    const length = polylineLength(points);
    for (let distance = 10; distance < length; distance += 43) {
      const center = pointAtDistance(points, distance);
      const before = pointAtDistance(points, Math.max(0, distance - 2));
      const after = pointAtDistance(points, Math.min(length, distance + 2));
      const tangentLength = Math.hypot(after.x - before.x, after.y - before.y) || 1;
      const offset = (random() - 0.5) * Math.max(0, width - 16);
      const radius = 0.7 + random() * 1.2;
      graphics.fillEllipse(
        center.x - ((after.y - before.y) / tangentLength) * offset,
        center.y + ((after.x - before.x) / tangentLength) * offset,
        radius * 2.2,
        radius,
      );
    }
  });
}

export function addPulsingGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius: number,
  color: number,
  depth: number,
  duration: number,
  delay = 0,
) {
  const glow = scene.add
    .circle(x, y, radius, color, 0.14)
    .setDepth(depth);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.45, to: 0.9 },
    duration,
    delay,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
  return glow;
}

export class RoadSkidTrails {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private marks: SkidMark[] = [];
  private previous: [Point, Point] | null = null;
  private renderTimer = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.graphics = scene.add.graphics().setDepth(depth);
  }

  update(vehicle: Vehicle, dt: number) {
    if (Math.abs(vehicle.speed) > 85 && Math.abs(vehicle.lateralSpeed) > 19) {
      const rearX = vehicle.x - Math.cos(vehicle.angle) * 28;
      const rearY = vehicle.y - Math.sin(vehicle.angle) * 28;
      const sideX = -Math.sin(vehicle.angle) * 14;
      const sideY = Math.cos(vehicle.angle) * 14;
      const current: [Point, Point] = [
        { x: rearX + sideX, y: rearY + sideY },
        { x: rearX - sideX, y: rearY - sideY },
      ];
      if (this.previous) {
        current.forEach((point, index) => {
          const previous = this.previous?.[index];
          if (!previous || Phaser.Math.Distance.Between(
            previous.x,
            previous.y,
            point.x,
            point.y,
          ) < 2) return;
          this.marks.push({ from: previous, to: point, life: 2.2 });
        });
      }
      this.previous = current;
    } else {
      this.previous = null;
    }

    for (let index = this.marks.length - 1; index >= 0; index -= 1) {
      this.marks[index].life -= dt;
      if (this.marks[index].life <= 0) this.marks.splice(index, 1);
    }
    if (this.marks.length > 96) this.marks.splice(0, this.marks.length - 96);
    this.renderTimer -= dt;
    if (this.renderTimer > 0) return;
    this.renderTimer = 0.1;
    this.graphics.clear();
    this.marks.forEach((mark) => {
      this.graphics.lineStyle(2.4, 0x202321, Math.min(mark.life / 2.2, 0.34));
      this.graphics.lineBetween(
        mark.from.x,
        mark.from.y,
        mark.to.x,
        mark.to.y,
      );
    });
  }

  reset() {
    this.marks = [];
    this.previous = null;
    this.renderTimer = 0;
    this.graphics.clear();
  }
}
