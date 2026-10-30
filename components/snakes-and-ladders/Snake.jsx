import { getSquareCenter } from "../../lib/boardUtils";

export default function Snake({ head, tail, index, dramatic = false }) {
  const start = getSquareCenter(head);
  const end = getSquareCenter(tail);
  const sway = index % 2 === 0 ? 1 : -1;
  const midY = (start.y + end.y) / 2;
  const path = dramatic
    ? `M ${start.x} ${start.y} C ${start.x - 82} ${start.y + 76}, ${start.x + 114} ${start.y + 105}, ${start.x + 28} ${start.y + 190} C ${start.x - 83} ${start.y + 285}, ${start.x + 105} ${start.y + 338}, ${start.x - 8} ${start.y + 450} C ${start.x - 123} ${start.y + 570}, ${end.x + 91} ${end.y - 176}, ${end.x} ${end.y}`
    : `M ${start.x} ${start.y} C ${start.x + 70 * sway} ${start.y + 55}, ${start.x - 70 * sway} ${midY - 5}, ${start.x} ${midY} S ${end.x + 75 * sway} ${end.y - 42}, ${end.x} ${end.y}`;

  return (
    <g className={`snl-snake snl-snake-${index % 3} ${dramatic ? "snl-snake-dramatic" : ""}`}>
      {dramatic && <path d={path} className="snl-snake-outline" />}
      <path d={path} className="snl-snake-shadow" />
      <path d={path} className="snl-snake-body" />
      <path d={path} className="snl-snake-highlight" />
      <circle cx={start.x} cy={start.y} r={dramatic ? "30" : "23"} className="snl-snake-head" />
      {dramatic && <path d={`M ${start.x - 25} ${start.y - 8} Q ${start.x} ${start.y - 35} ${start.x + 25} ${start.y - 8}`} className="snl-snake-crown" />}
      <circle cx={start.x - 8} cy={start.y - 4} r={dramatic ? "4" : "3"} className="snl-snake-eye" />
      <circle cx={start.x + 8} cy={start.y - 4} r={dramatic ? "4" : "3"} className="snl-snake-eye" />
      <path
        d={`M ${start.x - (dramatic ? 7 : 5)} ${start.y + (dramatic ? 13 : 9)} Q ${start.x} ${start.y + (dramatic ? 4 : 4)} ${start.x + (dramatic ? 7 : 5)} ${start.y + (dramatic ? 13 : 9)}`}
        className="snl-snake-smile"
      />
      <path
        d={`M ${end.x - 7} ${end.y + 13} Q ${end.x} ${end.y + 21} ${end.x + 7} ${end.y + 13}`}
        className="snl-snake-tail"
      />
    </g>
  );
}
