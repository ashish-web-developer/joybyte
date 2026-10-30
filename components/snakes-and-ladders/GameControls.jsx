"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { PLAYER_IDS } from "../../lib/gameConfig";
import Dice from "./Dice";

export default function GameControls({ game, onRoll }) {
  const isHumanTurn = game.turn === PLAYER_IDS.HUMAN;
  const isReady = game.phase === "ready" && isHumanTurn;
  const rollLabel = game.phase === "rolling" && !isHumanTurn
    ? "Clover is rolling..."
    : game.phase === "moving"
      ? "Moving..."
      : isReady
        ? "Roll the dice"
        : "Clover's turn";

  return (
    <section className="snl-control-card" aria-label="Game controls">
      <div className="snl-control-heading">
        <div>
          <span className="snl-section-kicker">YOUR MOVE</span>
          <h2>Make it count.</h2>
        </div>
        <span className="snl-control-spark"><Sparkles size={16} aria-hidden="true" /></span>
      </div>
      <div className="snl-dice-stage">
        <span className="snl-dice-caption">{game.phase === "rolling" ? "ROLLING..." : "LAST ROLL"}</span>
        <Dice value={game.die} rolling={game.phase === "rolling"} />
        <span className="snl-dice-value">
          {game.lastRoll ? `${game.lastRoll.value} / 6` : "Ready when you are"}
        </span>
      </div>
      <motion.button
        type="button"
        className="snl-roll-button"
        onClick={onRoll}
        disabled={!isReady}
        whileHover={isReady ? { y: -2, scale: 1.01 } : undefined}
        whileTap={isReady ? { scale: 0.98 } : undefined}
      >
        {rollLabel}
        <ArrowUpRight size={17} aria-hidden="true" />
      </motion.button>
      <div className="snl-turn-message" aria-live="polite">
        <span className={`snl-message-indicator ${game.phase === "ready" ? "snl-message-ready" : ""}`} />
        <p>{game.message}</p>
      </div>
      <div className="snl-control-divider" />
      <div className="snl-last-roll">
        <span>LAST ROLL</span>
        <strong>
          {game.lastRoll
            ? `${game.lastRoll.playerId === PLAYER_IDS.HUMAN ? "You" : "Clover"} rolled ${game.lastRoll.value}`
            : "No rolls yet"}
        </strong>
      </div>
      <p className="snl-rules-note">
        Need an exact roll for 100. Land on a ladder to climb, or a snake to slide.
      </p>
    </section>
  );
}
