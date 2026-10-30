"use client";

import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { PLAYER_IDS } from "../../lib/gameConfig";
import Dice from "./Dice";

export default function MobileRollBar({ game, onRoll }) {
  const isComputerTurn = game.turn === PLAYER_IDS.COMPUTER;
  const isReady = game.phase === "ready" && !isComputerTurn;

  return (
    <div className="snl-mobile-dock" aria-label="Quick dice controls">
      <div className="snl-mobile-dock-die">
        <Dice value={game.die} rolling={game.phase === "rolling"} />
      </div>
      <div className="snl-mobile-dock-copy" aria-live="polite">
        <strong>{isComputerTurn ? "Clover is thinking..." : "Your adventure!"}</strong>
        <span>
          {isComputerTurn
            ? <><Bot size={12} aria-hidden="true" /> Clover&apos;s turn</>
            : game.lastRoll ? `Last roll: ${game.lastRoll.value}` : "Ready when you are"}
        </span>
      </div>
      <motion.button
        type="button"
        className="snl-mobile-dock-button"
        onClick={onRoll}
        disabled={!isReady}
        whileTap={isReady ? { scale: 0.96 } : undefined}
      >
        {isComputerTurn ? "Thinking..." : game.phase === "ready" ? "Roll!" : "Rolling..."}
        {isReady ? <Sparkles size={15} aria-hidden="true" /> : null}
      </motion.button>
    </div>
  );
}
