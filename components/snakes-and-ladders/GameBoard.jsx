"use client";

import { LADDERS, PLAYER_IDS, SNAKES } from "../../lib/gameConfig";
import { getSquareAtGridPosition } from "../../lib/boardUtils";
import BoardCell from "./BoardCell";
import Ladder from "./Ladder";
import PlayerToken from "./PlayerToken";
import Snake from "./Snake";

export default function GameBoard({ players, turn, phase }) {
  const cells = Array.from({ length: 100 }, (_, index) => {
    const row = Math.floor(index / 10);
    const col = index % 10;
    const square = getSquareAtGridPosition(row, col);
    return <BoardCell key={square} square={square} />;
  });

  return (
    <div className={`snl-board-frame ${phase === "moving" ? "snl-board-moving" : ""}`}>
      <div className="snl-board" role="img" aria-label="Snakes and ladders board with squares numbered in a zigzag from 1 to 100">
        <div className="snl-grid">{cells}</div>
        <svg className="snl-board-art" viewBox="0 0 1000 1000" aria-hidden="true">
          <defs>
            <filter id="snl-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#392d35" floodOpacity=".18" />
            </filter>
          </defs>
          {LADDERS.map((ladder) => (
            <Ladder key={ladder.bottom} {...ladder} />
          ))}
          {SNAKES.map((snake, index) => (
            <Snake key={snake.head} {...snake} index={index} />
          ))}
        </svg>
        <div className="snl-token-layer" aria-hidden="true">
          <PlayerToken player={players[PLAYER_IDS.HUMAN]} square={players[PLAYER_IDS.HUMAN].position} offset={-1.5} active={turn === PLAYER_IDS.HUMAN} />
          <PlayerToken player={players[PLAYER_IDS.COMPUTER]} square={players[PLAYER_IDS.COMPUTER].position} offset={1.5} active={turn === PLAYER_IDS.COMPUTER} />
        </div>
      </div>
      <div className="snl-start-tray">
        <div className="snl-start-tray-label">
          <span className="snl-start-mark">0</span>
          <span>Ready at the starting line</span>
        </div>
        <div className="snl-start-tokens" aria-label="Both players start at square 0">
          {Object.values(players).filter((player) => player.position === 0).map((player) => (
            <span key={player.icon} className={`snl-start-token snl-token-${player.icon}`} title={`${player.name} starts at 0`}>
              <span className="snl-token-face" />
            </span>
          ))}
        </div>
      </div>
      <div className="snl-board-coordinates">
        <span>01 — THE MEADOW</span>
        <span>100 — THE SUMMIT</span>
      </div>
    </div>
  );
}
