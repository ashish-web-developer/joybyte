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
  primaryMarker: Point;
  secondaryMarker?: Point;
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
  layout = CITY_LAYOUT,
  ariaLabel = "City map showing roads, your heading, the switch, barrier, and studio",
}: {
  player: Point;
  heading: number;
  switchActivated: boolean;
  primaryActivated?: boolean;
  secondaryActivated?: boolean;
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
        x1={barrierPoint.x - 2.8}
        y1={barrierPoint.y}
        x2={barrierPoint.x + 2.8}
        y2={barrierPoint.y}
        stroke={switchActivated ? "#91a47f" : "#c06d5a"}
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
      <circle
        cx={destinationPoint.x}
        cy={destinationPoint.y}
        r="2.2"
        fill={switchActivated ? "#d58c64" : "#7d8179"}
      />
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
