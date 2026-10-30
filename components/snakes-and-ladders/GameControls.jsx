"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Bot } from "lucide-react";
import { PLAYER_IDS } from "../../lib/gameConfig";
import Dice from "./Dice";

export default function GameControls({ game, onRoll }) {
  const isHumanTurn = game.turn === PLAYER_IDS.HUMAN;
  const isReady = game.phase === "ready" && isHumanTurn;
  const isComputerTurn = !isHumanTurn;
  const rollLabel = isReady ? "Roll the dice" : isComputerTurn ? "Clover's turn" : "Moving...";

  const getFriendlyMessage = () => {
    if (game.phase === "ready" && isComputerTurn) return "Clover is thinking... What will she roll?";
    const actor = game.message.startsWith("Clover") ? "Clover" : "You";
    if (game.message.includes("climbed a ladder")) return `Amazing! ${actor} climbed a ladder!`;
    if (game.message.includes("slid down a snake")) return `Oh no! ${actor} met a sneaky snake!`;
    if (game.message.includes("exact roll")) return "So close! You need an exact roll for 100.";
    if (game.message.includes("reached square 100")) return "Hooray! The summit is yours!";
    if (game.message.includes("rolled a")) {
      return game.message.replace("rolled a", "rolled a lucky");
    }
    if (game.message.includes("landed on square")) {
      return actor === "Clover"
        ? "Clover is catching up!"
        : "Nice roll! Keep that good luck going.";
    }
    if (!game.lastRoll) return "Your adventure begins! Ready, set, roll!";
    return game.message;
  };

  return (
    <section className="snl-control-card" aria-label="Game controls">
      <div className="snl-control-heading">
        <div>
          <span className="snl-section-kicker">{isComputerTurn ? "CLOVER'S TURN" : "YOUR TURN"}</span>
          <h2>{isComputerTurn ? "Clover's turn" : "Your turn!"}</h2>
        </div>
      </div>
      <div className="snl-dice-stage">
        <Dice value={game.die} rolling={game.phase === "rolling"} />
        {isComputerTurn && (
          <motion.span
            className="snl-thinking-bubble"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            aria-label="Clover is thinking"
          >
            <Bot size={15} aria-hidden="true" /> Thinking...
          </motion.span>
        )}
      </div>
      <p className="snl-control-instruction">
        {isComputerTurn ? "Clover is picking a number..." : "Tap the dice and see where you land."}
      </p>
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
        <p>{getFriendlyMessage()}</p>
      </div>
    </section>
  );
}
