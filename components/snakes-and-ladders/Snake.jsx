import { getSquareCenter } from "../../lib/boardUtils";

export default function Snake({ head, tail, index }) {
  const start = getSquareCenter(head);
  const end = getSquareCenter(tail);
  const sway = index % 2 === 0 ? 1 : -1;
  const midY = (start.y + end.y) / 2;
  const path = `M ${start.x} ${start.y} C ${start.x + 70 * sway} ${start.y + 55}, ${start.x - 70 * sway} ${midY - 5}, ${start.x} ${midY} S ${end.x + 75 * sway} ${end.y - 42}, ${end.x} ${end.y}`;

  return (
    <g className={`snl-snake snl-snake-${index % 3}`}>
      <path d={path} className="snl-snake-shadow" />
      <path d={path} className="snl-snake-body" />
      <path d={path} className="snl-snake-highlight" />
      <circle cx={start.x} cy={start.y} r="23" className="snl-snake-head" />
      <circle cx={start.x - 8} cy={start.y - 4} r="3" className="snl-snake-eye" />
      <circle cx={start.x + 8} cy={start.y - 4} r="3" className="snl-snake-eye" />
      <path
        d={`M ${start.x - 5} ${start.y + 9} Q ${start.x} ${start.y + 4} ${start.x + 5} ${start.y + 9}`}
        className="snl-snake-smile"
      />
      <path
        d={`M ${end.x - 7} ${end.y + 13} Q ${end.x} ${end.y + 21} ${end.x + 7} ${end.y + 13}`}
        className="snl-snake-tail"
      />
    </g>
  );
}
