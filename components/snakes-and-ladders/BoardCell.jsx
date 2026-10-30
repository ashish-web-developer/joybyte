export default function BoardCell({ square }) {
  const isStart = square === 1;
  const isFinish = square === 100;
  const isWarm = (Math.floor((square - 1) / 10) + square) % 2 === 0;

  return (
    <div
      className={[
        "snl-cell",
        isWarm ? "snl-cell-warm" : "snl-cell-cool",
        isStart ? "snl-cell-start" : "",
        isFinish ? "snl-cell-finish" : "",
      ].filter(Boolean).join(" ")}
      aria-label={`Square ${square}${isStart ? ", start" : ""}${isFinish ? ", finish" : ""}`}
    >
      <span className="snl-cell-number">{square}</span>
      {isStart && <span className="snl-cell-tag">START</span>}
      {isFinish && <span className="snl-cell-tag">FINISH</span>}
    </div>
  );
}
