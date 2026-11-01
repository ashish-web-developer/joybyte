import {
  BARRIER,
  DESTINATION,
  MAP_HEIGHT,
  MAP_WIDTH,
  ROAD_SEGMENTS,
  SWITCH,
} from "./engine/world";
import type { Point, RoadSegment } from "./engine/world";

export type NavigationLayout = {
  width: number;
  height: number;
  roads: RoadSegment[];
  barrier: Point;
  destination: Point;
  activeDestination?: Point;
  activeDestinationLabel?: string;
  primaryMarker: Point;
  secondaryMarker?: Point;
  barrierAngle?: number;
  checkpoints?: Array<{ point: Point; activated: boolean }>;
  collectible?: { point: Point; collected: boolean };
};

const CITY_LAYOUT: NavigationLayout = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  roads: ROAD_SEGMENTS,
  barrier: BARRIER,
  destination: DESTINATION,
  primaryMarker: SWITCH,
};

export function NavigationMap({
  player,
  heading,
  switchActivated,
  primaryActivated = switchActivated,
  secondaryActivated = switchActivated,
  barrierActivated = switchActivated,
  layout = CITY_LAYOUT,
  ariaLabel = "City map showing roads, your heading, the switch, barrier, and studio",
}: {
  player: Point;
  heading: number;
  switchActivated: boolean;
  primaryActivated?: boolean;
  secondaryActivated?: boolean;
  barrierActivated?: boolean;
  layout?: NavigationLayout;
  ariaLabel?: string;
}) {
  const mapPoint = (x: number, y: number) => ({
    x: (x / layout.width) * 100,
    y: (y / layout.height) * 78,
  });
  const carPoint = mapPoint(player.x, player.y);
  const primaryPoint = mapPoint(
    layout.primaryMarker.x,
    layout.primaryMarker.y,
  );
  const secondaryPoint = layout.secondaryMarker
    ? mapPoint(layout.secondaryMarker.x, layout.secondaryMarker.y)
    : null;
  const barrierPoint = mapPoint(layout.barrier.x, layout.barrier.y);
  const destinationPoint = mapPoint(
    layout.destination.x,
    layout.destination.y,
  );
  const activeDestinationPoint = layout.activeDestination
    ? mapPoint(layout.activeDestination.x, layout.activeDestination.y)
    : null;
  const barrierHalfLength = 2.8;
  const barrierAngle = layout.barrierAngle ?? 0;
  const barrierDx = Math.cos(barrierAngle) * barrierHalfLength;
  const barrierDy = Math.sin(barrierAngle) * barrierHalfLength;

  return (
    <svg
      className="er-minimap"
      viewBox="0 0 100 78"
      role="img"
      aria-label={ariaLabel}
    >
      <rect width="100" height="78" rx="4" fill="#222a29" />
      {layout.roads.map((road, index) => {
        const from = mapPoint(road.from.x, road.from.y);
        const to = mapPoint(road.to.x, road.to.y);
        return (
          <line
            key={index}
            className="er-map-road"
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#69716b"
            strokeWidth={road.width > 160 ? 2.3 : 1.65}
            strokeLinecap="round"
          />
        );
      })}
      <line
        className="er-map-barrier"
        x1={barrierPoint.x - barrierDx}
        y1={barrierPoint.y - barrierDy}
        x2={barrierPoint.x + barrierDx}
        y2={barrierPoint.y + barrierDy}
        stroke={barrierActivated ? "#91a47f" : "#c06d5a"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle
        cx={primaryPoint.x}
        cy={primaryPoint.y}
        r="2.1"
        fill={primaryActivated ? "#a8bd91" : "#e4bd76"}
      />
      {secondaryPoint && (
        <circle
          cx={secondaryPoint.x}
          cy={secondaryPoint.y}
          r="1.9"
          fill={secondaryActivated ? "#a8bd91" : "#92b0b1"}
        />
      )}
      {layout.checkpoints?.map(({ point, activated }, index) => {
        const checkpoint = mapPoint(point.x, point.y);
        return (
          <rect
            key={`checkpoint-${index}`}
            x={checkpoint.x - 1.1}
            y={checkpoint.y - 1.1}
            width="2.2"
            height="2.2"
            rx=".4"
            fill={activated ? "#a8bd91" : "#d9d4c2"}
            stroke="#222a29"
            strokeWidth=".5"
          />
        );
      })}
      {layout.collectible?.collected && (
        <path
          d={`M ${mapPoint(layout.collectible.point.x, layout.collectible.point.y).x} ${mapPoint(layout.collectible.point.x, layout.collectible.point.y).y - 2} l 2 2 -2 2 -2 -2 z`}
          fill="#ebcf7d"
          stroke="#222a29"
          strokeWidth=".5"
        />
      )}
      <circle
        cx={destinationPoint.x}
        cy={destinationPoint.y}
        r="2.2"
        fill={barrierActivated ? "#d58c64" : "#7d8179"}
      />
      {activeDestinationPoint && (
        <g
          className="er-map-active-destination"
          aria-label={`Next destination: ${layout.activeDestinationLabel ?? "mission objective"}`}
        >
          <title>
            {`Next destination: ${layout.activeDestinationLabel ?? "mission objective"}`}
          </title>
          <circle
            cx={activeDestinationPoint.x}
            cy={activeDestinationPoint.y}
            r="4.3"
            fill="rgba(240, 199, 126, .16)"
            stroke="#f0c77e"
            strokeWidth=".8"
          />
          <path
            d={`M ${activeDestinationPoint.x} ${activeDestinationPoint.y - 2.4} l 2.4 2.4 -2.4 2.4 -2.4 -2.4 z`}
            fill="#f0c77e"
            stroke="#222a29"
            strokeWidth=".5"
          />
        </g>
      )}
      <circle cx={carPoint.x} cy={carPoint.y} r="4.3" fill="#222a29" />
      <g
        transform={`translate(${carPoint.x} ${carPoint.y}) rotate(${(heading * 180) / Math.PI})`}
      >
        <path
          d="M 4.1 0 L -3.2 -2.6 L -2.2 0 L -3.2 2.6 Z"
          fill="#f3dfb2"
          stroke="#222a29"
          strokeWidth=".45"
        />
      </g>
    </svg>
  );
}
