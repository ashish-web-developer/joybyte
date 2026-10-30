import { getSquareCenter } from "../../lib/boardUtils";

export default function Ladder({ bottom, top }) {
  const low = getSquareCenter(bottom);
  const high = getSquareCenter(top);
  const dx = high.x - low.x;
  const dy = high.y - low.y;
  const length = Math.hypot(dx, dy);
  const perpendicularX = (-dy / length) * 11;
  const perpendicularY = (dx / length) * 11;
  const rungCount = Math.max(3, Math.floor(length / 36));
  const rungs = Array.from({ length: rungCount - 1 }, (_, index) => {
    const progress = (index + 1) / rungCount;
    const x = low.x + dx * progress;
    const y = low.y + dy * progress;
    return (
      <line
        key={index}
        x1={x - perpendicularX}
        y1={y - perpendicularY}
        x2={x + perpendicularX}
        y2={y + perpendicularY}
        className="snl-ladder-rung"
      />
    );
  });

  return (
    <g className="snl-ladder">
      <line
        x1={low.x - perpendicularX}
        y1={low.y - perpendicularY}
        x2={high.x - perpendicularX}
        y2={high.y - perpendicularY}
        className="snl-ladder-rail-shadow"
      />
      <line
        x1={low.x + perpendicularX}
        y1={low.y + perpendicularY}
        x2={high.x + perpendicularX}
        y2={high.y + perpendicularY}
        className="snl-ladder-rail-shadow"
      />
      <line
        x1={low.x - perpendicularX}
        y1={low.y - perpendicularY}
        x2={high.x - perpendicularX}
        y2={high.y - perpendicularY}
        className="snl-ladder-rail"
      />
      <line
        x1={low.x + perpendicularX}
        y1={low.y + perpendicularY}
        x2={high.x + perpendicularX}
        y2={high.y + perpendicularY}
        className="snl-ladder-rail"
      />
      {rungs}
    </g>
  );
}
