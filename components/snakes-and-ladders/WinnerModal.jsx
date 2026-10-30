"use client";

import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

export default function WinnerModal({ winner, onPlayAgain }) {
  if (!winner) return null;

  return (
    <motion.div
      className="snl-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="presentation"
    >
      <motion.section
        className="snl-winner-modal"
        initial={{ opacity: 0, y: 22, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 23, delay: 0.1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="snl-winner-title"
      >
        <div className="snl-winner-confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <motion.i
              key={index}
              style={{ "--confetti-index": index, left: `${5 + index * 5.2}%` }}
              initial={{ y: -14, opacity: 0, rotate: 0 }}
              animate={{ y: [0, 18 + (index % 4) * 8, 5], opacity: [0, 1, 0.9], rotate: [0, 90, 180] }}
              transition={{ duration: 1.2 + (index % 4) * 0.2, delay: index * 0.035, repeat: Infinity, repeatDelay: 0.5 }}
            />
          ))}
        </div>
        <span className="snl-winner-icon"><Trophy size={29} fill="currentColor" aria-hidden="true" /></span>
        <span className="snl-section-kicker">THE SUMMIT IS YOURS</span>
        <h2 id="snl-winner-title">
          {winner.icon === "human" ? "You did it!" : "Clover wins!"}
        </h2>
        <p>
          {winner.icon === "human"
            ? "One big climb, a few close calls, and the finish line is yours."
            : "Clover made it to the top this time. Ready for a rematch?"}
        </p>
        <div className="snl-winner-score"><Sparkles size={15} aria-hidden="true" /> First to square 100</div>
        <div className="snl-winner-actions">
          <button type="button" className="snl-roll-button" onClick={onPlayAgain}>
            <RotateCcw size={16} aria-hidden="true" /> Play again
          </button>
          <Link className="snl-menu-button" href="/">
            <ArrowLeft size={15} aria-hidden="true" /> Main menu
          </Link>
        </div>
      </motion.section>
    </motion.div>
  );
}
